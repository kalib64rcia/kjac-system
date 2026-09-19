"""Phase 3 tests: booking lifecycle, payments, dispatch, reschedule, expiry, PSGC.

Needs local Postgres (docker kjac-pg-test on :5433). Upstream psgc.cloud is
hit live once (regions test); everything else is local.
"""

import io
import re
import subprocess
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import psycopg2
import pytest
import pytest_asyncio
from fastapi import Request
from httpx import ASGITransport, AsyncClient
from PIL import Image
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.api.deps import _optional_subject, get_current_subject, get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import create_two_fa_ticket
from app.main import create_app
from app.models.bookings import Booking
from app.models.catalog import AirconBrand, Service
from app.models.psgc import PsgcRegion
from app.models.users import User
from app.utils.time_rules import MANILA_TZ

TEST_DB_URL = "postgresql+asyncpg://postgres:kjac-test@localhost:5433/kjac_test"
ADMIN_DSN = "dbname=postgres user=postgres password=kjac-test host=localhost port=5433"

ADMIN_UUID = uuid.uuid4()
TECH_UUID = uuid.uuid4()
CUSTOMER_UUID = uuid.uuid4()

GUEST = {
    "customer_first_name": "Gina",
    "customer_last_name": "Uy",
    "customer_email": "gina.phase3@example.com",
    "customer_phone": "09170009999",
    "region_code": "0400000000",
    "province_code": "0403400000",
    "city_municipality_code": "0403415000",
    "barangay_code": "0403415001",
    "street_address": "123 Narra St",
    "landmark": "Near church",
    "service_id": 1,
    "brand_id": 1,
}


def _png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (100, 100), (255, 0, 0)).save(buffer, format="PNG")
    return buffer.getvalue()


def _future(days: int, slot: str = "10:00") -> tuple[str, str]:
    day = datetime.now(MANILA_TZ).date() + timedelta(days=days)
    if day.weekday() == 6:  # keep tests off Sundays
        day += timedelta(days=1)
    return day.isoformat(), slot


TRUNCATE_TABLES = (
    "reschedule_requests, booking_inventory_usage,"
    " inventory_movements, messages, message_threads, notifications, ratings,"
    " window_closures, booking_crew_members,"
    " refunds, payments, booking_status_history, bookings,"
    " payroll_records, commission_rules, employee_info, audit_logs,"
    " user_sessions, admin_two_fa_codes, inventory_items, service_images,"
    " brand_images, services, aircon_brands, psgc_barangays,"
    " psgc_cities_municipalities, psgc_provinces, psgc_regions,"
    " system_settings, users"
)

BACKEND_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def migrated_db() -> None:
    """Apply the real Alembic chain once (triggers + RLS included)."""
    conn = psycopg2.connect(ADMIN_DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='kjac_test'")
    if cur.fetchone() is None:
        cur.execute("CREATE DATABASE kjac_test")
    conn.close()
    import os

    env = {**os.environ,
           "DATABASE_URL": "postgresql+asyncpg://postgres:kjac-test@localhost:5433/kjac_test"}
    subprocess.run(["python", "-m", "alembic", "downgrade", "base"],
                   cwd=BACKEND_DIR, env=env, check=False,
                   capture_output=True)
    subprocess.run(["python", "-m", "alembic", "upgrade", "head"],
                   cwd=BACKEND_DIR, env=env, check=True, capture_output=True)


@pytest_asyncio.fixture
async def pg_client(
    tmp_path, monkeypatch, migrated_db
) -> AsyncIterator[tuple[AsyncClient, dict, AsyncSession]]:
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    monkeypatch.setattr(settings, "storage_backend", "local")
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
                User(
                    uuid=ADMIN_UUID, first_name="Ada", last_name="Min",
                    email="ada@example.com", phone="09170001111",
                    role="owner", status="active",
                    email_verified_at=datetime.now(UTC),
                ),
                User(
                    uuid=TECH_UUID, first_name="Ben", last_name="Tan",
                    email="ben@example.com", phone="09179876543",
                    role="technician", status="active",
                    email_verified_at=datetime.now(UTC),
                ),
                User(
                    uuid=CUSTOMER_UUID, first_name="Cid", last_name="Cus",
                    email="cid@example.com", phone="09170002222",
                    role="customer", status="active",
                    region_code="04", province_code="0434",
                    city_municipality_code="043415", barangay_code="043415001",
                    street_address="99 Mango St",
                    email_verified_at=datetime.now(UTC),
                ),
                Service(
                    name="General Cleaning", slug="general-cleaning",
                    description="clean", base_price=1500,
                    down_payment_amount=500, down_payment_type="fixed",
                    estimated_duration_minutes=90, is_active=True,
                ),
                AirconBrand(name="Daikin", slug="daikin", is_active=True),
            ]
        )
        await session.commit()

        app = create_app()
        subject = {"value": str(CUSTOMER_UUID)}

        async def override_db() -> AsyncIterator[AsyncSession]:
            yield session

        async def override_subject() -> str:
            return subject["value"]

        async def override_optional_subject(request: Request) -> str | None:
            if request.headers.get("Authorization"):
                return subject["value"]
            return None

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_subject] = override_subject
        app.dependency_overrides[_optional_subject] = override_optional_subject
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield client, subject, session

    await engine.dispose()


def _admin_headers() -> dict[str, str]:
    return {
        "Authorization": "Bearer admin-token",
        "X-Admin-2FA": create_two_fa_ticket(str(ADMIN_UUID)),
    }


def _customer_headers() -> dict[str, str]:
    return {"Authorization": "Bearer customer-token"}


def _payload(**overrides) -> dict:
    day, slot = _future(2)
    base = {**GUEST, "preferred_date": day, "preferred_time": slot}
    base.update(overrides)
    return base


