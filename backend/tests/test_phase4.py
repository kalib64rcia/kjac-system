"""Phase 4 tests: ratings, notifications, inventory, payroll, admin users, reports."""

import os
import subprocess
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import psycopg2
import pytest
import pytest_asyncio
from fastapi import Request
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.api.deps import _optional_subject, get_current_subject, get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import create_two_fa_ticket
from app.main import create_app
from app.models.bookings import Booking
from app.models.catalog import AirconBrand, Service
from app.models.comms import Notification
from app.models.hr import CommissionRule
from app.models.tech_invite import TechnicianInvite
from app.models.users import User

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
    " refunds, payments, booking_status_history, bookings,"
    " payroll_records, commission_rules, employee_info, audit_logs,"
    " user_sessions, admin_two_fa_codes, inventory_items, service_images,"
    " brand_images, services, aircon_brands, psgc_barangays,"
    " psgc_cities_municipalities, psgc_provinces, psgc_regions,"
    " system_settings, users"
)


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
                   cwd=BACKEND_DIR, env=env, check=False, capture_output=True)
    subprocess.run(["python", "-m", "alembic", "upgrade", "head"],
                   cwd=BACKEND_DIR, env=env, check=True, capture_output=True)


@pytest_asyncio.fixture
async def pg4(
    tmp_path, monkeypatch, migrated_db
) -> AsyncIterator[tuple[AsyncClient, dict, AsyncSession]]:
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    monkeypatch.setattr(settings, "storage_backend", "local")
    try:
        limiter._storage.reset()  # type: ignore[attr-defined]
    except (AttributeError, NotImplementedError):
        pass
    engine = create_async_engine(TEST_DB_URL)
    from sqlalchemy import text

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
                CommissionRule(commission_type="percentage", commission_value=10,
                               applies_to_all_services=True,
                               effective_from=date(2026, 1, 1), is_active=True),
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
    return {"Authorization": "Bearer admin-token",
            "X-Admin-2FA": create_two_fa_ticket(str(ADMIN_UUID))}


def _tech_headers() -> dict[str, str]:
    return {"Authorization": "Bearer tech-token"}


async def _completed_booking(
    session: AsyncSession, email: str = "done@example.com", tech_id: int = 2
) -> int:
    from app.utils.reference_id import generate_reference_id

    booking = Booking(
        reference_id=generate_reference_id(), customer_id=3, technician_id=tech_id,
        service_id=1, brand_id=1, customer_first_name="Don", customer_last_name="E",
        customer_email=email, customer_phone="09170003333",
        street_address="St", landmark="Lm",
        preferred_date=datetime.now(UTC).date() - timedelta(days=1),
        preferred_time=datetime.now(UTC).time().replace(microsecond=0),
        down_payment_amount=500, total_service_cost=1500, status="completed",
        completed_at=datetime.now(UTC) - timedelta(hours=1),
    )
    session.add(booking)
    await session.commit()
    booking_id = booking.id  # capture before expire_all (lazy load needs greenlet)
    session.expire_all()
    return booking_id


