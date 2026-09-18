"""Audit log viewer: owner reads; delegated staff with can_view_audit read.

Rows are trigger-written and immutable (no write endpoints exist by design).
Everything here is reads-only: list (paged), summary counts, CSV export.
"""

import io
from datetime import date, datetime, timedelta
from typing import Annotated, Any, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_, false, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbDep, grants
from app.core.rate_limit import limiter
from app.models.bookings import Booking
from app.models.catalog import Service
from app.models.inventory import InventoryItem
from app.models.system import AuditLog
from app.models.users import User
from app.utils.time_rules import format_manila_date, format_manila_time, plain_value

router = APIRouter(tags=["audit"])

MANILA = ZoneInfo("Asia/Manila")
EXPORT_MAX_ROWS = 5000

MODULE_LABELS = {
    "users": "People",
    "bookings": "Bookings",
    "payments": "Payments",
    "refunds": "Refunds",
    "inventory_items": "Stock",
    "payroll_records": "Payroll",
}

ACTION_LABELS = {
    "INSERT": "Added",
    "UPDATE": "Changed",
    "DELETE": "Removed",
    "RESTORE": "Restored",
}

# Database column → owner's words. Unknown columns fall back to spaces.
_GRANT_LABELS = {
    "can_approve_technicians": "permission to approve technicians",
    "can_execute_refunds": "permission to process refunds",
    "can_view_audit": "permission to view audit logs",
}
FIELD_LABELS = {
    **_GRANT_LABELS,
    "technician_id": "technician",
    "preferred_date": "service date",
    "preferred_time": "service time",
    "cancellation_reason": "cancellation reason",
    "customer_first_name": "first name",
    "customer_last_name": "last name",
    "customer_email": "email",
    "customer_phone": "phone",
    "gcash_reference_number": "GCash reference",
    "gcash_receipt_url": "receipt photo",
    "down_payment_amount": "down payment",
    "total_service_cost": "total cost",
    "verified_by_user_id": "verified by",
    "rejection_reason": "rejection reason",
    "refund_amount": "refund amount",
    "requested_by_user_id": "requested by",
    "denial_reason": "denial reason",
    "employee_user_id": "employee",
    "period_start_date": "period start",
    "period_end_date": "period end",
    "minimum_stock_level": "low-stock level",
    "unit_cost": "unit cost",
    "first_name": "first name",
    "last_name": "last name",
    "expires_at": "pay-by deadline",
}


def _field_label(table: str, field: str) -> str:
    if field == "status":
        return {
            "users": "account status",
            "bookings": "booking status",
            "payments": "payment status",
            "refunds": "refund status",
        }.get(table, "status")
    if field == "role" and table == "users":
        return "system role"
    return FIELD_LABELS.get(field, field.replace("_", " "))


class ChangePair(BaseModel):
    field: str
    label: str
    before: str
    after: str


class BookingDigest(BaseModel):
    reference: str
    customer: str
    phone: str = ""
    service: str = ""
    schedule: str = ""
    status: str = ""
    technician: str = ""


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    table_name: str
    record_id: int
    action: str
    old_data: dict[str, Any] | None = None
    new_data: dict[str, Any] | None = None
    changed_fields: list[str] | None = None
    ip_address: str | None = None
    request_id: str | None = None
    created_at: datetime
    actor_name: str | None = None
    actor_role: str | None = None
    subject_label: str | None = None
    summary: str = ""
    action_label: str = ""
    module_label: str = ""
    changes: list[ChangePair] = []
    booking: BookingDigest | None = None


class AuditLogListResponse(BaseModel):
    total: int
    items: list[AuditLogOut]
    summary: dict[str, int] = {}


def _person(first: Any, last: Any, fallback: str) -> str:
    name = f"{first or ''} {last or ''}".strip()
    return name or fallback


def _peso(value: Any) -> str:
    try:
        return f"₱{float(value):,.2f}"
    except (TypeError, ValueError):
        return "₱0.00"


