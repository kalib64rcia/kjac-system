"""Role-plan tests: owner/staff split, maker-checker, grants, refunds, bootstrap.

Mirrors the test_phase5 harness (migrated test DB, subject overrides, 2FA
tickets, fake mailer). Staff invites table added to the truncate list.
"""

import os
import subprocess
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

import psycopg2
import pytest
import pytest_asyncio
from fastapi import Request
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.api.v1.endpoints.staff_invites as staff_invite_endpoints
import app.models  # noqa: F401
from app.api.deps import (
    _optional_subject,
    get_current_subject,
    get_db,
)
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import create_two_fa_ticket, get_current_email
from app.main import create_app
from app.models.users import User

TEST_DB_URL = "postgresql+asyncpg://postgres:kjac-test@localhost:5433/kjac_test"
ADMIN_DSN = "dbname=postgres user=postgres password=kjac-test host=localhost port=5433"

OWNER_UUID = uuid.uuid4()
STAFF_UUID = uuid.uuid4()
STAFF2_UUID = uuid.uuid4()
NEW_UUID = uuid.uuid4()

BACKEND_DIR = Path(__file__).resolve().parent.parent
TRUNCATE_TABLES = (
    "staff_invites, technician_invites, reschedule_requests, booking_inventory_usage,"
    " inventory_movements, messages, message_threads, notifications, ratings,"
    " refunds, payments, booking_status_history, bookings,"
    " payroll_records, commission_rules, employee_info, audit_logs,"
    " user_sessions, admin_two_fa_codes, inventory_items, service_images,"
    " brand_images, services, aircon_brands, psgc_barangays,"
    " psgc_cities_municipalities, psgc_provinces, psgc_regions,"
    " system_settings, users"
)


class FakeMailer:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str, str]] = []

    def send(self, to: str, subject: str, body: str) -> bool:
        self.sent.append((to, subject, body))
        return True

    def send_staff_invite(self, to: str, link: str) -> bool:
        self.sent.append((to, "staff-invite", link))
        return True

    def send_technician_invite(self, to: str, link: str) -> bool:
        self.sent.append((to, "tech-invite", link))
        return True

    def last_link(self) -> str:
        return self.sent[-1][2]


@pytest.fixture(scope="session")
def migrated_db() -> None:
    conn = psycopg2.connect(ADMIN_DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='kjac_test'")
    if cur.fetchone() is None:
        cur.execute("CREATE DATABASE kjac_test")
    conn.close()
    env = {**os.environ,
           "DATABASE_URL": "postgresql+asyncpg://postgres:kjac-test@localhost:5433/kjac_test"}
    subprocess.run(["python", "-m", "alembic", "downgrade", "base"],
                   cwd=BACKEND_DIR, env=env, check=False,
                   capture_output=True)
    subprocess.run(["python", "-m", "alembic", "upgrade", "head"],
                   cwd=BACKEND_DIR, env=env, check=True, capture_output=True)


@pytest_asyncio.fixture
async def pg_roles(
    tmp_path, monkeypatch, migrated_db,
) -> AsyncIterator[tuple[AsyncClient, dict, AsyncSession]]:
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    try:
        limiter._storage.reset()  # type: ignore[attr-defined]
    except (AttributeError, NotImplementedError):
        pass
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {TRUNCATE_TABLES} RESTART IDENTITY CASCADE"))
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        session.add_all(
            [
                User(uuid=OWNER_UUID, first_name="Owen", last_name="Ner",
                     email="owner@example.com", phone="09170001111",
                     role="owner", status="active",
                     email_verified_at=datetime.now(UTC)),
                User(uuid=STAFF_UUID, first_name="Ana", last_name="Sis",
                     email="ana@example.com", phone="09170002222",
                     role="staff", status="active",
                     email_verified_at=datetime.now(UTC)),
                User(uuid=STAFF2_UUID, first_name="Ben", last_name="To",
                     email="ben@example.com", phone="09170003333",
                     role="staff", status="active",
                     email_verified_at=datetime.now(UTC)),
            ]
        )
        await session.commit()

        app = create_app()
        subject = {"uuid": str(OWNER_UUID), "email": "owner@example.com"}

        async def override_db() -> AsyncIterator[AsyncSession]:
            yield session

        async def override_subject() -> str:
            return subject["uuid"]

        async def override_email() -> str:
            return subject["email"]

        async def override_optional_subject(request: Request) -> str | None:
            if request.headers.get("Authorization"):
                return subject["uuid"]
            return None

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_subject] = override_subject
        app.dependency_overrides[get_current_email] = override_email
        app.dependency_overrides[_optional_subject] = override_optional_subject

        mailer = FakeMailer()
        real_mailer = staff_invite_endpoints.get_email_service
        staff_invite_endpoints.get_email_service = lambda: mailer  # type: ignore[assignment]
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                client.mailer = mailer  # type: ignore[attr-defined]
                yield client, subject, session
        finally:
            staff_invite_endpoints.get_email_service = real_mailer
    await engine.dispose()


