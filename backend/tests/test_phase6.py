"""Phase B tests: office vacancy, guest waitlist, reminders.

Mirrors the phase4/5 harness (migrated test DB, subject overrides, 2FA
ticket, fake mailer). booking_waitlist added to the truncate list.
"""

import os
import subprocess
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime, time, timedelta
from pathlib import Path

import pytest
import pytest_asyncio
from fastapi import Request
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import _optional_subject, get_current_subject, get_db
from app.core.security import create_two_fa_ticket
from app.main import create_app
from app.models.bookings import Booking
from app.models.catalog import AirconBrand, Service
from app.models.system import SystemSetting
from app.models.users import User
from app.services.booking_service import manila_now

TEST_DB_URL = "postgresql+asyncpg://postgres:kjac-test@localhost:5433/kjac_test"
ADMIN_DSN = "dbname=postgres user=postgres password=kjac-test host=localhost port=5433"

ADMIN_UUID = uuid.uuid4()
TECH_UUID = uuid.uuid4()
CUSTOMER_UUID = uuid.uuid4()

BACKEND_DIR = Path(__file__).resolve().parent.parent
TRUNCATE_TABLES = (
    "reschedule_requests, booking_inventory_usage,"
    " inventory_movements, messages, message_threads, notifications, ratings,"
    " window_closures, booking_crew_members,"
    " refunds, payments, booking_status_history, booking_waitlist, booking_holds, bookings,"
    " payroll_records, commission_rules, employee_info, audit_logs,"
    " user_sessions, admin_two_fa_codes, inventory_items, service_images,"
    " brand_images, services, aircon_brands, psgc_barangays,"
    " psgc_cities_municipalities, psgc_provinces, psgc_regions,"
    " system_settings, users"
)


@pytest.fixture(scope="session")
def migrated_db() -> None:
    import psycopg2

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
                   cwd=BACKEND_DIR, env=env, check=False, capture_output=True)
    subprocess.run(["python", "-m", "alembic", "upgrade", "head"],
                   cwd=BACKEND_DIR, env=env, check=True, capture_output=True)


class FakeMail:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str, str]] = []

    def send(self, to: str, subject: str, body: str) -> bool:
        self.sent.append((to, subject, body))
        return True


@pytest_asyncio.fixture
async def pg6(tmp_path, monkeypatch, migrated_db) -> AsyncIterator[tuple[AsyncClient, dict, AsyncSession, FakeMail]]:
    from app.core import rate_limit as limiter
    from app.core.config import settings

    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    monkeypatch.setattr(settings, "storage_backend", "local")
    try:
        limiter._storage.reset()  # type: ignore[attr-defined]
    except (AttributeError, NotImplementedError):
        pass
    mailer = FakeMail()

    class FakeEmailService:
        def send(self, to: str, subject: str, body: str) -> bool:
            return mailer.send(to, subject, body)

    monkeypatch.setattr("app.services.email_service.EmailService", FakeEmailService)
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {TRUNCATE_TABLES} RESTART IDENTITY CASCADE"))
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        session.add_all(
            [
                User(uuid=ADMIN_UUID, first_name="Ada", last_name="Min",
                     email="ada@example.com", phone="09170001111",
                     role="owner", status="active", email_verified_at=datetime.now(UTC)),
                User(uuid=TECH_UUID, first_name="Ben", last_name="Tan",
                     email="ben@example.com", phone="09179876543",
                     role="technician", status="active", email_verified_at=datetime.now(UTC)),
                User(uuid=CUSTOMER_UUID, first_name="Cid", last_name="Cus",
                     email="cid@example.com", phone="09170002222",
                     role="customer", status="active", email_verified_at=datetime.now(UTC)),
                Service(name="General Cleaning", slug="general-cleaning",
                        description="clean", base_price=1500,
                        down_payment_amount=500, down_payment_type="fixed",
                        estimated_duration_minutes=90, is_active=True),
                AirconBrand(name="Daikin", slug="daikin", is_active=True),
            ]
        )
        await session.commit()

        app = create_app()
        subject = {"value": str(ADMIN_UUID)}

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
        headers = {"X-Admin-2FA": create_two_fa_ticket(str(ADMIN_UUID))}
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test",
            headers=headers,
        ) as client:
            yield client, subject, session, mailer
    await engine.dispose()