async def test_rating_requires_completed(
    pg4: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, _, session = pg4
    booking_id = await _completed_booking(session)
    stored = await session.get(Booking, booking_id)
    assert stored is not None
    stored.status = "confirmed"
    await session.commit()
    session.expire_all()
    response = await client.post(
        f"/v1/bookings/{booking_id}/rating",
        json={"rating": 5, "email": "done@example.com"},
    )
    assert response.status_code == 409


async def test_rating_lifecycle(
    pg4: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg4
    booking_id = await _completed_booking(session)
    response = await client.post(
        f"/v1/bookings/{booking_id}/rating",
        json={"rating": 5, "review_text": "Great work", "email": "done@example.com"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["rating"] == 5

    tech = await session.get(User, 2)
    assert tech is not None
    session.expire_all()
    tech = await session.get(User, 2)
    assert tech is not None
    assert float(tech.average_rating) == 5.00

    dup = await client.post(
        f"/v1/bookings/{booking_id}/rating",
        json={"rating": 4, "email": "done@example.com"},
    )
    assert dup.status_code == 409

    wall = await client.get("/v1/technicians/2/ratings")
    assert wall.status_code == 200
    assert wall.json()["average_rating"] == 5.0
    assert wall.json()["total"] == 1
    item = wall.json()["items"][0]
    assert item["rating"] == 5
    assert item["review_text"] == "Great work"
    assert "customer_id" not in item
    assert "booking_id" not in item

    subject["value"] = str(ADMIN_UUID)
    delete = await client.delete(
        f"/v1/admin/ratings/{response.json()['id']}", headers=_admin_headers()
    )
    assert delete.status_code == 204
    session.expire_all()
    tech = await session.get(User, 2)
    assert tech is not None
    assert float(tech.average_rating) == 0.00


async def test_notification_center(
    pg4: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg4
    session.add(
        Notification(user_id=1, type="booking_submitted", title="T", message="M")
    )
    await session.commit()
    subject["value"] = str(ADMIN_UUID)
    headers = {"Authorization": "Bearer admin-token"}
    listing = await client.get("/v1/notifications/me", headers=headers)
    assert listing.status_code == 200
    assert listing.json()["total"] >= 1
    assert listing.json()["unread_count"] >= 1
    first_id = listing.json()["items"][0]["id"]
    read = await client.patch(f"/v1/notifications/{first_id}/read", headers=headers)
    assert read.status_code == 200
    assert read.json()["is_read"] is True
    all_read = await client.post("/v1/notifications/read-all", headers=headers)
    assert all_read.status_code == 200
    relist = await client.get("/v1/notifications/me", headers=headers)
    assert relist.json()["unread_count"] == 0


async def test_inventory_adjust_guards(
    pg4: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg4
    subject["value"] = str(ADMIN_UUID)
    created = await client.post(
        "/v1/admin/inventory",
        json={"sku": "KJAC-PART-1", "item_type": "replacement_part",
              "name": "Capacitor", "quantity": 0, "unit_cost": 250},
        headers=_admin_headers(),
    )
    assert created.status_code == 201, created.text
    item_id = created.json()["id"]

    up = await client.post(
        f"/v1/admin/inventory/{item_id}/adjust",
        json={"movement_type": "stock_in", "quantity": 10, "reason": "PO-1"},
        headers=_admin_headers(),
    )
    assert up.status_code == 201
    assert up.json()["previous_quantity"] == 0
    assert up.json()["new_quantity"] == 10

    over = await client.post(
        f"/v1/admin/inventory/{item_id}/adjust",
        json={"movement_type": "stock_out", "quantity": -11, "reason": "x"},
        headers=_admin_headers(),
    )
    assert over.status_code == 409

    down = await client.post(
        f"/v1/admin/inventory/{item_id}/adjust",
        json={"movement_type": "stock_out", "quantity": -4, "reason": "job"},
        headers=_admin_headers(),
    )
    assert down.status_code == 201

    low = await client.get(
        "/v1/admin/inventory", params={"low_stock": "true"}, headers=_admin_headers()
    )
    assert low.status_code == 200
    assert any(i["id"] == item_id for i in low.json()["items"])

    alerts = await session.execute(
        select(Notification).where(Notification.type == "low_stock_alert",
                                   Notification.user_id == 1)
    )
    assert alerts.scalars().first() is not None

    moves = await client.get(
        "/v1/admin/inventory/movements/list",
        params={"item_id": item_id}, headers=_admin_headers(),
    )
    assert moves.json()["total"] == 2


async def test_payroll_commission_and_flow(
    pg4: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg4
    await _completed_booking(session)
    subject["value"] = str(ADMIN_UUID)
    today = datetime.now(UTC).date()
    start = (today - timedelta(days=7)).isoformat()
    end = today.isoformat()
    generated = await client.post(
        "/v1/admin/payroll/generate",
        json={"employee_user_id": 2, "period_start_date": start,
              "period_end_date": end, "payment_date": end,
              "base_salary": 10000, "tax_withheld": 1000},
        headers=_admin_headers(),
    )
    assert generated.status_code == 201, generated.text
    body = generated.json()
    assert body["commission"] == 150.0  # 10% of 1500
    assert body["total_earnings"] == 10150.0
    assert body["total_deductions"] == 1000.0
    assert body["net_pay"] == 9150.0
    payroll_id = body["id"]

    dup = await client.post(
        "/v1/admin/payroll/generate",
        json={"employee_user_id": 2, "period_start_date": start,
              "period_end_date": end, "payment_date": end},
        headers=_admin_headers(),
    )
    assert dup.status_code == 409

    pay_early = await client.patch(
        f"/v1/admin/payroll/{payroll_id}",
        json={"action": "pay", "payment_method": "gcash"},
        headers=_admin_headers(),
    )
    assert pay_early.status_code == 409  # must approve first

    approved = await client.patch(
        f"/v1/admin/payroll/{payroll_id}", json={"action": "approve"},
        headers=_admin_headers(),
    )
    assert approved.json()["status"] == "approved"

    paid = await client.patch(
        f"/v1/admin/payroll/{payroll_id}",
        json={"action": "pay", "payment_method": "gcash"},
        headers=_admin_headers(),
    )
    assert paid.json()["status"] == "paid"

    subject["value"] = str(TECH_UUID)
    mine = await client.get("/v1/payroll/me", headers=_tech_headers())
    assert mine.status_code == 200
    assert mine.json()["total"] == 1


async def test_admin_user_approval(
    pg4: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg4
    pending = User(uuid=uuid.uuid4(), first_name="Pen", last_name="Ding",
                   email="pending@example.com", phone="09170004444",
                   role="technician", status="pending_approval")
    session.add(pending)
    # Phase 5 hard block: approval needs a used invite for the email.
    session.add(
        TechnicianInvite(email="pending@example.com", token_hash="test-hash",
                         expires_at=datetime.now(UTC) + timedelta(days=1),
                         used_at=datetime.now(UTC))
    )
    await session.commit()
    pending_id = pending.id
    subject["value"] = str(ADMIN_UUID)

    listing = await client.get(
        "/v1/admin/users", params={"status": "pending_approval"},
        headers=_admin_headers(),
    )
    assert listing.status_code == 200
    assert any(u["id"] == pending_id for u in listing.json()["items"])

    approved = await client.patch(
        f"/v1/admin/users/{pending_id}/approval", json={"action": "approve"},
        headers=_admin_headers(),
    )
    assert approved.json()["status"] == "active"

    suspended = await client.patch(
        "/v1/admin/users/2/status", json={"status": "suspended"},
        headers=_admin_headers(),
    )
    assert suspended.json()["status"] == "suspended"

    protect = await client.patch(
        "/v1/admin/users/1/status", json={"status": "suspended"},
        headers=_admin_headers(),
    )
    assert protect.status_code == 403


async def test_reports(
    pg4: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg4
    booking = await _completed_booking(session, email="rep@example.com")
    assert isinstance(booking, int)
    from app.models.financial import Payment

    session.add(
        Payment(booking_id=booking, customer_id=3, payment_type="down_payment",
                amount=500, payment_method="gcash",
                gcash_reference_number="GC-REP-1", status="verified")
    )
    await session.commit()
    subject["value"] = str(ADMIN_UUID)
    today = datetime.now(UTC).date().isoformat()
    start = (datetime.now(UTC).date() - timedelta(days=30)).isoformat()

    as_json = await client.get(
        "/v1/admin/reports/bookings",
        params={"date_from": start, "date_to": today}, headers=_admin_headers(),
    )
    assert as_json.status_code == 200
    assert as_json.json()["total"] >= 1

    as_csv = await client.get(
        "/v1/admin/reports/bookings",
        params={"date_from": start, "date_to": today, "format": "csv"},
        headers=_admin_headers(),
    )
    assert as_csv.status_code == 200
    assert as_csv.headers["content-type"].startswith("text/csv")
    assert as_csv.text.splitlines()[0].startswith("reference_id,")

    revenue = await client.get(
        "/v1/admin/reports/revenue",
        params={"date_from": start, "date_to": today}, headers=_admin_headers(),
    )
    assert revenue.status_code == 200
    assert revenue.json()["grand_total"] >= 500.0
    assert any(s["service"] == "General Cleaning"
               for s in revenue.json()["by_service"])
