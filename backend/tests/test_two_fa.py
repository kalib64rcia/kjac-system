"""Phase 2 auth tests: 2FA flow, lockout, tickets, rate-limit envelope.

Needs a local Postgres (docker kjac-pg-test on :5433). RLS is not applied
here — policies were proven against real PG in Phase 1; these tests prove
service + endpoint behavior.
"""

import re
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import psycopg2
import pytest
import pytest_asyncio
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401 (register tables for metadata checks)
from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (
    TWO_FA_PURPOSE,
    create_two_fa_ticket,
    get_current_subject,
    verify_two_fa_ticket,
)
from app.main import create_app
from app.models.users import AdminTwoFaCode, User

TEST_DB_URL = "postgresql+asyncpg://postgres:kjac-test@localhost:5433/kjac_test"
ADMIN_DSN = "dbname=postgres user=postgres password=kjac-test host=localhost port=5433"

ADMIN_UUID = uuid.uuid4()
CUSTOMER_UUID = uuid.uuid4()


def _ensure_test_db() -> None:
    conn = psycopg2.connect(ADMIN_DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='kjac_test'")
    if cur.fetchone() is None:
        cur.execute("CREATE DATABASE kjac_test")
    conn.close()


class FakeMailer:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str, int]] = []

    def send(self, to: str, subject: str, body: str) -> bool:
        self.sent.append((to, subject, body))
        return True

    def send_two_fa_code(self, to: str, code: str, ttl_minutes: int) -> bool:
        self.sent.append((to, code, ttl_minutes))
        return True

    def last_code(self) -> str:
        match = re.search(r"(\d{6})", self.sent[-1][1])
        assert match is not None
        return match.group(1)


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    _ensure_test_db()
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        # Schema is owned by Alembic (test_bookings migrates it); here we only
        # need a clean users table, cascaded to dependent rows.
        await conn.execute(text("TRUNCATE users CASCADE"))
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        db.add(
            User(
                uuid=ADMIN_UUID,
                first_name="Ada",
                last_name="Min",
                email="ada@example.com",
                phone="09170001111",
                role="owner",
                status="active",
                email_verified_at=datetime.now(UTC),
            )
        )
        db.add(
            User(
                uuid=CUSTOMER_UUID,
                first_name="Cid",
                last_name="Cus",
                email="cid@example.com",
                phone="09170002222",
                role="customer",
                status="active",
                email_verified_at=datetime.now(UTC),
            )
        )
        await db.commit()
        yield db
    await engine.dispose()


@pytest_asyncio.fixture
async def authed_client(session: AsyncSession) -> AsyncIterator[tuple[AsyncClient, FakeMailer, dict]]:
    """Fresh app per test (isolated dependency overrides + limiter reset)."""
    try:
        limiter._storage.reset()  # type: ignore[attr-defined]
    except (AttributeError, NotImplementedError):
        pass
    app = create_app()
    mailer = FakeMailer()
    subject = {"value": str(ADMIN_UUID)}

    async def override_db() -> AsyncIterator[AsyncSession]:
        yield session

    async def override_subject() -> str:
        return subject["value"]

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_subject] = override_subject

    import app.api.v1.endpoints.auth as auth_module

    real_mailer = auth_module.get_email_service
    auth_module.get_email_service = lambda: mailer  # type: ignore[assignment]
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield client, mailer, subject
    finally:
        auth_module.get_email_service = real_mailer


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token"}


async def test_me_ok(authed_client: tuple[AsyncClient, FakeMailer, dict]) -> None:
    client, _, _ = authed_client
    response = await client.get("/v1/auth/me", headers=_auth_headers())
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "ada@example.com"
    assert body["role"] == "owner"
    assert "password" not in str(body).lower()


async def test_me_unauthenticated_returns_envelope() -> None:
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["success"] is False


async def test_request_code_admin(authed_client: tuple[AsyncClient, FakeMailer, dict]) -> None:
    client, mailer, _ = authed_client
    response = await client.post("/v1/auth/2fa/request", headers=_auth_headers())
    assert response.status_code == 202
    body = response.json()
    assert body["masked_email"] == "a***@example.com"
    assert body["expires_in_minutes"] == settings.two_fa_code_ttl_minutes
    assert len(mailer.sent) == 1
    assert re.fullmatch(r"\d{6}", mailer.last_code())


async def test_request_code_non_admin_forbidden(
    authed_client: tuple[AsyncClient, FakeMailer, dict], session: AsyncSession
) -> None:
    client, _, subject = authed_client
    subject["value"] = str(CUSTOMER_UUID)
    response = await client.post("/v1/auth/2fa/request", headers=_auth_headers())
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "PERM_001"