def _future(days: int) -> str:
    day = manila_now().date() + timedelta(days=days)
    # Never land on a Sunday (closed for business in tests).
    if day.weekday() == 6:
        day += timedelta(days=1)
    return day.isoformat()


def _join(day: str, **overrides) -> dict:
    base = {"preferred_date": day, "name": "Wally List",
            "phone": "09171234567", "email": "wally@example.com"}
    base.update(overrides)
    return base


async def test_vacancy_shape_and_numbers(pg6) -> None:
    client, _, _, _ = pg6
    day = _future(3)
    response = await client.get(f"/v1/admin/slots/vacancy?date_from={day}&date_to={day}")
    assert response.status_code == 200
    days = response.json()["days"]
    assert len(days) == 1
    slots = days[0]["slots"]
    assert len(slots) == 10
    first = slots[0]
    assert set(first) == {"time", "state", "capacity", "booked", "holds", "left"}
    assert first["capacity"] == 1  # one active tech in fixtures
    assert first["state"] == "open"
    assert first["left"] == 1


async def test_vacancy_requires_admin(pg6) -> None:
    client, _, _, _ = pg6
    response = await client.get(
        "/v1/admin/slots/vacancy", headers={"X-Admin-2FA": ""}
    )
    assert response.status_code in (401, 403)


async def test_join_rejected_when_room_left(pg6) -> None:
    client, _, _, _ = pg6
    response = await client.post("/v1/waitlist", json=_join(_future(3)))
    assert response.status_code == 422
    assert "still has room" in response.json()["error"]["message"]


async def test_join_accepted_when_full(pg6) -> None:
    client, _, session, _ = pg6
    await session.execute(
        text("UPDATE users SET status='inactive' WHERE role='technician'")
    )
    await session.commit()
    response = await client.post("/v1/waitlist", json=_join(_future(4)))
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "waiting"
    assert body["email"] == "wally@example.com"


async def test_join_validation(pg6) -> None:
    client, _, session, _ = pg6
    await session.execute(
        text("UPDATE users SET status='inactive' WHERE role='technician'")
    )
    await session.commit()
    day = _future(4)
    bad_phone = await client.post("/v1/waitlist", json=_join(day, phone="123"))
    assert bad_phone.status_code == 422
    bad_email = await client.post("/v1/waitlist", json=_join(day, email="nope"))
    assert bad_email.status_code == 422
    past = await client.post("/v1/waitlist", json=_join("2020-01-06"))
    assert past.status_code == 422


async def test_waitlist_daily_cap(pg6) -> None:
    client, _, session, _ = pg6
    await session.execute(
        text("UPDATE users SET status='inactive' WHERE role='technician'")
    )
    session.add(SystemSetting(setting_key="waitlist_per_day_cap",
                              setting_value="1", data_type="integer", category="booking"))
    await session.commit()
    day = _future(5)
    first = await client.post("/v1/waitlist", json=_join(day))
    assert first.status_code == 201
    second = await client.post("/v1/waitlist", json=_join(day, email="zed@example.com"))
    assert second.status_code == 409


async def test_offer_flow(pg6) -> None:
    client, _, session, mailer = pg6
    day = _future(6)
    # Fill the day so join is allowed, then free one slot for the offer.
    await session.execute(
        text("UPDATE users SET status='inactive' WHERE role='technician'")
    )
    await session.commit()
    joined = await client.post("/v1/waitlist", json=_join(day))
    assert joined.status_code == 201
    entry_id = joined.json()["id"]
    await session.execute(
        text("UPDATE users SET status='active' WHERE role='technician'")
    )
    await session.commit()
    offered = await client.post(
        f"/v1/admin/waitlist/{entry_id}/offer", json={"preferred_time": "09:00"}
    )
    assert offered.status_code == 200
    body = offered.json()
    assert body["entry"]["status"] == "offered"
    assert f"date={day}" in body["booking_link"]
    assert "time=09:00" in body["booking_link"]
    assert "hold=" in body["booking_link"]
    assert any("slot opened" in subject for _, subject, _ in mailer.sent)
    listed = await client.get(f"/v1/admin/waitlist?day={day}")
    assert listed.status_code == 200
    assert listed.json()[0]["status"] == "offered"
    # Second offer on a handled entry is a conflict, not a silent double-hold.
    again = await client.post(
        f"/v1/admin/waitlist/{entry_id}/offer", json={"preferred_time": "10:00"}
    )
    assert again.status_code == 409


