"""Phase 5 tests: invites, sync/profile+gate, catalog, settings, analytics."""

import os
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
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.api.v1.endpoints.tech_invites as invite_endpoints
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
from app.models.bookings import Booking
from app.models.catalog import AirconBrand, Service
from app.models.comms import Notification
from app.models.system import SystemSetting
from app.models.tech_invite import TechnicianInvite
from app.models.users import User

TEST_DB_URL = "postgresql+asyncpg://postgres:kjac-test@localhost:5433/kjac_test"
ADMIN_DSN = "dbname=postgres user=postgres password=kjac-test host=localhost port=5433"

ADMIN_UUID = uuid.uuid4()
CUSTOMER_UUID = uuid.uuid4()
NEW_UUID = uuid.uuid4()

BACKEND_DIR = Path(__file__).resolve().parent.parent
TRUNCATE_TABLES = (
    "technician_invites, reschedule_requests, booking_inventory_usage,"
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

    def send_technician_invite(self, to: str, link: str) -> bool:
        self.sent.append((to, "invite", link))
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
                   cwd=BACKEND_DIR, env=env, check=False, capture_output=True)
    subprocess.run(["python", "-m", "alembic", "upgrade", "head"],
                   cwd=BACKEND_DIR, env=env, check=True, capture_output=True)


@pytest_asyncio.fixture
async def pg5(
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
                User(uuid=ADMIN_UUID, first_name="Ada", last_name="Min",
                     email="ada@example.com", phone="09170001111",
                     role="owner", status="active", email_verified_at=datetime.now(UTC)),
                User(uuid=CUSTOMER_UUID, first_name="Cid", last_name="Cus",
                     email="cid@example.com", phone="09170002222",
                     role="customer", status="active", email_verified_at=datetime.now(UTC)),
                Service(name="General Cleaning", slug="general-cleaning",
                        description="clean", base_price=1500,
                        down_payment_amount=500, down_payment_type="fixed",
                        estimated_duration_minutes=90, is_active=True),
                AirconBrand(name="Daikin", slug="daikin", is_active=True),
                SystemSetting(setting_key="booking_expiration_hours", setting_value="3",
                              data_type="integer", category="booking",
                              description="Hours until booking expires without payment"),
                SystemSetting(setting_key="allow_sunday_bookings", setting_value="false",
                              data_type="boolean", category="booking",
                              description="Allow Sunday bookings"),
            ]
        )
        await session.commit()

        app = create_app()
        subject = {"uuid": str(ADMIN_UUID), "email": "ada@example.com"}

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
        real_mailer = invite_endpoints.get_email_service
        invite_endpoints.get_email_service = lambda: mailer  # type: ignore[assignment]
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                client.mailer = mailer  # type: ignore[attr-defined]
                yield client, subject, session
        finally:
            invite_endpoints.get_email_service = real_mailer
    await engine.dispose()


def _admin_headers() -> dict[str, str]:
    return {"Authorization": "Bearer admin-token",
            "X-Admin-2FA": create_two_fa_ticket(str(ADMIN_UUID))}


def _mailer(client: AsyncClient) -> FakeMailer:
    return client.mailer  # type: ignore[attr-defined]


async def _invite(client: AsyncClient, email: str = "tech5@example.com") -> dict:
    response = await client.post(
        "/v1/admin/tech-invites", json={"email": email}, headers=_admin_headers()
    )
    assert response.status_code == 201, response.text
    return response.json()


def _token_from_link(link: str) -> str:
    return link.split("token=")[1]


