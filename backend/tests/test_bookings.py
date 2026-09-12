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


async def _upload(
    client: AsyncClient, booking_id: int, email: str, amount: float = 500.0,
    headers: dict | None = None,
) -> dict:
    response = await client.post(
        f"/v1/bookings/{booking_id}/payment",
        files={"file": ("receipt.png", _png(), "image/png")},
        data={
            "gcash_reference_number": f"GC-{booking_id}-REF",
            "amount": str(amount),
            "payment_method": "gcash",
            "email": email,
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _confirm(
    client: AsyncClient, subject: dict, booking_id: int, email: str
) -> None:
    """Upload as guest, verify as admin, assign tech. Returns confirmed booking."""
    subject["value"] = str(ADMIN_UUID)
    payment = await _upload(client, booking_id, email)
    verify = await client.patch(
        f"/v1/admin/payments/{payment['id']}/verify",
        json={"action": "approve"}, headers=_admin_headers(),
    )
    assert verify.status_code == 200, verify.text
    assign = await client.patch(
        f"/v1/admin/bookings/{booking_id}/assign",
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
    for i in range(3):
        response = await client.post(
            "/v1/bookings", json=_payload(customer_email="rl@example.com")
        )
        assert response.status_code == 201, response.text
    fourth = await client.post("/v1/bookings", json=_payload(customer_email="rl@example.com"))
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
    client, _, _ = pg_client
    booking = await _create(client, customer_email="amt@example.com")
    response = await client.post(
        f"/v1/bookings/{booking['id']}/payment",
        files={"file": ("receipt.png", _png(), "image/png")},
        data={"gcash_reference_number": "GC-X", "amount": "100.00",
              "payment_method": "gcash", "email": "amt@example.com"},
    )
    assert response.status_code == 400


async def test_cancel_immediate_full_refund(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, _, _ = pg_client
    booking = await _create(client, customer_email="cx@example.com")
    await _upload(client, booking["id"], "cx@example.com")
    response = await client.post(
        f"/v1/bookings/{booking['id']}/cancel",
        json={"reason": "Changed my mind", "email": "cx@example.com"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "cancelled"
    assert body["refund_status"] == "approved"
    assert body["refund_amount"] == 500.0


async def test_cancel_same_day_needs_approval(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg_client
    booking = await _create(client, customer_email="sd@example.com")
    await _confirm(client, subject, booking["id"], "sd@example.com")
    stored = await session.get(Booking, booking["id"])
    assert stored is not None
    stored.preferred_date = datetime.now(MANILA_TZ).date()
    await session.commit()
    session.expire_all()
    response = await client.post(
        f"/v1/bookings/{booking['id']}/cancel",
        json={"reason": "Emergency", "email": "sd@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["refund_status"] == "processing"


async def test_cancel_late_denied(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="late@example.com")
    await _confirm(client, subject, booking["id"], "late@example.com")
    subject["value"] = str(TECH_UUID)
    tech_headers = {"Authorization": "Bearer tech-token"}
    en_route = await client.patch(
        f"/v1/technician/jobs/{booking['id']}/status",
        json={"status": "on_the_way"}, headers=tech_headers,
    )
    assert en_route.status_code == 200
    response = await client.post(
        f"/v1/bookings/{booking['id']}/cancel",
        json={"reason": "Too late", "email": "late@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["refund_status"] == "denied"


async def test_tech_progression(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="tech@example.com")
    await _confirm(client, subject, booking["id"], "tech@example.com")
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
    assert states == ["confirmed", "confirmed", "ongoing", "completed"]


async def test_assign_capacity_guard(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg_client
    day, _ = _future(5)
    ids = []
    for i in range(4):
        booking = await _create(client, customer_email=f"cap{i}@example.com",
                                preferred_date=day)
        await _upload(client, booking["id"], f"cap{i}@example.com")
        ids.append(booking["id"])
    subject["value"] = str(ADMIN_UUID)
    for booking_id in ids[:3]:
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
    stored = await session.get(Booking, ids[3])
    assert stored is not None
    stored.status = "confirmed"
    await session.commit()
    session.expire_all()
    full = await client.patch(
        f"/v1/admin/bookings/{ids[3]}/assign",
        json={"technician_id": 2}, headers=_admin_headers(),
    )
    assert full.status_code == 409
    assert full.json()["error"]["code"] == "BOOKING_006"


async def test_reschedule_approve_flow(
    pg_client: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, _ = pg_client
    booking = await _create(client, customer_email="rs@example.com")
    await _confirm(client, subject, booking["id"], "rs@example.com")
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
    await _confirm(client, subject, booking["id"], "rs2@example.com")
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
    for i in range(2):
        response = await client.post(
            "/v1/bookings", json=_payload(customer_email=f"mine{i}@example.com"),
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
    client, _, _ = pg_client
    booking = await _create(client, customer_email="rc@example.com")
    payment = await _upload(client, booking["id"], "rc@example.com")
    ok = await client.get(
        f"/v1/payments/{payment['id']}/receipt", params={"email": "rc@example.com"}
    )
    assert ok.status_code == 200
    assert ok.headers["content-type"] == "image/webp"
    denied = await client.get(
        f"/v1/payments/{payment['id']}/receipt", params={"email": "stranger@example.com"}
    )
    assert denied.status_code == 404


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
