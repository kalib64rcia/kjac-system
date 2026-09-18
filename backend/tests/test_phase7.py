"""Phase C+D tests: travel buffers, technician roster.

Mirrors the phase6 harness (migrated test DB, subject overrides, 2FA
ticket). travel_minutes + roster tables in the truncate list.
"""

import os
import subprocess
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime, time, timedelta
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
from app.models.users import User
from app.services.booking_service import manila_now

TEST_DB_URL = "postgresql+asyncpg://postgres:kjac-test@localhost:5433/kjac_test"
ADMIN_DSN = "dbname=postgres user=postgres password=kjac-test host=localhost port=5433"

ADMIN_UUID = uuid.uuid4()
TECH_UUID = uuid.uuid4()
TECH2_UUID = uuid.uuid4()
CUSTOMER_UUID = uuid.uuid4()

BACKEND_DIR = Path(__file__).resolve().parent.parent
TRUNCATE_TABLES = (
    "reschedule_requests, booking_inventory_usage,"
    " inventory_movements, messages, message_threads, notifications, ratings,"
    " window_closures, booking_crew_members,"
    " refunds, payments, booking_status_history, booking_waitlist, booking_holds, bookings,"
    " technician_workdays, technician_time_off,"
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


@pytest_asyncio.fixture
async def pg7(tmp_path, monkeypatch, migrated_db) -> AsyncIterator[tuple[AsyncClient, dict, AsyncSession]]:
    from app.core import rate_limit as limiter
    from app.core.config import settings

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
                User(uuid=ADMIN_UUID, first_name="Ada", last_name="Min",
                     email="ada@example.com", phone="09170001111",
                     role="owner", status="active", email_verified_at=datetime.now(UTC)),
                User(uuid=TECH_UUID, first_name="Ben", last_name="Tan",
                     email="ben@example.com", phone="09179876543",
                     role="technician", status="active", email_verified_at=datetime.now(UTC)),
                User(uuid=TECH2_UUID, first_name="Cal", last_name="Dee",
                     email="cal@example.com", phone="09179870000",
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
            yield client, subject, session
    await engine.dispose()


def _next_weekday(weekday: int) -> str:
    day = manila_now().date()
    while day.weekday() != weekday:
        day += timedelta(days=1)
    return day.isoformat()


async def _tech_ids(client: AsyncClient) -> list[int]:
    response = await client.get("/v1/admin/roster")
    assert response.status_code == 200
    return [t["user_id"] for t in response.json()]


async def test_roster_defaults_all_working(pg7) -> None:
    client, _, _ = pg7
    response = await client.get("/v1/admin/roster")
    assert response.status_code == 200
    techs = response.json()
    assert len(techs) == 2
    assert techs[0]["days"] == [True] * 7
    assert techs[0]["leave"] == []


async def test_roster_day_off_drops_capacity(pg7) -> None:
    from datetime import date as date_cls

    client, _, _ = pg7
    monday = _next_weekday(0)
    # Day after Monday (not "next Tuesday", which can precede it).
    tuesday = (
        date_cls.fromisoformat(monday) + timedelta(days=1)
    ).isoformat()
    ids = await _tech_ids(client)
    saved = await client.put(f"/v1/admin/roster/{ids[0]}/days",
                             json={"days": [False, True, True, True, True, True, True]})
    assert saved.status_code == 200
    assert saved.json()["days"][0] is False
    response = await client.get(
        f"/v1/admin/slots/vacancy?date_from={monday}&date_to={tuesday}")
    days = {d["date"]: d["slots"] for d in response.json()["days"]}
    assert days[monday][0]["capacity"] == 1
    assert days[tuesday][0]["capacity"] == 2


async def test_roster_validation(pg7) -> None:
    client, _, _ = pg7
    ids = await _tech_ids(client)
    short = await client.put(f"/v1/admin/roster/{ids[0]}/days",
                             json={"days": [True, True]})
    assert short.status_code == 422
    ghost = await client.put("/v1/admin/roster/999999/days",
                             json={"days": [True] * 7})
    assert ghost.status_code == 404


async def test_roster_leave(pg7) -> None:
    from datetime import date as date_cls

    client, _, _ = pg7
    wednesday = _next_weekday(2)
    # Day after the leave day (not "next Thursday", which can precede it).
    thursday = (
        date_cls.fromisoformat(wednesday) + timedelta(days=1)
    ).isoformat()
    ids = await _tech_ids(client)
    added = await client.post("/v1/admin/roster/time-off", json={
        "user_id": ids[0], "date_from": wednesday, "date_to": wednesday,
        "reason": "Family day"})
    assert added.status_code == 201
    response = await client.get(
        f"/v1/admin/slots/vacancy?date_from={wednesday}&date_to={thursday}")
    days = {d["date"]: d["slots"] for d in response.json()["days"]}
    assert days[wednesday][0]["capacity"] == 1
    assert days[thursday][0]["capacity"] == 2
    bad_range = await client.post("/v1/admin/roster/time-off", json={
        "user_id": ids[0], "date_from": thursday, "date_to": wednesday})
    assert bad_range.status_code == 422
    removed = await client.delete(f"/v1/admin/roster/time-off/{added.json()['id']}")
    assert removed.status_code == 204
    missing = await client.delete("/v1/admin/roster/time-off/999999")
    assert missing.status_code == 404
    reread = await client.get(
        f"/v1/admin/slots/vacancy?date_from={wednesday}&date_to={wednesday}")
    assert reread.json()["days"][0]["slots"][0]["capacity"] == 2


async def test_roster_full_day_takes_waitlist(pg7) -> None:
    client, _, _ = pg7
    friday = _next_weekday(4)
    ids = await _tech_ids(client)
    for tech_id in ids:
        await client.put(f"/v1/admin/roster/{tech_id}/days",
                         json={"days": [True, True, True, True, False, True, True]})
    joined = await client.post("/v1/waitlist", json={
        "preferred_date": friday, "name": "Wally List",
        "phone": "09171234567", "email": "wally@example.com"})
    assert joined.status_code == 201


async def test_sunday_stays_closed_with_full_crew(pg7) -> None:
    client, _, _ = pg7
    day = manila_now().date() + timedelta(days=1)
    while day.weekday() != 6:
        day += timedelta(days=1)
    response = await client.get(
        f"/v1/admin/slots/vacancy?date_from={day.isoformat()}&date_to={day.isoformat()}")
    slots = response.json()["days"][0]["slots"]
    assert all(s["state"] == "closed" for s in slots)


def _plan_booking(day: str, hour: int) -> Booking:
    return Booking(
        reference_id=f"KJAC-2026-{uuid.uuid4().hex[:6].upper()}",
        customer_first_name="Plan", customer_last_name="Day",
        customer_email="plan@example.com", customer_phone="09179998888",
        service_id=1, brand_id=1,
        street_address="1 Plan St", landmark="Gate",
        down_payment_amount=500, status="assigned",
        preferred_date=date.fromisoformat(day),
        preferred_time=time(hour, 0),
    )


async def _day_orders(client: AsyncClient, day: str) -> dict[int, int | None]:
    listing = await client.get(
        f"/v1/admin/bookings?date_from={day}&date_to={day}&limit=100")
    return {i["id"]: i["dispatch_order"] for i in listing.json()["items"]}


async def test_day_order_sequence(pg7) -> None:
    client, _, session = pg7
    day = _next_weekday(1)
    session.add_all([_plan_booking(day, 8), _plan_booking(day, 10), _plan_booking(day, 14)])
    await session.commit()
    before = await _day_orders(client, day)
    assert set(before.values()) == {None}
    ids = list(before)
    wanted = [ids[2], ids[0], ids[1]]
    saved = await client.post("/v1/admin/bookings/day-order",
                              json={"preferred_date": day, "ordered_ids": wanted})
    assert saved.status_code == 200
    assert saved.json()["ordered_ids"] == wanted
    after = await _day_orders(client, day)
    assert [after[i] for i in wanted] == [1, 2, 3]


async def test_day_order_unlisted_goes_null(pg7) -> None:
    client, _, session = pg7
    day = _next_weekday(2)
    session.add_all([_plan_booking(day, 8), _plan_booking(day, 10)])
    await session.commit()
    before = await _day_orders(client, day)
    ids = list(before)
    await client.post("/v1/admin/bookings/day-order",
                      json={"preferred_date": day, "ordered_ids": [ids[0]]})
    after = await _day_orders(client, day)
    assert after[ids[0]] == 1
    assert after[ids[1]] is None


async def test_day_order_validation(pg7) -> None:
    client, _, session = pg7
    day = _next_weekday(3)
    session.add(_plan_booking(day, 8))
    await session.commit()
    before = await _day_orders(client, day)
    only = next(iter(before))
    dup = await client.post("/v1/admin/bookings/day-order",
                            json={"preferred_date": day, "ordered_ids": [only, only]})
    assert dup.status_code == 422
    ghost = await client.post("/v1/admin/bookings/day-order",
                              json={"preferred_date": day, "ordered_ids": [999999]})
    assert ghost.status_code == 404
    naked = await client.post("/v1/admin/bookings/day-order",
                              json={"preferred_date": day, "ordered_ids": [only]},
                              headers={"X-Admin-2FA": ""})
    assert naked.status_code in (401, 403)