def _changed(old: dict[str, Any] | None, new: dict[str, Any] | None) -> list[str]:
    old, new = old or {}, new or {}
    return sorted(
        k for k in set(old) | set(new)
        if k != "updated_at" and old.get(k) != new.get(k)
    )


async def _enrich(db: AsyncSession, rows: list[AuditLog]) -> list[AuditLogOut]:
    """Batched names + one plain sentence per row (single round of lookups)."""
    user_ids: set[int] = set()
    booking_ids: set[int] = set()
    for r in rows:
        if r.user_id is not None:
            user_ids.add(r.user_id)
        data = r.new_data or r.old_data or {}
        if r.table_name == "bookings" and isinstance(data.get("technician_id"), int):
            user_ids.add(data["technician_id"])
        if r.table_name == "users":
            user_ids.add(r.record_id)
        for key in ("booking_id",):
            if isinstance(data.get(key), int):
                booking_ids.add(data[key])
        if r.table_name == "bookings":
            booking_ids.add(r.record_id)

    names: dict[int, str] = {}
    roles: dict[int, str] = {}
    if user_ids:
        for u in (
            await db.execute(
                select(User.id, User.first_name, User.last_name, User.role).where(
                    User.id.in_(user_ids)
                )
            )
        ).all():
            names[u.id] = _person(u.first_name, u.last_name, f"user #{u.id}")
            roles[u.id] = u.role or ""

    refs: dict[int, str] = {}
    customers: dict[int, str] = {}
    if booking_ids:
        for b in (
            await db.execute(
                select(
                    Booking.id, Booking.reference_id,
                    Booking.customer_first_name, Booking.customer_last_name,
                ).where(Booking.id.in_(booking_ids))
            )
        ).all():
            refs[b.id] = b.reference_id or f"booking #{b.id}"
            customers[b.id] = _person(
                b.customer_first_name, b.customer_last_name, f"booking #{b.id}"
            )

    items: dict[int, str] = {}
    item_rows = [r.record_id for r in rows if r.table_name == "inventory_items"]
    if item_rows:
        for it in (
            await db.execute(
                select(InventoryItem.id, InventoryItem.name).where(
                    InventoryItem.id.in_(set(item_rows))
                )
            )
        ).all():
            items[it.id] = it.name or f"item #{it.id}"

    services: dict[int, str] = {}
    service_ids = {
        data["service_id"]
        for r in rows if r.table_name == "bookings"
        for data in (r.new_data or r.old_data or {},)
        if isinstance(data.get("service_id"), int)
    }
    if service_ids:
        for s in (
            await db.execute(
                select(Service.id, Service.name).where(Service.id.in_(service_ids))
            )
        ).all():
            services[s.id] = s.name or f"service #{s.id}"

    out: list[AuditLogOut] = []
    for r in rows:
        actor = names.get(r.user_id, "System") if r.user_id is not None else "System"
        old, new = r.old_data or {}, r.new_data or {}
        changed = r.changed_fields or _changed(r.old_data, r.new_data)
        module = MODULE_LABELS.get(r.table_name, r.table_name.replace("_", " "))
        verb = ACTION_LABELS.get(r.action, r.action)
        label: str | None = None
        sentence: str
        if r.table_name == "bookings":
            label = refs.get(r.record_id, f"booking #{r.record_id}")
            who = customers.get(r.record_id, label)
            if r.action == "INSERT":
                verb = "Opened booking"
                sentence = f"{actor} opened {label} for {who}"
            elif "technician_id" in changed:
                tech_id = new.get("technician_id")
                tech = names.get(tech_id, "a technician") if isinstance(tech_id, int) else None
                verb = "Assigned technician" if tech else "Unassigned technician"
                sentence = (
                    f"{actor} assigned {tech} to {label}"
                    if tech else f"{actor} unassigned the technician from {label}"
                )
            elif new.get("status") == "cancelled":
                verb = "Cancelled booking"
                reason = new.get("cancellation_reason") or "no reason given"
                sentence = f"{actor} cancelled {label} ({reason})"
            elif "status" in changed:
                verb = "Changed booking status"
                sentence = f"{actor} moved {label} to {plain_value(new.get('status'))}"
            elif "preferred_date" in changed or "preferred_time" in changed:
                verb = "Rescheduled booking"
                sentence = (
                    f"{actor} rescheduled {label} to "
                    f"{format_manila_date(new.get('preferred_date'))} "
                    f"{format_manila_time(new.get('preferred_time'))}".strip()
                )
            elif r.action == "DELETE":
                sentence = f"{actor} removed {label}"
            else:
                sentence = f"{actor} updated {label} ({_human_fields(r.table_name, changed)})"
        elif r.table_name == "payments":
            data = new or old
            ref = refs.get(data.get("booking_id", -1), "a booking")
            label = f"{_peso(data.get('amount'))} for {ref}"
            if new.get("status") == "verified":
                verb = "Verified payment"
                sentence = f"{actor} verified {label}"
            elif new.get("status") == "rejected":
                verb = "Rejected payment"
                sentence = f"{actor} rejected {label} ({data.get('rejection_reason') or 'no reason given'})"
            elif r.action == "INSERT":
                verb = "Uploaded receipt"
                sentence = f"Payment receipt uploaded: {label}"
            else:
                sentence = f"{actor} updated payment {label}"
        elif r.table_name == "refunds":
            data = new or old
            ref = refs.get(data.get("booking_id", -1), "a booking")
            label = f"{_peso(data.get('refund_amount'))} for {ref}"
            status = (new or old).get("status", "")
            if r.action == "INSERT":
                verb = "Recorded refund"
                sentence = f"{actor} recorded a refund of {label} ({status})"
            else:
                verb = "Reviewed refund"
                sentence = f"{actor} set refund {label} to {status}"
        elif r.table_name == "users":
            label = names.get(r.record_id, f"user #{r.record_id}")
            role = roles.get(r.record_id, "")
            grant_keys = [k for k in changed if k in _GRANT_LABELS]
            if new.get("status") == "active" and old.get("status") != "active":
                verb = "Approved account"
                sentence = f"{actor} approved {label}'s {role or 'staff'} account"
            elif r.action == "INSERT":
                verb = "Added person"
                sentence = f"{actor} added {label} ({role or 'user'})"
            elif grant_keys and set(changed) <= set(_GRANT_LABELS):
                verb = "Changed permissions"
                bits = []
                for k in grant_keys:
                    bits.append(
                        f"gave {label} {_GRANT_LABELS[k]}"
                        if new.get(k) else f"removed {_GRANT_LABELS[k]} from {label}"
                    )
                sentence = f"{actor} " + "; ".join(bits)
            else:
                sentence = f"{actor} updated {label} ({_human_fields(r.table_name, changed)})"
        elif r.table_name == "inventory_items":
            label = items.get(r.record_id, f"item #{r.record_id}")
            if "quantity" in changed:
                verb = "Updated stock"
                sentence = (
                    f"{actor} set {label} stock "
                    f"{plain_value(old.get('quantity'))} → {plain_value(new.get('quantity'))}"
                )
            elif r.action == "INSERT":
                verb = "Added stock item"
                sentence = f"{actor} added {label} to inventory"
            else:
                sentence = f"{actor} updated {label} ({_human_fields(r.table_name, changed)})"
        elif r.table_name == "payroll_records":
            data = new or old
            emp = names.get(data.get("employee_user_id", -1), "an employee")
            label = f"payroll for {emp} ({format_manila_date(data.get('period_start_date'))} → {format_manila_date(data.get('period_end_date'))})"
            verb = "Processed payroll" if r.action == "INSERT" else verb
            sentence = f"{actor} processed {label}" if r.action == "INSERT" else f"{actor} updated {label}"
        else:
            sentence = f"{actor} {r.action.lower()}d {r.table_name} #{r.record_id}"
        pairs = [
            ChangePair(
                field=k,
                label=_field_label(r.table_name, k),
                before=plain_value(old.get(k)),
                after=plain_value(new.get(k)),
            )
            for k in changed
        ]
        digest: BookingDigest | None = None
        if r.table_name == "bookings":
            snap = new or old
            tech_id = snap.get("technician_id")
            service_id = snap.get("service_id")
            sched_parts = [
                p for p in (
                    format_manila_date(snap.get("preferred_date")),
                    format_manila_time(snap.get("preferred_time")),
                )
                if p
            ]
            digest = BookingDigest(
                reference=refs.get(r.record_id, f"booking #{r.record_id}"),
                customer=customers.get(r.record_id, label or ""),
                phone=str(snap.get("customer_phone") or ""),
                service=services.get(service_id, "") if isinstance(service_id, int) else "",
                schedule=" ".join(sched_parts),
                status=str(snap.get("status") or ""),
                technician=names.get(tech_id, "") if isinstance(tech_id, int) else "",
            )
        out.append(
            AuditLogOut.model_validate(r).model_copy(
                update={
                    "actor_name": names.get(r.user_id) if r.user_id is not None else None,
                    "actor_role": roles.get(r.user_id) if r.user_id is not None else None,
                    "subject_label": label,
                    "summary": sentence,
                    "action_label": verb,
                    "module_label": module,
                    "changes": pairs,
                    "booking": digest,
                }
            )
        )
    return out