async def test_invite_send_and_guards(pg5: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, _, _ = pg5
    created = await _invite(client)
    assert created["email"] == "tech5@example.com"
    assert _mailer(client).sent, "invite email sent"

    dup = await client.post(
        "/v1/admin/tech-invites", json={"email": "tech5@example.com"},
        headers=_admin_headers(),
    )
    assert dup.status_code == 409

    taken = await client.post(
        "/v1/admin/tech-invites", json={"email": "ada@example.com"},
        headers=_admin_headers(),
    )
    assert taken.status_code == 409

    listing = await client.get("/v1/admin/tech-invites", headers=_admin_headers())
    assert listing.status_code == 200
    assert any(i["email"] == "tech5@example.com" for i in listing.json())


async def test_accept_full_cycle(pg5: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, subject, session = pg5
    await _invite(client)
    token = _token_from_link(_mailer(client).last_link())
    form = {
        "token": token, "first_name": "Pedro", "last_name": "Santos",
        "email": "tech5@example.com", "phone": "09171234567",
        "street_address": "123 Narra St", "landmark": "Near church",
    }
    accepted = await client.post("/v1/auth/technician/accept", json=form)
    assert accepted.status_code == 201, accepted.text
    assert accepted.json()["status"] == "pending_approval"
    tech_id = accepted.json()["id"]

    reuse = await client.post("/v1/auth/technician/accept", json=form)
    assert reuse.status_code == 400

    stored = await session.get(User, tech_id)
    assert stored is not None
    assert stored.status == "pending_approval"
    assert stored.uuid is None  # linked at first sync
    session.expire_all()

    notes = await session.execute(
        select(Notification).where(
            Notification.type == "technician_pending_approval",
            Notification.user_id == 1,
        )
    )
    assert notes.scalars().first() is not None

    subject["uuid"], subject["email"] = str(ADMIN_UUID), "ada@example.com"
    approved = await client.patch(
        f"/v1/admin/users/{tech_id}/approval", json={"action": "approve"},
        headers=_admin_headers(),
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "active"


async def test_accept_rejects_mismatch_and_expiry(
    pg5: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, _, session = pg5
    await _invite(client, email="mismatch@example.com")
    token = _token_from_link(_mailer(client).last_link())
    wrong = await client.post(
        "/v1/auth/technician/accept",
        json={"token": token, "first_name": "X", "last_name": "Y",
              "email": "other@example.com", "phone": "09171234567"},
    )
    assert wrong.status_code == 400

    await _invite(client, email="stale@example.com")
    stale_token = _token_from_link(_mailer(client).last_link())
    result = await session.execute(
        select(TechnicianInvite).where(TechnicianInvite.email == "stale@example.com")
    )
    row = result.scalar_one()
    row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await session.commit()
    stale = await client.post(
        "/v1/auth/technician/accept",
        json={"token": stale_token, "first_name": "X", "last_name": "Y",
              "email": "stale@example.com", "phone": "09171234567"},
    )
    assert stale.status_code == 400


async def test_approval_blocked_without_invite(
    pg5: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg5
    outsider = User(first_name="Out", last_name="Side", email="out@example.com",
                    phone="09170004444", role="technician", status="pending_approval")
    session.add(outsider)
    await session.commit()
    outsider_id = outsider.id
    subject["uuid"], subject["email"] = str(ADMIN_UUID), "ada@example.com"

    blocked = await client.patch(
        f"/v1/admin/users/{outsider_id}/approval", json={"action": "approve"},
        headers=_admin_headers(),
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "AUTH_007"

    denied = await client.patch(
        f"/v1/admin/users/{outsider_id}/approval", json={"action": "deny"},
        headers=_admin_headers(),
    )
    assert denied.status_code == 200
    assert denied.json()["status"] == "inactive"


async def test_resend_and_revoke(pg5: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, _, _session = pg5
    created = await _invite(client, email="rere@example.com")
    invite_id = created["id"]
    first_link = _mailer(client).last_link()

    resent = await client.post(
        f"/v1/admin/tech-invites/{invite_id}/resend", headers=_admin_headers()
    )
    assert resent.status_code == 200
    old_token = _token_from_link(first_link)
    rotated = await client.post(
        "/v1/auth/technician/accept",
        json={"token": old_token, "first_name": "X", "last_name": "Y",
              "email": "rere@example.com", "phone": "09171234567"},
    )
    assert rotated.status_code == 400  # rotation killed the old token

    revoked = await client.post(
        f"/v1/admin/tech-invites/{invite_id}/revoke", headers=_admin_headers()
    )
    assert revoked.status_code == 200

    new_token = _token_from_link(_mailer(client).last_link())
    dead = await client.post(
        "/v1/auth/technician/accept",
        json={"token": new_token, "first_name": "X", "last_name": "Y",
              "email": "rere@example.com", "phone": "09171234567"},
    )
    assert dead.status_code == 400  # revoked


async def test_sync_and_profile_gate(pg5: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, subject, _session = pg5
    subject["uuid"], subject["email"] = str(NEW_UUID), "newbie@example.com"

    first = await client.post(
        "/v1/auth/sync",
        json={"first_name": "New", "last_name": "Bie", "phone": "09171112222"},
        headers={"Authorization": "Bearer new"},
    )
    assert first.status_code == 200, first.text
    assert first.json()["created"] is True
    assert first.json()["profile_complete"] is False

    again = await client.post(
        "/v1/auth/sync",
        json={"first_name": "New", "last_name": "Bie", "phone": "09171112222"},
        headers={"Authorization": "Bearer new"},
    )
    assert again.json()["created"] is False

    # Booking blocked until address complete (PROFILE_INCOMPLETE gate).
    day = datetime.now(UTC).date() + timedelta(days=2)
    if day.weekday() == 6:
        day += timedelta(days=1)
    blocked = await client.post(
        "/v1/bookings",
        json={"customer_first_name": "New", "customer_last_name": "Bie",
              "customer_email": "newbie@example.com", "customer_phone": "09171112222",
              "region_code": "04", "province_code": "0434", "city_municipality_code": "043415",
              "barangay_code": "043415001", "street_address": "123 Main St", "landmark": "Lm",
              "service_id": 1, "brand_id": 1,
              "preferred_date": day.isoformat(), "preferred_time": "10:00"},
        headers={"Authorization": "Bearer new"},
    )
    assert blocked.status_code == 422
    assert blocked.json()["error"]["code"] == "PROFILE_INCOMPLETE"

    updated = await client.patch(
        "/v1/users/me",
        json={"region_code": "04", "province_code": "0434",
              "city_municipality_code": "043415", "barangay_code": "043415001",
              "street_address": "123 Main St", "landmark": "Lm"},
        headers={"Authorization": "Bearer new"},
    )
    assert updated.status_code == 200
    assert updated.json()["profile_complete"] is True

    allowed = await client.post(
        "/v1/bookings",
        json={"customer_first_name": "New", "customer_last_name": "Bie",
              "customer_email": "newbie@example.com", "customer_phone": "09171112222",
              "region_code": "04", "province_code": "0434", "city_municipality_code": "043415",
              "barangay_code": "043415001", "street_address": "123 Main St", "landmark": "Lm",
              "service_id": 1, "brand_id": 1,
              "preferred_date": day.isoformat(), "preferred_time": "10:00"},
        headers={"Authorization": "Bearer new"},
    )
    assert allowed.status_code == 201, allowed.text

    bad_phone = await client.patch(
        "/v1/users/me", json={"phone": "123"},
        headers={"Authorization": "Bearer new"},
    )
    assert bad_phone.status_code == 422


async def test_sync_links_invite_row(pg5: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, subject, session = pg5
    await _invite(client, email="linkme@example.com")
    token = _token_from_link(_mailer(client).last_link())
    accepted = await client.post(
        "/v1/auth/technician/accept",
        json={"token": token, "first_name": "Link", "last_name": "Me",
              "email": "linkme@example.com", "phone": "09173334444"},
    )
    assert accepted.status_code == 201

    tech_uuid = uuid.uuid4()
    subject["uuid"], subject["email"] = str(tech_uuid), "linkme@example.com"
    synced = await client.post(
        "/v1/auth/sync",
        json={"first_name": "Link", "last_name": "Me", "phone": "09173334444"},
        headers={"Authorization": "Bearer tech"},
    )
    assert synced.status_code == 200
    assert synced.json()["created"] is False
    assert synced.json()["role"] == "technician"
    stored = await session.get(User, accepted.json()["id"])
    assert stored is not None
    session.expire_all()
    stored = await session.get(User, accepted.json()["id"])
    assert stored is not None
    assert str(stored.uuid) == str(tech_uuid)


async def test_catalog_crud(pg5: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, subject, _ = pg5
    public = await client.get("/v1/services")
    assert public.status_code == 200
    assert len(public.json()) == 1
    assert public.json()[0]["estimated_duration_display"] == "1-2 hours"

    detail = await client.get("/v1/services/1")
    assert detail.status_code == 200
    assert detail.json()["slug"] == "general-cleaning"

    subject["uuid"], subject["email"] = str(ADMIN_UUID), "ada@example.com"
    created = await client.post(
        "/v1/admin/services",
        json={"name": "Repair", "slug": "repair", "description": "fix",
              "base_price": 2500, "down_payment_amount": 800},
        headers=_admin_headers(),
    )
    assert created.status_code == 201, created.text

    clash = await client.post(
        "/v1/admin/services",
        json={"name": "Dup", "slug": "repair", "description": "x",
              "base_price": 1, "down_payment_amount": 1},
        headers=_admin_headers(),
    )
    assert clash.status_code == 409

    updated = await client.patch(
        f"/v1/admin/services/{created.json()['id']}",
        json={"is_active": False}, headers=_admin_headers(),
    )
    assert updated.status_code == 200

    visible = await client.get("/v1/services")
    assert all(s["slug"] != "repair" for s in visible.json())

    missing = await client.get("/v1/services/999")
    assert missing.status_code == 404

    brand = await client.get("/v1/brands/1")
    assert brand.status_code == 200
    assert brand.json()["name"] == "Daikin"

    new_brand = await client.post(
        "/v1/admin/brands",
        json={"name": "Kolde", "slug": "kolde"}, headers=_admin_headers(),
    )
    assert new_brand.status_code == 201
    gone = await client.delete(
        f"/v1/admin/brands/{new_brand.json()['id']}", headers=_admin_headers()
    )
    assert gone.status_code == 204
    assert (await client.get(f"/v1/brands/{new_brand.json()['id']}")).status_code == 404


async def test_settings_coercion_and_locks(
    pg5: tuple[AsyncClient, dict, AsyncSession]
) -> None:
    client, subject, session = pg5
    subject["uuid"], subject["email"] = str(ADMIN_UUID), "ada@example.com"

    listing = await client.get("/v1/admin/settings", headers=_admin_headers())
    assert listing.status_code == 200
    assert any(s["setting_key"] == "booking_expiration_hours" for s in listing.json())

    ok = await client.patch(
        "/v1/admin/settings/booking_expiration_hours",
        json={"setting_value": "5"}, headers=_admin_headers(),
    )
    assert ok.status_code == 200
    assert ok.json()["setting_value"] == "5"

    bad = await client.patch(
        "/v1/admin/settings/booking_expiration_hours",
        json={"setting_value": "abc"}, headers=_admin_headers(),
    )
    assert bad.status_code == 422

    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.setting_key == "booking_expiration_hours"
        )
    )
    row = result.scalar_one()
    row.is_editable = False
    await session.commit()

    locked = await client.patch(
        "/v1/admin/settings/booking_expiration_hours",
        json={"setting_value": "6"}, headers=_admin_headers(),
    )
    assert locked.status_code == 403

    missing = await client.patch(
        "/v1/admin/settings/nope", json={"setting_value": "1"},
        headers=_admin_headers(),
    )
    assert missing.status_code == 404


async def test_analytics_dashboard(pg5: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, subject, session = pg5
    from app.utils.reference_id import generate_reference_id

    booking = Booking(
        reference_id=generate_reference_id(), customer_id=2, technician_id=None,
        service_id=1, brand_id=1, customer_first_name="A", customer_last_name="B",
        customer_email="cid@example.com", customer_phone="09170002222",
        street_address="St", landmark="Lm",
        preferred_date=datetime.now(UTC).date(),
        preferred_time=datetime.now(UTC).time().replace(microsecond=0),
        down_payment_amount=500, total_service_cost=1500, status="submitted",
    )
    session.add(booking)
    await session.commit()

    subject["value"] = str(ADMIN_UUID)
    subject["email"] = "ada@example.com"
    response = await client.get(
        "/v1/admin/analytics/dashboard", headers=_admin_headers()
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["today"]["appointments"] >= 1
    assert len(body["charts"]["revenue_by_month"]) == 12
    assert len(body["charts"]["customer_growth"]) == 6
    assert any(p["service"] == "General Cleaning"
               for p in body["charts"]["bookings_by_service"])


async def test_public_landing_content(pg5: tuple[AsyncClient, dict, AsyncSession]) -> None:
    client, _, session = pg5
    session.add_all(
        [
            SystemSetting(setting_key="hero_title",
                          setting_value="KLEIN & JUSTIN AIRCONDITIONING",
                          data_type="string", category="landing",
                          description="Landing hero business name (H1)"),
            SystemSetting(setting_key="announcement_enabled", setting_value="false",
                          data_type="boolean", category="landing",
                          description="Show the announcement band"),
            SystemSetting(setting_key="faq_items", setting_value="[]",
                          data_type="json", category="landing",
                          description="FAQ entries"),
            SystemSetting(setting_key="mission_text", setting_value="",
                          data_type="string", category="landing",
                          description="Mission section text"),
        ]
    )
    await session.commit()
    response = await client.get("/v1/content/landing")
    assert response.status_code == 200, response.text
    rows = {r["setting_key"]: r for r in response.json()}
    assert rows["hero_title"]["setting_value"] == "KLEIN & JUSTIN AIRCONDITIONING"
    assert rows["announcement_enabled"]["data_type"] == "boolean"
    assert rows["faq_items"]["data_type"] == "json"
    assert rows["mission_text"]["category"] == "landing"
    # admin-only surface untouched: full list still requires admin 2FA
    denied = await client.get("/v1/admin/settings")
    assert denied.status_code in (401, 403)