async def test_offer_without_room_conflicts(pg6) -> None:
    client, _, session, _ = pg6
    await session.execute(
        text("UPDATE users SET status='inactive' WHERE role='technician'")
    )
    await session.commit()
    joined = await client.post("/v1/waitlist", json=_join(_future(7)))
    entry_id = joined.json()["id"]
    offered = await client.post(
        f"/v1/admin/waitlist/{entry_id}/offer", json={"preferred_time": "09:00"}
    )
    assert offered.status_code == 409


async def test_remove_entry(pg6) -> None:
    client, _, session, _ = pg6
    await session.execute(
        text("UPDATE users SET status='inactive' WHERE role='technician'")
    )
    await session.commit()
    day = _future(8)
    joined = await client.post("/v1/waitlist", json=_join(day))
    entry_id = joined.json()["id"]
    removed = await client.post(f"/v1/admin/waitlist/{entry_id}/remove")
    assert removed.status_code == 200
    assert removed.json()["status"] == "removed"
    listed = await client.get(f"/v1/admin/waitlist?day={day}")
    assert listed.json() == []


def _booking_row(**overrides) -> Booking:
    base = {
        "reference_id": f"KJAC-2026-{uuid.uuid4().hex[:6].upper()}",
        "customer_first_name": "Remy", "customer_last_name": "Nder",
        "customer_email": "remy@example.com", "customer_phone": "09179998888",
        "service_id": 1, "brand_id": 1,
        "street_address": "1 Reminder St", "landmark": "Blue gate",
        "down_payment_amount": 500, "status": "confirmed",
    }
    base.update(overrides)
    return Booking(**base)


async def test_reminders_run(pg6) -> None:
    client, _, session, _mailer = pg6
    now = manila_now()
    tomorrow = now.date() + timedelta(days=1)
    if tomorrow.weekday() == 6:
        tomorrow += timedelta(days=1)
    session.add(_booking_row(preferred_date=tomorrow, preferred_time=time(9, 0)))
    expiring = _booking_row(
        reference_id=f"KJAC-2026-{uuid.uuid4().hex[:6].upper()}",
        status="submitted", preferred_date=tomorrow,
        preferred_time=time(10, 0))
    session.add(expiring)
    await session.commit()
    # BEFORE INSERT trigger owns expires_at (submitted_at + 3h); set the
    # test window with an UPDATE, which the trigger does not touch.
    expiring.expires_at = now + timedelta(hours=1)
    await session.commit()
    response = await client.post("/v1/admin/reminders/run")
    assert response.status_code == 200
    body = response.json()
    assert body["tomorrow_sent"] == 1
    assert body["payment_sent"] == 1
    # Payment nudge is stamped: a second run must not resend it.
    again = await client.post("/v1/admin/reminders/run")
    assert again.json()["payment_sent"] == 0


async def test_reminders_respect_toggles(pg6) -> None:
    client, _, session, _ = pg6
    session.add_all([
        SystemSetting(setting_key="reminder_booking_tomorrow_enabled",
                      setting_value="false", data_type="boolean", category="booking"),
        SystemSetting(setting_key="reminder_payment_expiring_enabled",
                      setting_value="false", data_type="boolean", category="booking"),
    ])
    await session.commit()
    response = await client.post("/v1/admin/reminders/run")
    assert response.json() == {"tomorrow_sent": 0, "payment_sent": 0}