async def _create(client: AsyncClient, headers: dict | None = None, **overrides) -> dict:
    response = await client.post("/v1/bookings", json=_payload(**overrides), headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


async def _propose(
    client: AsyncClient, subject: dict, booking: dict, slot: str | None = None,
) -> dict:
    """Admin proposes the booking's own slot (30-min duration keeps tests
    overlap-free). Temporarily acts as admin, then restores the subject."""
    prev = subject["value"]
    subject["value"] = str(ADMIN_UUID)
    try:
        response = await client.post(
            f"/v1/bookings/{booking['id']}/schedule",
            json={
                "preferred_date": booking["preferred_date"],
                "preferred_time": slot or booking["preferred_time"] or "08:00",
                "duration_minutes": 30,
            },
            headers=_admin_headers(),
        )
    finally:
        subject["value"] = prev
    assert response.status_code == 201, response.text
    return response.json()


async def _upload(
    client: AsyncClient, subject: dict, booking: dict, email: str,
    amount: float = 500.0, headers: dict | None = None,
    gcash_ref: str | None = None, slot: str | None = None,
) -> dict:
    """Propose-first upload: admin proposes the slot, then the guest uploads
    the receipt (schedule-before-payment flow)."""
    await _propose(client, subject, booking, slot)
    booking_ref = booking["reference_id"]
    response = await client.post(
        f"/v1/bookings/{booking_ref}/payment",
        files={"file": ("receipt.png", _png(), "image/png")},
        data={
            "gcash_reference_number": gcash_ref or f"GC-{booking_ref}-REF",
            "amount": str(amount),
            "payment_method": "gcash",
            "email": email,
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _confirm(
    client: AsyncClient, subject: dict, booking: dict, email: str
) -> None:
    """Propose, upload as guest, verify as admin, assign tech. Returns confirmed booking."""
    subject["value"] = str(ADMIN_UUID)
    payment = await _upload(client, subject, booking, email)
    verify = await client.patch(
        f"/v1/admin/payments/{payment['id']}/verify",
        json={"action": "approve"}, headers=_admin_headers(),
    )
    assert verify.status_code == 200, verify.text
    assign = await client.patch(
        f"/v1/admin/bookings/{verify.json()['booking_id']}/assign",
        json={"technician_id": 2}, headers=_admin_headers(),
    )
    assert assign.status_code == 200, assign.text


async def test_guest_create_ok(pg_client: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, _, _ = pg_client
    booking = await _create(client)
    assert re.fullmatch(r"KJAC-\d{4}-[A-Z0-9]{6}", booking["reference_id"])
    assert booking["status"] == "submitted"
    assert booking["down_payment_amount"] == 500.0
    assert booking["total_service_cost"] == 1500.0
    assert booking["expires_at"] is not None


async def test_create_rejects_bad_phone(pg_client: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, _, _ = pg_client
    response = await client.post(
        "/v1/bookings", json=_payload(customer_phone="12345", customer_email="p1@example.com")
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VAL_001"


async def test_create_rejects_sunday(pg_client: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, _, _ = pg_client
    today = datetime.now(MANILA_TZ).date()
    days_until_sunday = (6 - today.weekday()) % 7 or 7
    sunday = (today + timedelta(days=days_until_sunday)).isoformat()
    response = await client.post(
        "/v1/bookings",
        json=_payload(preferred_date=sunday, customer_email="sun@example.com"),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VAL_002"


async def test_create_rate_limited(pg_client: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, _, _ = pg_client
    # Distinct slots: one tech means one public seat per slot (capacity guard).
    for i, slot in enumerate(["08:00", "09:00", "10:00"]):
        response = await client.post(
            "/v1/bookings",
            json=_payload(customer_email="rl@example.com", preferred_time=slot),
        )
        assert response.status_code == 201, response.text
    fourth = await client.post("/v1/bookings", json=_payload(customer_email="rl@example.com", preferred_time="11:00"))
    assert fourth.status_code == 429
    assert fourth.json()["error"]["code"] == "BOOKING_004"


async def test_track_masks_pii(pg_client: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, _, _ = pg_client
    booking = await _create(client, customer_email="track@example.com")
    response = await client.get(
        f"/v1/bookings/track/{booking['reference_id']}",
        params={"email": "track@example.com"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["masked_phone"] == "0917***9999"
    assert "street_address" not in body
    assert "customer_phone" not in body
    assert isinstance(body["timeline"], list)
    assert body["booking_id"] == booking["id"]

    wrong = await client.get(
        f"/v1/bookings/track/{booking['reference_id']}", params={"email": "nope@example.com"}
    )
    assert wrong.status_code == 404


async def test_payment_amount_must_match_down(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="amt@example.com")
    await _propose(client, subject, booking)
    response = await client.post(
        f"/v1/bookings/{booking['reference_id']}/payment",
        files={"file": ("receipt.png", _png(), "image/png")},
        data={"gcash_reference_number": "GC-X", "amount": "100.00",
              "payment_method": "gcash", "email": "amt@example.com"},
    )
    assert response.status_code == 400
    assert "down payment" in response.json()["error"]["message"]


async def test_cancel_immediate_full_refund(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="cx@example.com")
    payment = await _upload(client, subject, booking, "cx@example.com")
    prev = subject["value"]
    subject["value"] = str(ADMIN_UUID)
    try:
        verify = await client.patch(
            f"/v1/admin/payments/{payment['id']}/verify",
            json={"action": "approve"}, headers=_admin_headers(),
        )
    finally:
        subject["value"] = prev
    assert verify.status_code == 200, verify.text
    response = await client.post(
        f"/v1/bookings/{booking['id']}/cancel",
        json={"reason": "Changed my mind", "email": "cx@example.com",
              "refund_to_number": "09123456789", "refund_to_name": "CX Test"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "cancelled"
    assert body["refund_status"] == "approved"
    assert body["refund_amount"] == 500.0


async def test_cancel_while_under_review_answers_409(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """No verdict, no cancel: pending payment blocks cancel on either path."""
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="lock@example.com")
    await _upload(client, subject, booking, "lock@example.com")
    response = await client.post(
        f"/v1/bookings/{booking['id']}/cancel",
        json={"reason": "Too soon", "email": "lock@example.com",
              "refund_to_number": "09123456789", "refund_to_name": "Lock Test"},
    )
    assert response.status_code == 409
    assert "under review" in response.json()["error"]["message"]


async def test_cancel_same_day_needs_approval(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg_client
    booking = await _create(client, customer_email="sd@example.com")
    await _confirm(client, subject, booking, "sd@example.com")
    stored = await session.get(Booking, booking["id"])
    assert stored is not None
    stored.preferred_date = datetime.now(MANILA_TZ).date()
    await session.commit()
    session.expire_all()
    response = await client.post(
        f"/v1/bookings/{booking['id']}/cancel",
        json={"reason": "Emergency", "email": "sd@example.com",
              "refund_to_number": "09123456789", "refund_to_name": "SD Test"},
    )
    assert response.status_code == 200
    assert response.json()["refund_status"] == "processing"


async def test_cancel_late_denied(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="late@example.com")
    await _confirm(client, subject, booking, "late@example.com")
    subject["value"] = str(TECH_UUID)
    tech_headers = {"Authorization": "Bearer tech-token"}
    en_route = await client.patch(
        f"/v1/technician/jobs/{booking['id']}/status",
        json={"status": "on_the_way"}, headers=tech_headers,
    )
    assert en_route.status_code == 200
    response = await client.post(
        f"/v1/bookings/{booking['id']}/cancel",
        json={"reason": "Too late", "email": "late@example.com",
              "refund_to_number": "09123456789", "refund_to_name": "Late Test"},
    )
    assert response.status_code == 200
    assert response.json()["refund_status"] == "denied"


async def test_tech_progression(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="tech@example.com")
    await _confirm(client, subject, booking, "tech@example.com")
    subject["value"] = str(TECH_UUID)
    tech_headers = {"Authorization": "Bearer tech-token"}

    skip = await client.patch(
        f"/v1/technician/jobs/{booking['id']}/status",
        json={"status": "arrived"}, headers=tech_headers,
    )
    assert skip.status_code == 409

    states = []
    for marker in ("on_the_way", "arrived", "ongoing", "completed"):
        response = await client.patch(
            f"/v1/technician/jobs/{booking['id']}/status",
            json={"status": marker}, headers=tech_headers,
        )
        assert response.status_code == 200, response.text
        states.append(response.json()["status"])
    assert states == ["assigned", "assigned", "ongoing", "completed"]


async def test_assign_capacity_guard(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """No per-tech cap (ADR-3): manual Close is the gate, not the tech's
    day-set. Assign flips CONFIRMED to ASSIGNED and records the crew;
    only oversized crews (7+) are refused."""
    from app.models.bookings import BookingCrewMember

    client, subject, session = pg_client
    day, _ = _future(5)
    ids = []
    # Distinct slots, same day: all four assign cleanly to one tech now.
    for i, slot in enumerate(["08:00", "09:00", "10:00", "11:00"]):
        booking = await _create(client, customer_email=f"cap{i}@example.com",
                                preferred_date=day, preferred_time=slot)
        await _upload(client, subject, booking, f"cap{i}@example.com")
        ids.append(booking["id"])
    subject["value"] = str(ADMIN_UUID)
    for booking_id in ids:
        stored = await session.get(Booking, booking_id)
        assert stored is not None
        stored.status = "confirmed"
        await session.commit()
        session.expire_all()
        response = await client.patch(
            f"/v1/admin/bookings/{booking_id}/assign",
            json={"technician_id": 2}, headers=_admin_headers(),
        )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "assigned"
    crew = (
        await session.execute(
            select(BookingCrewMember.user_id).where(
                BookingCrewMember.booking_id == ids[0]
            )
        )
    ).scalars().all()
    assert crew == [2]
    big = await client.patch(
        f"/v1/admin/bookings/{ids[0]}/assign",
        json={"technician_id": 2, "crew_ids": [3, 4, 5, 6, 7, 8]},
        headers=_admin_headers(),
    )
    assert big.status_code == 422


async def test_assign_requires_verified_payment(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Assign before payment is refused: submitted and scheduled cannot take
    a team, so ASSIGNED always means paid (no assigned-but-unpaid rows)."""
    client, subject, _ = pg_client
    submitted = await _create(client, customer_email="nopay1@example.com")
    subject["value"] = str(ADMIN_UUID)
    denied_submitted = await client.patch(
        f"/v1/admin/bookings/{submitted['id']}/assign",
        json={"technician_id": 2}, headers=_admin_headers(),
    )
    assert denied_submitted.status_code == 409
    await _upload(client, subject, submitted, "nopay1@example.com")
    denied_pending = await client.patch(
        f"/v1/admin/bookings/{submitted['id']}/assign",
        json={"technician_id": 2}, headers=_admin_headers(),
    )
    assert denied_pending.status_code == 409


async def test_reschedule_approve_flow(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="rs@example.com")
    await _confirm(client, subject, booking, "rs@example.com")
    new_day, _ = _future(6)
    first = await client.post(
        f"/v1/bookings/{booking['id']}/reschedule",
        json={"new_preferred_date": new_day, "new_preferred_time": "10:00",
              "reason": "Out of town", "email": "rs@example.com"},
    )
    assert first.status_code == 201, first.text
    subject["value"] = str(ADMIN_UUID)
    review = await client.patch(
        f"/v1/admin/reschedule/{first.json()['reschedule_id']}/review",
        json={"action": "approve"}, headers=_admin_headers(),
    )
    assert review.status_code == 200
    tracked = await client.get(
        f"/v1/bookings/track/{booking['reference_id']}", params={"email": "rs@example.com"}
    )
    assert tracked.json()["preferred_date"] == new_day


async def test_reschedule_max_two(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="rs2@example.com")
    await _confirm(client, subject, booking, "rs2@example.com")
    for offset in (6, 7):
        new_day, _ = _future(offset)
        response = await client.post(
            f"/v1/bookings/{booking['id']}/reschedule",
            json={"new_preferred_date": new_day, "new_preferred_time": "10:00",
                  "reason": "Change", "email": "rs2@example.com"},
        )
        assert response.status_code == 201, response.text
    new_day, _ = _future(8)
    third = await client.post(
        f"/v1/bookings/{booking['id']}/reschedule",
        json={"new_preferred_date": new_day, "new_preferred_time": "10:00",
              "reason": "Again", "email": "rs2@example.com"},
    )
    assert third.status_code == 409


async def test_expire_worker(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg_client
    booking = await _create(client, customer_email="exp@example.com")
    stored = await session.get(Booking, booking["id"])
    assert stored is not None
    stored.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await session.commit()
    session.expire_all()
    subject["value"] = str(ADMIN_UUID)
    response = await client.post(
        "/v1/admin/maintenance/expire-bookings", headers=_admin_headers()
    )
    assert response.status_code == 200
    assert response.json()["expired_count"] == 1
    tracked = await client.get(
        f"/v1/bookings/track/{booking['reference_id']}", params={"email": "exp@example.com"}
    )
    assert tracked.json()["status"] == "expired"


async def test_my_bookings_pagination(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    subject["value"] = str(CUSTOMER_UUID)
    # Distinct slots: one tech means one public seat per slot.
    for i, slot in enumerate(["08:00", "09:00"]):
        response = await client.post(
            "/v1/bookings",
            json=_payload(customer_email=f"mine{i}@example.com", preferred_time=slot),
            headers=_customer_headers(),
        )
        assert response.status_code == 201, response.text
    listing = await client.get(
        "/v1/bookings/me", params={"page": 1, "limit": 1}, headers=_customer_headers()
    )
    assert listing.status_code == 200
    assert listing.json()["total"] == 2
    assert len(listing.json()["items"]) == 1


async def test_receipt_stream_owner_only(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="rc@example.com")
    payment = await _upload(client, subject, booking, "rc@example.com")
    ok = await client.get(
        f"/v1/payments/{payment['uuid']}/receipt", params={"email": "rc@example.com"}
    )
    assert ok.status_code == 200
    assert ok.headers["content-type"] == "image/webp"
    denied = await client.get(
        f"/v1/payments/{payment['uuid']}/receipt", params={"email": "stranger@example.com"}
    )
    assert denied.status_code == 404


async def test_receipt_enumeration_answers_404(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Sequential-id probing and foreign-uuid guessing reveal nothing (uniform 404)."""
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="enum@example.com")
    payment = await _upload(client, subject, booking, "enum@example.com")
    for probe in ("1", "2", str(payment["id"]), "00000000-0000-0000-0000-000000000000"):
        response = await client.get(
            f"/v1/payments/{probe}/receipt", params={"email": "enum@example.com"}
        )
        assert response.status_code in (404, 422), (probe, response.text)
    no_email = await client.get(f"/v1/payments/{payment['uuid']}/receipt")
    assert no_email.status_code == 404


def test_storage_supabase_read_downloads(monkeypatch) -> None:
    """Supabase backend serves receipt bytes (faked client, no network)."""
    from app.services.storage_service import StorageService

    monkeypatch.setattr(settings, "storage_backend", "supabase")

    class _Bucket:
        def download(self, path: str) -> bytes:
            assert path == "1/abc.webp"
            return b"fake-webp"

    class _Storage:
        def from_(self, bucket: str) -> _Bucket:
            assert bucket == "receipts"
            return _Bucket()

    class _Client:
        storage = _Storage()

    monkeypatch.setattr("supabase.create_client", lambda *a, **k: _Client())
    data, content_type = StorageService().read("receipts/1/abc.webp")
    assert data == b"fake-webp"
    assert content_type == "image/webp"


async def test_psgc_regions_live(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, _, session = pg_client
    response = await client.get("/v1/psgc/regions")
    assert response.status_code == 200
    regions = response.json()
    assert any(r["code"] == "0400000000" for r in regions)
    cached = await session.execute(select(PsgcRegion).limit(1))
    assert cached.scalars().first() is not None


async def test_psgc_cities_by_region(
    pg_client: tuple[AsyncClient, dict, AsyncSession], monkeypatch
) -> None:
    """NCR-style regions serve cities straight from the region (no upsert)."""
    from app.services import psgc_service

    async def fake_fetch(path: str) -> list[dict]:
        assert path == "/regions/1300000000/cities-municipalities"
        return [{"code": "1374010000", "name": "City of Manila"}]

    monkeypatch.setattr(psgc_service, "_fetch", fake_fetch)
    client, _, _ = pg_client
    response = await client.get(
        "/v1/psgc/cities", params={"region_code": "1300000000"}
    )
    assert response.status_code == 200, response.text
    assert response.json() == [{"code": "1374010000", "name": "City of Manila"}]

    missing = await client.get("/v1/psgc/cities")
    assert missing.status_code == 422


async def test_booking_empty_province_childless_region_ok(
    pg_client: tuple[AsyncClient, dict, AsyncSession], monkeypatch
) -> None:
    """NCR (zero provinces upstream) books with an empty province."""
    from app.services import psgc_service

    async def no_provinces(db: AsyncSession, region_code: str) -> list[dict]:
        return []

    monkeypatch.setattr(psgc_service, "list_provinces", no_provinces)
    client, _, _ = pg_client
    booking = await _create(
        client, region_code="1300000000", province_code="",
        customer_email="ncr@example.com",
    )
    assert booking["status"] == "submitted"


async def test_booking_empty_province_rejected_when_provinces_exist(
    pg_client: tuple[AsyncClient, dict, AsyncSession], monkeypatch
) -> None:
    """Skipping province where provinces exist fails on the province box."""
    from app.services import psgc_service

    async def some_provinces(db: AsyncSession, region_code: str) -> list[dict]:
        return [{"code": "0128000000", "name": "Ilocos Norte"}]

    monkeypatch.setattr(psgc_service, "list_provinces", some_provinces)
    client, _, _ = pg_client
    response = await client.post(
        "/v1/bookings",
        json=_payload(
            region_code="0100000000", province_code="",
            customer_email="skip@example.com",
        ),
    )
    assert response.status_code == 422, response.text
    body = response.json()
    assert body["error"]["code"] == "VAL_001"
    assert body["error"]["details"][0]["field"] == "province_code"


def test_profile_complete_allows_empty_province() -> None:
    """NCR customers (no province) still count as address-complete."""
    from types import SimpleNamespace

    from app.services.user_service import UserService

    user = SimpleNamespace(
        region_code="1300000000", province_code="",
        city_municipality_code="1374010000", barangay_code="137401001",
        street_address="1 Rizal Ave",
    )
    assert UserService.is_profile_complete(user) is True
    user.street_address = ""
    assert UserService.is_profile_complete(user) is False


def test_psgc_parse_repairs_double_encoded_names() -> None:
    """Upstream serves some ñ names as UTF-8-read-as-Latin-1 ("ParaÃ±aque")."""
    from app.services.psgc_service import _parse, _repair

    assert _repair("City of ParaÃ±aque") == "City of Parañaque"
    assert _repair("City of Manila") == "City of Manila"
    assert _repair("") == ""

    rows = _parse([
        {"code": "1381000000", "name": "City of ParaÃ±aque"},
        {"code": "1374010000", "name": "City of Manila"},
        {"code": "x", "name": ""},
        "junk",
    ])
    assert rows[0]["name"] == "City of Parañaque"
    assert rows[1]["name"] == "City of Manila"
    assert len(rows) == 2


async def _extra_techs(session: AsyncSession, count: int) -> None:
    """Seed technicians: public seats = techs − house reserve (1)."""
    for i in range(count):
        session.add(
            User(
                uuid=uuid.uuid4(), first_name=f"Slot{i}", last_name="Tech",
                email=f"slot-tech-{uuid.uuid4().hex[:8]}@example.com",
                phone="09170001111", role="technician", status="active",
                email_verified_at=datetime.now(UTC),
            )
        )
    await session.commit()


async def test_slots_availability_states(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Open → low → full as assigned seats fill; states only, never counts."""
    client, subject, session = pg_client
    await _extra_techs(session, 2)  # capacity 3, reserve 1 → 2 public seats
    day, _ = _future(2)

    async def states() -> dict[str, str]:
        response = await client.get(
            "/v1/slots/availability", params={"date_from": day, "date_to": day}
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert len(body["days"]) == 1 and body["days"][0]["date"] == day
        assert len(body["days"][0]["slots"]) == 10
        return {s["time"]: s["state"] for s in body["days"][0]["slots"]}

    assert (await states())["10:00"] == "open"
    first = await _create(client, preferred_date=day, preferred_time="10:00",
                          customer_email="seat1@example.com")
    await _confirm(client, subject, first, "seat1@example.com")
    assert (await states())["10:00"] == "low"
    second = await _create(client, preferred_date=day, preferred_time="10:00",
                           customer_email="seat2@example.com")
    await _confirm(client, subject, second, "seat2@example.com")
    assert (await states())["10:00"] == "full"


async def test_slots_sunday_closed(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, _, _ = pg_client
    sunday = datetime.now(MANILA_TZ).date()
    delta = (6 - sunday.weekday()) % 7 or 7
    sunday += timedelta(days=delta)
    response = await client.get(
        "/v1/slots/availability",
        params={"date_from": sunday.isoformat(), "date_to": sunday.isoformat()},
    )
    assert response.status_code == 200, response.text
    slots = response.json()["days"][0]["slots"]
    assert {s["state"] for s in slots} == {"closed"}


async def test_booking_guard_full_slot_409(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg_client
    await _extra_techs(session, 2)
    day, _ = _future(2)
    first = await _create(client, preferred_date=day, preferred_time="11:00",
                          customer_email="g1@example.com")
    await _confirm(client, subject, first, "g1@example.com")
    second = await _create(client, preferred_date=day, preferred_time="11:00",
                           customer_email="g2@example.com")
    await _confirm(client, subject, second, "g2@example.com")
    response = await client.post(
        "/v1/bookings", json=_payload(preferred_date=day, preferred_time="11:00",
                                      customer_email="g3@example.com")
    )
    assert response.status_code == 409, response.text
    assert response.json()["error"]["code"] == "BOOKING_006"


async def test_booking_guard_race_last_seat(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Concurrent submits never race: only assigned bookings occupy, so both
    succeed and fullness is enforced later at assign/close (ADR-3)."""
    import asyncio
    from datetime import date, time

    from app.services import booking_service

    client, subject, session = pg_client
    await _extra_techs(session, 2)
    day, slot = _future(2)
    taken = await _create(client, preferred_date=day, preferred_time=slot,
                          customer_email="racer0@example.com")
    await _confirm(client, subject, taken, "racer0@example.com")
    await session.close()

    engine = create_async_engine(TEST_DB_URL)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def attempt(email: str):
        async with factory() as db:
            payload = _payload(preferred_date=day, preferred_time=slot,
                               customer_email=email)
            return await booking_service.create_booking(
                db, user=None, first_name=payload["customer_first_name"],
                last_name=payload["customer_last_name"], email=payload["customer_email"],
                phone=payload["customer_phone"], region_code=payload["region_code"],
                province_code=payload["province_code"],
                city_municipality_code=payload["city_municipality_code"],
                barangay_code=payload["barangay_code"],
                street_address=payload["street_address"], landmark=payload["landmark"],
                service_id=payload["service_id"], brand_id=payload["brand_id"],
                preferred_date=date.fromisoformat(payload["preferred_date"]),
                preferred_time=time.fromisoformat(payload["preferred_time"]),
                problem_description=None,
            )

    try:
        results = await asyncio.gather(
            attempt("racer1@example.com"), attempt("racer2@example.com"),
            return_exceptions=True,
        )
    finally:
        await engine.dispose()
    wins = [r for r in results if not isinstance(r, BaseException)]
    losses = [r for r in results if isinstance(r, BaseException)]
    assert len(wins) == 2 and len(losses) == 0
    assert {w.status for w in wins} == {"submitted"}


async def test_slot_hold_lifecycle(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Hold → seat reads low → submit consumes → reuse rejected."""
    from app.models.bookings import BookingHold

    client, _, session = pg_client
    await _extra_techs(session, 2)
    day, _ = _future(2)
    hold = await client.post(
        "/v1/slots/holds",
        json={"preferred_date": day, "preferred_time": "12:00"},
    )
    assert hold.status_code == 201, hold.text
    token = hold.json()["hold_token"]
    assert hold.json()["reference"].startswith("KJAC-")

    listed = await client.get(
        "/v1/slots/availability", params={"date_from": day, "date_to": day}
    )
    states = {s["time"]: s["state"] for s in listed.json()["days"][0]["slots"]}
    assert states["12:00"] == "low"

    booking = await _create(client, preferred_date=day, preferred_time="12:00",
                            customer_email="held@example.com", hold_token=token)
    assert booking["status"] == "submitted"
    consumed = (
        await session.execute(
            select(BookingHold).where(BookingHold.reference == hold.json()["reference"])
        )
    ).scalar_one()
    assert consumed.consumed_at is not None

    retry = await client.post(
        "/v1/bookings",
        json=_payload(preferred_date=day, preferred_time="12:00",
                      customer_email="held2@example.com", hold_token=token),
    )
    assert retry.status_code == 409


async def test_slot_hold_expired_rejected(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    from app.models.bookings import BookingHold

    client, _, session = pg_client
    await _extra_techs(session, 2)
    day, _ = _future(2)
    hold = await client.post(
        "/v1/slots/holds",
        json={"preferred_date": day, "preferred_time": "13:00"},
    )
    assert hold.status_code == 201, hold.text
    row = (
        await session.execute(
            select(BookingHold).where(BookingHold.reference == hold.json()["reference"])
        )
    ).scalar_one()
    row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await session.commit()

    response = await client.post(
        "/v1/bookings",
        json=_payload(preferred_date=day, preferred_time="13:00",
                      customer_email="stale@example.com",
                      hold_token=hold.json()["hold_token"]),
    )
    assert response.status_code == 409, response.text


async def test_slot_hold_full_slot_409(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg_client
    await _extra_techs(session, 2)
    day, _ = _future(2)
    first = await _create(client, preferred_date=day, preferred_time="14:00",
                          customer_email="f1@example.com")
    await _confirm(client, subject, first, "f1@example.com")
    second = await _create(client, preferred_date=day, preferred_time="14:00",
                           customer_email="f2@example.com")
    await _confirm(client, subject, second, "f2@example.com")
    hold = await client.post(
        "/v1/slots/holds",
        json={"preferred_date": day, "preferred_time": "14:00"},
    )
    assert hold.status_code == 409, hold.text


async def test_flex_booking_stores_window(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Morning window + anchor books fine and keeps its window tag."""
    from app.models.bookings import Booking

    client, subject, session = pg_client
    await _extra_techs(session, 2)
    day, _ = _future(2)
    booking = await _create(
        client, preferred_date=day, preferred_time="08:00",
        flex_window="morning", customer_email="flex@example.com",
    )
    await _confirm(client, subject, booking, "flex@example.com")
    row = await session.get(Booking, booking["id"])
    assert row is not None and row.flex_window == "morning"

    listed = await client.get(
        "/v1/slots/availability", params={"date_from": day, "date_to": day}
    )
    states = {s["time"]: s["state"] for s in listed.json()["days"][0]["slots"]}
    # One flexible morning counts on every morning slot (conservative).
    assert states["08:00"] == "low"
    assert states["09:00"] == "low"
    assert states["12:00"] == "open"


async def test_flex_booking_validation(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, _, session = pg_client
    await _extra_techs(session, 2)
    day, _ = _future(2)
    bad_window = await client.post(
        "/v1/bookings",
        json=_payload(preferred_date=day, preferred_time="08:00",
                      flex_window="evening", customer_email="fw1@example.com"),
    )
    assert bad_window.status_code == 422
    bad_anchor = await client.post(
        "/v1/bookings",
        json=_payload(preferred_date=day, preferred_time="09:00",
                      flex_window="morning", customer_email="fw2@example.com"),
    )
    assert bad_anchor.status_code == 422


async def test_flex_window_full_409(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg_client
    await _extra_techs(session, 2)
    day, _ = _future(2)
    first = await _create(client, preferred_date=day, preferred_time="08:00",
                          flex_window="morning", customer_email="fm1@example.com")
    await _confirm(client, subject, first, "fm1@example.com")
    second = await _create(client, preferred_date=day, preferred_time="08:00",
                           flex_window="morning", customer_email="fm2@example.com")
    await _confirm(client, subject, second, "fm2@example.com")
    third = await client.post(
        "/v1/bookings",
        json=_payload(preferred_date=day, preferred_time="08:00",
                      flex_window="morning", customer_email="fm3@example.com"),
    )
    assert third.status_code == 409, third.text
    assert third.json()["error"]["code"] == "BOOKING_006"


async def test_window_close_blocks_submit_and_reopen_allows(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Manual Close gates intake: closed window 409s submits, duplicate
    close 409s, reopen restores submits, second reopen 404s."""
    client, subject, _ = pg_client
    subject["value"] = str(ADMIN_UUID)
    day, _ = _future(2)
    closed = await client.post(
        "/v1/admin/slots/close",
        json={"preferred_date": day, "window": "morning"},
        headers=_admin_headers(),
    )
    assert closed.status_code == 201, closed.text
    dup = await client.post(
        "/v1/admin/slots/close",
        json={"preferred_date": day, "window": "morning"},
        headers=_admin_headers(),
    )
    assert dup.status_code == 409
    blocked = await client.post(
        "/v1/bookings",
        json=_payload(preferred_date=day, preferred_time="08:00",
                      flex_window="morning", customer_email="shut@example.com"),
    )
    assert blocked.status_code == 409, blocked.text
    assert blocked.json()["error"]["code"] == "BOOKING_006"
    reopened = await client.post(
        "/v1/admin/slots/reopen",
        json={"preferred_date": day, "window": "morning"},
        headers=_admin_headers(),
    )
    assert reopened.status_code == 204, reopened.text
    ok = await client.post(
        "/v1/bookings",
        json=_payload(preferred_date=day, preferred_time="08:00",
                      flex_window="morning", customer_email="shut@example.com"),
    )
    assert ok.status_code == 201, ok.text
    missing = await client.post(
        "/v1/admin/slots/reopen",
        json={"preferred_date": day, "window": "morning"},
        headers=_admin_headers(),
    )
    assert missing.status_code == 404


async def test_set_slot_flow(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Dispatch places the exact hour: guarded, tagged off, mailed."""
    from app.models.bookings import Booking

    client, subject, session = pg_client
    await _extra_techs(session, 2)
    day, _ = _future(2)
    booking = await _create(
        client, preferred_date=day, preferred_time="08:00",
        flex_window="morning", customer_email="place@example.com",
    )
    subject["value"] = str(ADMIN_UUID)
    moved = await client.patch(
        f"/v1/admin/bookings/{booking['id']}/set-slot",
        json={"preferred_date": day, "preferred_time": "09:00"},
        headers=_admin_headers(),
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["preferred_time"] == "09:00:00"
    assert moved.json()["flex_window"] is None
    row = await session.get(Booking, booking["id"])
    assert row is not None and row.flex_window is None

    exact = await _create(client, preferred_date=day, preferred_time="10:00",
                          customer_email="exact@example.com")
    subject["value"] = str(ADMIN_UUID)
    refused = await client.patch(
        f"/v1/admin/bookings/{exact['id']}/set-slot",
        json={"preferred_date": day, "preferred_time": "11:00"},
        headers=_admin_headers(),
    )
    assert refused.status_code == 409


async def test_admin_bookings_requires_admin(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    denied = await client.get("/v1/admin/bookings")
    assert denied.status_code == 403
    subject["value"] = str(CUSTOMER_UUID)
    forbidden = await client.get("/v1/admin/bookings", headers=_customer_headers())
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "PERM_001"


async def test_admin_bookings_list_shape_and_filters(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    subject["value"] = str(ADMIN_UUID)
    first = await _create(client, customer_email="list-a@example.com")
    day_b, _ = _future(5)
    second = await _create(
        client, customer_email="list-b@example.com", preferred_date=day_b
    )
    listing = await client.get("/v1/admin/bookings", headers=_admin_headers())
    assert listing.status_code == 200, listing.text
    body = listing.json()
    assert body["total"] == 2
    row = next(i for i in body["items"] if i["id"] == first["id"])
    assert row["service_name"] == "General Cleaning"
    assert row["brand_name"] == "Daikin"
    assert row["brand_is_partner"] is False
    assert row["technician"] is None
    assert row["payment"] is None
    assert row["active_reschedule"] is None
    assert row["timeline"] == []
    assert row["landmark"] == "Near church"
    assert row["service_estimated_duration_minutes"] == 90
    assert row["address_text"] == "123 Narra St"
    assert body["summary"] == {"submitted": 2, "all": 2}

    by_brand = await client.get(
        "/v1/admin/bookings", params={"brand_id": 1}, headers=_admin_headers()
    )
    assert by_brand.json()["total"] == 2
    by_brand_none = await client.get(
        "/v1/admin/bookings", params={"brand_id": 999}, headers=_admin_headers()
    )
    assert by_brand_none.json()["total"] == 0
    by_service = await client.get(
        "/v1/admin/bookings", params={"service_id": 1}, headers=_admin_headers()
    )
    assert by_service.json()["total"] == 2

    submitted = await client.get(
        "/v1/admin/bookings", params={"status": "submitted"}, headers=_admin_headers()
    )
    assert submitted.json()["total"] == 2
    confirmed = await client.get(
        "/v1/admin/bookings", params={"status": "confirmed"}, headers=_admin_headers()
    )
    assert confirmed.json()["total"] == 0

    by_ref = await client.get(
        "/v1/admin/bookings",
        params={"search": second["reference_id"][-6:]},
        headers=_admin_headers(),
    )
    assert by_ref.json()["total"] == 1
    assert by_ref.json()["items"][0]["id"] == second["id"]

    by_email = await client.get(
        "/v1/admin/bookings",
        params={"search": "list-a@example.com"},
        headers=_admin_headers(),
    )
    assert by_email.json()["total"] == 1

    in_range = await client.get(
        "/v1/admin/bookings",
        params={"date_from": day_b, "date_to": day_b},
        headers=_admin_headers(),
    )
    assert in_range.json()["total"] == 1
    assert in_range.json()["items"][0]["id"] == second["id"]

    page_two = await client.get(
        "/v1/admin/bookings", params={"limit": 1, "page": 2}, headers=_admin_headers()
    )
    assert page_two.json()["total"] == 2
    assert len(page_two.json()["items"]) == 1


async def test_admin_bookings_sorting(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    subject["value"] = str(ADMIN_UUID)
    day2, _ = _future(2)
    day3, _ = _future(3)
    day5, _ = _future(5)
    late = await _create(
        client, customer_first_name="Zed", customer_last_name="Amy", preferred_date=day5
    )
    early = await _create(
        client, customer_first_name="Ann", customer_last_name="Bo", preferred_date=day2
    )
    mid = await _create(
        client, customer_first_name="Mid", customer_last_name="Cy", preferred_date=day3
    )

    default = await client.get("/v1/admin/bookings", headers=_admin_headers())
    assert default.status_code == 200, default.text
    assert [i["id"] for i in default.json()["items"]] == [mid["id"], early["id"], late["id"]]

    sched_asc = await client.get(
        "/v1/admin/bookings",
        params={"sort_by": "schedule", "sort_dir": "asc"},
        headers=_admin_headers(),
    )
    assert [i["id"] for i in sched_asc.json()["items"]] == [early["id"], mid["id"], late["id"]]

    sched_desc = await client.get(
        "/v1/admin/bookings",
        params={"sort_by": "schedule", "sort_dir": "desc"},
        headers=_admin_headers(),
    )
    assert [i["id"] for i in sched_desc.json()["items"]] == [late["id"], mid["id"], early["id"]]

    customer = await client.get(
        "/v1/admin/bookings",
        params={"sort_by": "customer", "sort_dir": "asc"},
        headers=_admin_headers(),
    )
    assert [i["customer_last_name"] for i in customer.json()["items"]] == ["Amy", "Bo", "Cy"]

    bad = await client.get(
        "/v1/admin/bookings", params={"sort_by": "nope"}, headers=_admin_headers()
    )
    assert bad.status_code == 422


async def test_admin_bookings_shows_assignment_and_payment(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="ap@example.com")
    await _confirm(client, subject, booking, "ap@example.com")
    listing = await client.get("/v1/admin/bookings", headers=_admin_headers())
    assert listing.status_code == 200
    row = listing.json()["items"][0]
    assert row["status"] == "assigned"
    assert row["technician"] is not None
    assert row["technician"]["name"] == "Ben Tan"
    assert row["payment"] is not None
    assert row["payment"]["status"] == "verified"
    assert row["payment"]["gcash_reference_number"] == f"GC-{booking['reference_id']}-REF"
    assert any(t["new_status"] == "confirmed" for t in row["timeline"])


async def test_audit_logs_record_actor_and_diff(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg_client
    booking = await _create(client, customer_email="actor@example.com")
    await _confirm(client, subject, booking, "actor@example.com")
    admin_id = (
        await session.execute(select(User.id).where(User.uuid == ADMIN_UUID))
    ).scalar_one()

    trail = await client.get(
        "/v1/admin/audit-logs",
        params={"table_name": "bookings"},
        headers=_admin_headers(),
    )
    assert trail.status_code == 200, trail.text
    rows = [r for r in trail.json()["items"] if r["record_id"] == booking["id"]]
    updates = [r for r in rows if r["action"] == "UPDATE"]
    assert updates, "upload + verify + assign must leave audit rows"
    tech_rows = [
        r for r in updates
        if r["changed_fields"] and "technician_id" in r["changed_fields"]
    ]
    assert tech_rows, "assign diff must name technician_id"
    assert all(r["user_id"] == admin_id for r in tech_rows)
    # The guest's own upload flips submitted→pending with no login: honestly NULL.
    assert any(r["user_id"] is None for r in updates)

    inserts = [r for r in rows if r["action"] == "INSERT"]
    assert inserts and all(r["user_id"] is None for r in inserts)


async def test_audit_feed_enriched_sentences(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="story@example.com")
    await _confirm(client, subject, booking, "story@example.com")

    trail = await client.get(
        "/v1/admin/audit-logs",
        params={"table_name": "bookings"},
        headers=_admin_headers(),
    )
    assert trail.status_code == 200, trail.text
    rows = [r for r in trail.json()["items"] if r["record_id"] == booking["id"]]
    assign_rows = [r for r in rows if "assigned" in r["summary"]]
    assert assign_rows, "assign must read as a sentence"
    row = assign_rows[0]
    assert row["actor_name"] == "Ada Min"
    assert booking["reference_id"] in row["subject_label"]
    assert booking["reference_id"] in row["summary"]
    assert "Ben Tan" in row["summary"]


async def test_audit_search_names_refs_and_ids(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="findme@example.com")
    await _confirm(client, subject, booking, "findme@example.com")

    by_ref = await client.get(
        "/v1/admin/audit-logs",
        params={"search": booking["reference_id"][-6:]},
        headers=_admin_headers(),
    )
    assert by_ref.status_code == 200, by_ref.text
    assert by_ref.json()["total"] >= 1
    assert all(
        r["record_id"] == booking["id"] or r["table_name"] in ("payments", "refunds")
        for r in by_ref.json()["items"]
    )

    by_name = await client.get(
        "/v1/admin/audit-logs",
        params={"search": "Ada Min"},
        headers=_admin_headers(),
    )
    assert by_name.json()["total"] >= 1

    by_miss = await client.get(
        "/v1/admin/audit-logs",
        params={"search": "zzz-no-such-person"},
        headers=_admin_headers(),
    )
    assert by_miss.json()["total"] == 0


async def test_audit_feed_filters_summary_and_csv(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="filter@example.com")
    await _confirm(client, subject, booking, "filter@example.com")

    trail = await client.get(
        "/v1/admin/audit-logs",
        params={"table_name": "bookings"},
        headers=_admin_headers(),
    )
    assert trail.status_code == 200, trail.text
    body = trail.json()
    row = next(
        r for r in body["items"]
        if r["record_id"] == booking["id"] and (r["booking"] or {}).get("technician")
    )
    assert row["module_label"] == "Bookings"
    assert row["action_label"]
    assert isinstance(row["changes"], list)
    assert body["summary"]["total"] >= 1
    assert body["summary"]["today"] >= 1
    assert body["summary"]["week"] >= 1
    assert row["booking"]["reference"] == booking["reference_id"]
    assert "Ben Tan" in row["booking"]["technician"]

    flipped = await client.get(
        "/v1/admin/audit-logs",
        params={"table_name": "bookings", "sort_dir": "asc"},
        headers=_admin_headers(),
    )
    ids_desc = [r["id"] for r in body["items"]]
    ids_asc = [r["id"] for r in flipped.json()["items"]]
    assert ids_asc == sorted(ids_desc)

    tomorrow = (datetime.now(MANILA_TZ).date() + timedelta(days=1)).isoformat()
    empty = await client.get(
        "/v1/admin/audit-logs",
        params={"date_from": tomorrow},
        headers=_admin_headers(),
    )
    assert empty.json()["total"] == 0

    csv_resp = await client.get(
        "/v1/admin/audit-logs/export-xlsx",
        params={"table_name": "bookings"},
        headers=_admin_headers(),
    )
    assert csv_resp.status_code == 200, csv_resp.text
    assert "spreadsheetml" in csv_resp.headers["content-type"]
    assert csv_resp.content[:2] == b"PK"
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(csv_resp.content), read_only=True)
    sheet = wb["Audit logs"]
    header = [c.value for c in next(sheet.rows)]
    assert header[:3] == ["ID", "When", "Author"]
    assert any(booking["reference_id"] in str(c.value) for row in sheet.rows for c in row)


async def test_concurrent_verify_single_winner(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Two staff racing the same receipt: exactly one wins, the other gets 409."""
    import asyncio

    from app.services import payment_service

    client, subject, session = pg_client
    booking = await _create(client, customer_email="race@example.com")
    payment = await _upload(client, subject, booking, "race@example.com")
    admin_id = (
        await session.execute(select(User.id).where(User.uuid == ADMIN_UUID))
    ).scalar_one()
    await session.close()

    engine = create_async_engine(TEST_DB_URL)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with factory() as s1, factory() as s2:
            results = await asyncio.gather(
                payment_service.verify_payment(s1, payment["id"], admin_id, True, None),
                payment_service.verify_payment(s2, payment["id"], admin_id, False, "late"),
                return_exceptions=True,
            )
    finally:
        await engine.dispose()
    wins = [r for r in results if not isinstance(r, BaseException)]
    losses = [r for r in results if isinstance(r, BaseException)]
    assert len(wins) == 1 and len(losses) == 1
    assert getattr(losses[0], "http_status", None) == 409


async def test_concurrent_cancel_single_refund(    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Two staff racing the same cancel: one refund row, never two."""
    import asyncio

    from app.models.financial import Refund
    from app.services import booking_service

    client, subject, session = pg_client
    subject["value"] = str(ADMIN_UUID)
    booking = await _create(client, customer_email="race2@example.com")
    payment = await _upload(client, subject, booking, "race2@example.com")
    verify = await client.patch(
        f"/v1/admin/payments/{payment['id']}/verify",
        json={"action": "approve"}, headers=_admin_headers(),
    )
    assert verify.status_code == 200, verify.text
    admin = (
        await session.execute(select(User).where(User.uuid == ADMIN_UUID))
    ).scalar_one()
    await session.close()

    engine = create_async_engine(TEST_DB_URL)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with factory() as s1, factory() as s2:
            b1 = await s1.get(Booking, booking["id"])
            b2 = await s2.get(Booking, booking["id"])
            results = await asyncio.gather(
                booking_service.cancel_booking(
                    s1, b1, admin, "first", "09123456789", "Race Test",
                ),
                booking_service.cancel_booking(
                    s2, b2, admin, "second", "09123456789", "Race Test",
                ),
                return_exceptions=True,
            )
        async with factory() as check:
            refunds = (
                await check.execute(
                    select(Refund).where(Refund.booking_id == booking["id"])
                )
            ).scalars().all()
    finally:
        await engine.dispose()
    assert len([r for r in results if not isinstance(r, BaseException)]) == 1
    assert len(refunds) == 1


async def test_verify_reused_receipt_answers_409(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """One receipt, two bookings: first approval wins, second gets words, never a 500."""
    client, subject, _ = pg_client
    subject["value"] = str(ADMIN_UUID)
    first = await _create(client, customer_email="dup-a@example.com",
                            preferred_time="08:00")
    second = await _create(client, customer_email="dup-b@example.com",
                           preferred_time="09:00")
    pay_a = await _upload(client, subject, first, "dup-a@example.com", gcash_ref="DUP-REF-1")
    pay_b = await _upload(client, subject, second, "dup-b@example.com", gcash_ref="DUP-REF-1")

    ok = await client.patch(
        f"/v1/admin/payments/{pay_a['id']}/verify",
        json={"action": "approve"}, headers=_admin_headers(),
    )
    assert ok.status_code == 200, ok.text

    dup = await client.patch(
        f"/v1/admin/payments/{pay_b['id']}/verify",
        json={"action": "approve"}, headers=_admin_headers(),
    )
    assert dup.status_code == 409, dup.text
    assert "already used" in dup.json()["error"]["message"]
    assert first["reference_id"] in dup.json()["error"]["message"]


async def test_admin_cancel_guest_booking(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    """Office cancel needs no ownership: guest booking, staff actor, tiered refund."""
    client, subject, _ = pg_client
    subject["value"] = str(ADMIN_UUID)
    booking = await _create(client, customer_email="staffcancel@example.com")

    subject["value"] = str(CUSTOMER_UUID)
    denied = await client.post(
        f"/v1/admin/bookings/{booking['id']}/cancel",
        json={"reason": "customer called"},
        headers=_customer_headers(),
    )
    assert denied.status_code == 403
    subject["value"] = str(ADMIN_UUID)

    cancelled = await client.post(
        f"/v1/admin/bookings/{booking['id']}/cancel",
        json={"reason": "customer called"},
        headers=_admin_headers(),
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "cancelled"

    again = await client.post(
        f"/v1/admin/bookings/{booking['id']}/cancel",
        json={"reason": "customer called"},
        headers=_admin_headers(),
    )
    assert again.status_code == 409