def _owner_headers() -> dict[str, str]:
    return {"Authorization": "Bearer x",
            "X-Admin-2FA": create_two_fa_ticket(str(OWNER_UUID))}


def _staff_headers(who: uuid.UUID = STAFF_UUID) -> dict[str, str]:
    return {"Authorization": "Bearer x",
            "X-Admin-2FA": create_two_fa_ticket(str(who))}


def _as(subject: dict, email: str, uid: uuid.UUID) -> None:
    subject["uuid"] = str(uid)
    subject["email"] = email


def _token_from_link(link: str) -> str:
    return link.rsplit("token=", 1)[-1]


async def _invite_staff(
    client: AsyncClient, email: str = "newstaff@example.com",
    headers: dict[str, str] | None = None,
) -> dict:
    response = await client.post(
        "/v1/admin/staff-invites", json={"email": email},
        headers=headers or _owner_headers(),
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_staff_invite_lifecycle(
    pg_roles: tuple[AsyncClient, dict, AsyncSession],
) -> None:
    client, subject, session = pg_roles
    mailer: FakeMailer = client.mailer  # type: ignore[attr-defined]

    await _invite_staff(client)
    link = mailer.last_link()
    assert "/staff/accept?token=" in link

    accept = await client.post(
        "/v1/auth/staff/accept",
        json={
            "token": _token_from_link(link),
            "first_name": "Nina", "last_name": "Ews",
            "email": "newstaff@example.com", "phone": "09170004444",
            "position": "Dispatcher",
        },
    )
    assert accept.status_code == 201, accept.text
    assert accept.json()["status"] == "pending_approval"

    row = (await session.execute(
        select(User).where(User.email == "newstaff@example.com")
    )).scalar_one()
    assert row.role == "staff"
    assert row.position == "Dispatcher"

    # Staff cannot approve staff — owner only.
    _as(subject, "ana@example.com", STAFF_UUID)
    denied = await client.patch(
        f"/v1/admin/users/{row.id}/approval", json={"action": "approve"},
        headers=_staff_headers(),
    )
    assert denied.status_code == 403

    _as(subject, "owner@example.com", OWNER_UUID)
    approved = await client.patch(
        f"/v1/admin/users/{row.id}/approval", json={"action": "approve"},
        headers=_owner_headers(),
    )
    assert approved.json()["status"] == "active"


async def test_staff_cannot_manage_staff_invites(
    pg_roles: tuple[AsyncClient, dict, AsyncSession],
) -> None:
    client, subject, _ = pg_roles
    _as(subject, "ana@example.com", STAFF_UUID)
    for method, url in [
        ("post", "/v1/admin/staff-invites"),
        ("get", "/v1/admin/staff-invites"),
    ]:
        response = await client.request(
            method, url, json={"email": "x@example.com"} if method == "post" else None,
            headers=_staff_headers(),
        )
        assert response.status_code == 403, (method, url, response.text)


async def test_owner_locks_payroll_settings_audit(
    pg_roles: tuple[AsyncClient, dict, AsyncSession],
) -> None:
    client, subject, _ = pg_roles
    _as(subject, "ana@example.com", STAFF_UUID)
    assert (await client.get("/v1/admin/payroll", headers=_staff_headers())).status_code == 403
    assert (await client.get("/v1/admin/settings", headers=_staff_headers())).status_code == 403
    assert (await client.get("/v1/admin/audit-logs", headers=_staff_headers())).status_code == 403

    _as(subject, "owner@example.com", OWNER_UUID)
    assert (await client.get("/v1/admin/payroll", headers=_owner_headers())).status_code == 200
    assert (await client.get("/v1/admin/settings", headers=_owner_headers())).status_code == 200
    assert (await client.get("/v1/admin/audit-logs", headers=_owner_headers())).status_code == 200


async def test_grant_gates_audit_and_delegation(
    pg_roles: tuple[AsyncClient, dict, AsyncSession],
) -> None:
    client, subject, session = pg_roles
    # Owner grants audit viewing to Ana only.
    grant = await client.patch(
        "/v1/admin/users/2/role", json={"can_view_audit": True},
        headers=_owner_headers(),
    )
    assert grant.status_code == 200, grant.text
    assert grant.json()["can_view_audit"] is True

    _as(subject, "ana@example.com", STAFF_UUID)
    assert (await client.get("/v1/admin/audit-logs", headers=_staff_headers())).status_code == 200
    # Ben has no grant.
    _as(subject, "ben@example.com", STAFF2_UUID)
    assert (await client.get("/v1/admin/audit-logs", headers=_staff_headers(STAFF2_UUID))).status_code == 403
    # Grants are audit-logged (users table is trigger-audited).
    log_count = (await session.execute(
        select(func.count()).select_from(text("audit_logs")).where(
            text("table_name = 'users' AND record_id = 2")
        )
    )).scalar_one()
    assert log_count >= 1


async def test_last_owner_protection(
    pg_roles: tuple[AsyncClient, dict, AsyncSession],
) -> None:
    client, _subject, _ = pg_roles
    # Only one owner exists: suspend + demote both rejected.
    assert (await client.patch(
        "/v1/admin/users/1/status", json={"status": "suspended"},
        headers=_owner_headers())).status_code == 403
    assert (await client.patch(
        "/v1/admin/users/1/role", json={"role": "staff"},
        headers=_owner_headers())).status_code == 403
    # Promote Ana to co-owner, then demote Owen is allowed.
    assert (await client.patch(
        "/v1/admin/users/2/role", json={"role": "owner"},
        headers=_owner_headers())).status_code == 200
    assert (await client.patch(
        "/v1/admin/users/1/role", json={"role": "staff"},
        headers=_owner_headers())).status_code == 200


async def test_refund_propose_review_chain(
    pg_roles: tuple[AsyncClient, dict, AsyncSession],
) -> None:
    from datetime import date as date_cls
    from datetime import time as time_cls

    from app.models.bookings import Booking
    from app.models.catalog import AirconBrand, Service
    from app.models.financial import Payment

    client, subject, session = pg_roles
    session.add_all([
        Service(name="Cleaning", slug="cleaning", description="c",
                base_price=1500, down_payment_amount=500,
                down_payment_type="fixed", estimated_duration_minutes=90,
                is_active=True),
        AirconBrand(name="Daikin", slug="daikin", is_active=True),
    ])
    await session.flush()
    session.add(Booking(
        reference_id="KJAC-2026-000001", customer_id=None,
        service_id=1, brand_id=1,
        customer_first_name="Gus", customer_last_name="Est",
        customer_email="gus@example.com", customer_phone="09170005555",
        street_address="123 Main St", landmark="Near park",
        preferred_date=date_cls(2026, 10, 5), preferred_time=time_cls(10, 0),
        down_payment_amount=500,
    ))
    await session.flush()
    session.add(Payment(booking_id=1, payment_type="down_payment", amount=500,
                        payment_method="gcash", status="verified"))
    await session.commit()

    _as(subject, "ana@example.com", STAFF_UUID)
    proposed = await client.post(
        "/v1/admin/refunds",
        json={"booking_id": 1, "payment_id": 1, "refund_amount": 250.00,
              "reason": "Duplicate charge"},
        headers=_staff_headers(),
    )
    assert proposed.status_code == 201, proposed.text
    refund_id = proposed.json()["id"]
    assert proposed.json()["status"] == "proposed"

    # Proposer without grant cannot review.
    denied = await client.post(
        f"/v1/admin/refunds/{refund_id}/review", json={"action": "approve"},
        headers=_staff_headers(),
    )
    assert denied.status_code == 403

    # Owner approves; second review is a conflict.
    _as(subject, "owner@example.com", OWNER_UUID)
    approved = await client.post(
        f"/v1/admin/refunds/{refund_id}/review",
        json={"action": "approve", "admin_notes": "Verified duplicate."},
        headers=_owner_headers(),
    )
    assert approved.json()["status"] == "approved"
    again = await client.post(
        f"/v1/admin/refunds/{refund_id}/review", json={"action": "deny",
                                                       "denial_reason": "x"},
        headers=_owner_headers(),
    )
    assert again.status_code == 409


async def test_bootstrap_owner(
    pg_roles: tuple[AsyncClient, dict, AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, subject, session = pg_roles
    # Empty the office: no owners, no staff.
    await session.execute(text("TRUNCATE users RESTART IDENTITY CASCADE"))
    await session.commit()

    async def sync_as(email: str, uid: uuid.UUID) -> dict:
        _as(subject, email, uid)
        response = await client.post(
            "/v1/auth/sync",
            json={"first_name": "First", "last_name": "Last", "phone": "09170009999"},
            headers={"Authorization": "Bearer x"},
        )
        assert response.status_code == 200, response.text
        return response.json()

    monkeypatch.setattr(settings, "bootstrap_owner_email", "boss@example.com")
    first = await sync_as("boss@example.com", uuid.uuid4())
    assert first["role"] == "owner"
    second = await sync_as("boss@example.com", uuid.uuid4())
    assert second["role"] == "owner"  # linked, seat already taken by self
    third = await sync_as("other@example.com", uuid.uuid4())
    assert third["role"] == "customer"  # seat closed after first owner


async def test_me_carries_grants_and_position(
    pg_roles: tuple[AsyncClient, dict, AsyncSession],
) -> None:
    client, subject, _ = pg_roles
    await client.patch(
        "/v1/admin/users/2/role",
        json={"position": "Dispatcher", "can_execute_refunds": True},
        headers=_owner_headers(),
    )
    _as(subject, "ana@example.com", STAFF_UUID)
    me = await client.get("/v1/auth/me", headers={"Authorization": "Bearer x"})
    body = me.json()
    assert body["position"] == "Dispatcher"
    assert body["can_execute_refunds"] is True
    assert body["can_approve_technicians"] is False