def _human_fields(table: str, changed: list[str]) -> str:
    if not changed:
        return "details"
    return ", ".join(_field_label(table, k) for k in changed)


@router.get("/admin/audit-logs", response_model=AuditLogListResponse)
@limiter.limit("300/minute")
async def list_audit_logs(
    request: Request,
    db: DbDep,
    _viewer: Annotated[User, Depends(grants("can_view_audit"))],
    table_name: str | None = Query(default=None, max_length=50),
    action: str | None = Query(default=None, max_length=10),
    user_id: int | None = Query(default=None, ge=1),
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    sort_dir: Annotated[Literal["asc", "desc"], Query()] = "desc",
    search: Annotated[str | None, Query(max_length=100)] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> AuditLogListResponse:
    # grants(): owners always pass; staff need can_view_audit.
    query = _filtered(
        table_name, action, user_id, date_from, date_to,
        await _resolve_search(db, search),
    )
    total = (
        await db.execute(select(func.count()).select_from(query.subquery()))
    ).scalar_one()
    ordering = AuditLog.id.desc() if sort_dir != "asc" else AuditLog.id.asc()
    rows = (
        await db.execute(
            query.order_by(ordering)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).scalars()
    rows = list(rows)
    return AuditLogListResponse(
        total=total,
        items=await _enrich(db, rows),
        summary=await _counts(db),
    )


def _filtered(
    table_name: str | None,
    action: str | None,
    user_id: int | None,
    date_from: date | None,
    date_to: date | None,
    search_extra=None,
):
    query = select(AuditLog)
    if table_name:
        query = query.where(AuditLog.table_name == table_name)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if date_from:
        query = query.where(func.date(AuditLog.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(AuditLog.created_at) <= date_to)
    if search_extra is not None:
        query = query.where(search_extra)
    return query


async def _resolve_search(db: AsyncSession, raw: str | None):
    """Smart search with documented scope: people names, booking references,
    record IDs, request IDs. Sentence words are NOT matched (summaries are
    computed at read time, not stored). Returns a WHERE clause or None."""
    q = (raw or "").strip()
    if not q:
        return None
    like = f"%{q}%"
    ors = []
    name_match = or_(
        (User.first_name + " " + User.last_name).ilike(like),
        User.email.ilike(like),
        *[c for t in q.split() for c in (
            User.first_name.ilike(f"%{t}%"), User.last_name.ilike(f"%{t}%"),
        )],
    )
    user_ids = list(
        (await db.execute(select(User.id).where(name_match))).scalars()
    )
    if user_ids:
        ors.append(AuditLog.user_id.in_(user_ids))
        ors.append(
            and_(AuditLog.table_name == "users", AuditLog.record_id.in_(user_ids))
        )
    booking_ids = list(
        (
            await db.execute(
                select(Booking.id).where(Booking.reference_id.ilike(like))
            )
        ).scalars()
    )
    if booking_ids:
        refs = [str(i) for i in booking_ids]
        ors.append(
            and_(AuditLog.table_name == "bookings", AuditLog.record_id.in_(booking_ids))
        )
        ors.append(
            and_(
                AuditLog.table_name.in_(("payments", "refunds")),
                or_(
                    AuditLog.new_data["booking_id"].astext.in_(refs),
                    AuditLog.old_data["booking_id"].astext.in_(refs),
                ),
            )
        )
    if q.isdigit():
        ors.append(AuditLog.record_id == int(q))
        ors.append(AuditLog.request_id.ilike(like))
    # Non-empty but unmatched: match nothing (never the whole trail).
    return or_(*ors) if ors else false()


async def _counts(db: AsyncSession) -> dict[str, int]:
    """Whole-trail totals (never filtered — the cards are the overall view)."""
    now_manila = datetime.now(MANILA).date()
    total = (
        await db.execute(select(func.count()).select_from(select(AuditLog).subquery()))
    ).scalar_one()
    day = _filtered(None, None, None, now_manila, None)
    today = (
        await db.execute(select(func.count()).select_from(day.subquery()))
    ).scalar_one()
    week_ago = _filtered(None, None, None, now_manila - timedelta(days=6), None)
    week = (
        await db.execute(select(func.count()).select_from(week_ago.subquery()))
    ).scalar_one()
    return {"total": total, "today": today, "week": week}


@router.get("/admin/audit-logs/export-xlsx")
@limiter.limit("30/minute")
async def export_audit_logs(
    request: Request,
    db: DbDep,
    _viewer: Annotated[User, Depends(grants("can_view_audit"))],
    table_name: str | None = Query(default=None, max_length=50),
    action: str | None = Query(default=None, max_length=10),
    user_id: int | None = Query(default=None, ge=1),
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    sort_dir: Annotated[Literal["asc", "desc"], Query()] = "desc",
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> StreamingResponse:
    """Excel download honoring the active filters (capped)."""
    query = _filtered(
        table_name, action, user_id, date_from, date_to,
        await _resolve_search(db, search),
    )
    ordering = AuditLog.id.desc() if sort_dir != "asc" else AuditLog.id.asc()
    rows = list(
        (
            await db.execute(
                query.order_by(ordering).limit(EXPORT_MAX_ROWS)
            )
        ).scalars()
    )
    items = await _enrich(db, rows)
    wb = Workbook()
    ws = wb.active
    ws.title = "Audit logs"
    headers = ["ID", "When", "Author", "Role", "Action", "Area", "Subject", "What happened", "Changes"]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
    ws.freeze_panes = "A2"
    for it in items:
        ws.append(
            [
                it.id,
                it.created_at.isoformat(),
                it.actor_name or "System",
                (it.actor_role or "").capitalize(),
                it.action_label or it.action,
                it.module_label or it.table_name,
                it.subject_label or "",
                it.summary,
                "; ".join(f"{c.label}: {c.before} → {c.after}" for c in it.changes),
            ]
        )
    for column, width in zip("ABCDEFGHI", (8, 24, 20, 12, 24, 14, 32, 60, 60)):
        ws.column_dimensions[column].width = width
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=audit-logs.xlsx"},
    )