async def test_verify_success_returns_ticket(
    authed_client: tuple[AsyncClient, FakeMailer, dict], session: AsyncSession
) -> None:
    client, mailer, _ = authed_client
    await client.post("/v1/auth/2fa/request", headers=_auth_headers())
    response = await client.post(
        "/v1/auth/2fa/verify", json={"code": mailer.last_code()}, headers=_auth_headers()
    )
    assert response.status_code == 200
    ticket = response.json()["two_fa_token"]
    assert verify_two_fa_ticket(ticket) == str(ADMIN_UUID)

    # Single-use: same code rejected afterwards.
    again = await client.post(
        "/v1/auth/2fa/verify", json={"code": mailer.last_code()}, headers=_auth_headers()
    )
    assert again.status_code == 401


async def test_cooldown_on_immediate_re_request(
    authed_client: tuple[AsyncClient, FakeMailer, dict],
) -> None:
    client, _, _ = authed_client
    first = await client.post("/v1/auth/2fa/request", headers=_auth_headers())
    assert first.status_code == 202
    second = await client.post("/v1/auth/2fa/request", headers=_auth_headers())
    assert second.status_code == 429
    assert second.json()["error"]["code"] == "AUTH_006"


async def test_wrong_codes_lock_out(
    authed_client: tuple[AsyncClient, FakeMailer, dict],
) -> None:
    client, _, _ = authed_client
    await client.post("/v1/auth/2fa/request", headers=_auth_headers())
    for _ in range(settings.two_fa_max_attempts):
        response = await client.post(
            "/v1/auth/2fa/verify", json={"code": "000000"}, headers=_auth_headers()
        )
        assert response.status_code == 401
    locked = await client.post(
        "/v1/auth/2fa/verify", json={"code": "000000"}, headers=_auth_headers()
    )
    assert locked.status_code == 429
    assert locked.json()["error"]["code"] == "AUTH_002"


async def test_expired_code_rejected(
    authed_client: tuple[AsyncClient, FakeMailer, dict], session: AsyncSession
) -> None:
    client, mailer, _ = authed_client
    await client.post("/v1/auth/2fa/request", headers=_auth_headers())
    code = mailer.last_code()
    result = await session.execute(select(AdminTwoFaCode).order_by(AdminTwoFaCode.id.desc()))
    row = result.scalar_one()
    row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await session.commit()
    response = await client.post(
        "/v1/auth/2fa/verify", json={"code": code}, headers=_auth_headers()
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_004"


async def test_rate_limit_returns_envelope(
    authed_client: tuple[AsyncClient, FakeMailer, dict],
) -> None:
    client, _, _ = authed_client
    codes = []
    for _ in range(6):
        response = await client.post("/v1/auth/2fa/request", headers=_auth_headers())
        codes.append((response.status_code, response.json()))
    assert codes[0][0] == 202
    assert all(c[0] == 429 and c[1]["error"]["code"] == "AUTH_006" for c in codes[1:5])
    assert codes[5][0] == 429
    assert codes[5][1]["error"]["code"] == "RATE_001"
    assert codes[5][1]["success"] is False


async def test_validation_error_envelope(
    authed_client: tuple[AsyncClient, FakeMailer, dict],
) -> None:
    client, _, _ = authed_client
    response = await client.post(
        "/v1/auth/2fa/verify", json={"code": "abc"}, headers=_auth_headers()
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VAL_001"
    assert body["success"] is False


def test_ticket_round_trip() -> None:
    ticket = create_two_fa_ticket("some-subject")
    assert verify_two_fa_ticket(ticket) == "some-subject"


def test_ticket_wrong_purpose_rejected() -> None:
    bad = jwt.encode({"sub": "x", "purpose": "access"}, settings.secret_key, algorithm="HS256")
    with pytest.raises(HTTPException):
        verify_two_fa_ticket(bad)


def test_ticket_expiry_rejected() -> None:
    old_ttl = settings.two_fa_ticket_ttl_hours
    settings.two_fa_ticket_ttl_hours = -1
    try:
        ticket = create_two_fa_ticket("x")
    finally:
        settings.two_fa_ticket_ttl_hours = old_ttl
    with pytest.raises(HTTPException):
        verify_two_fa_ticket(ticket)


def test_purpose_constant() -> None:
    assert TWO_FA_PURPOSE == "admin-2fa"


async def test_get_current_user_none_for_unknown_subject(session: AsyncSession) -> None:
    assert await get_current_user(session, str(uuid.uuid4())) is None  # type: ignore[arg-type]
