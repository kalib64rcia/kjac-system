"""Auth: verify Supabase Auth JWTs only (CONTRACTS.md C1).

No local password hashing, no custom reset tokens. Admin 2FA is a short-lived
email code layered on top of a verified Supabase session (CONTRACTS.md C2) —
implemented in Phase 2; this module provides the verified-identity dependency.
"""

from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

_bearer = HTTPBearer(auto_error=False)
_jwks_cache: dict[str, Any] = {}


async def _get_signing_key(token: str) -> str:
    """Resolve the JWT signing key via Supabase JWKS (cached by kid)."""
    try:
        kid = jwt.get_unverified_header(token).get("kid", "default")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    if kid in _jwks_cache:
        return _jwks_cache[kid]
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(settings.supabase_jwks_url)
        response.raise_for_status()
        jwks = response.json()
    keys = jwks.get("keys", []) if isinstance(jwks, dict) else []
    if not keys:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth keys unavailable")
    key = next((k for k in keys if k.get("kid") == kid), keys[0])
    # python-jose accepts the JWK dict for RSA verification.
    _jwks_cache[kid] = key
    return key


async def get_current_subject(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Return the Supabase user id (sub) for a valid Bearer token."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    try:
        key = await _get_signing_key(token)
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256", "ES256", "HS256"],
            audience=settings.supabase_jwt_audience,
            options={"verify_aud": bool(settings.supabase_jwt_audience)},
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return str(subject)


CurrentSubject = Annotated[str, Depends(get_current_subject)]


async def get_current_email(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Verified email claim from the Supabase JWT (for profile sync)."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        key = await _get_signing_key(credentials.credentials)
        payload = jwt.decode(
            credentials.credentials,
            key,
            algorithms=["RS256", "ES256", "HS256"],
            audience=settings.supabase_jwt_audience,
            options={"verify_aud": bool(settings.supabase_jwt_audience)},
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No email claim")
    return str(email)


CurrentEmail = Annotated[str, Depends(get_current_email)]

TWO_FA_PURPOSE = "admin-2fa"


def create_two_fa_ticket(subject: str) -> str:
    """Short-lived ticket proving an admin passed email-code 2FA.

    Stateless (HS256 with app secret, 12h). Clients send it as X-Admin-2FA
    on admin endpoints; require_admin_2fa verifies it (api/deps.py).
    """
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": subject,
            "purpose": TWO_FA_PURPOSE,
            "iat": now,
            "exp": now + timedelta(hours=settings.two_fa_ticket_ttl_hours),
        },
        settings.secret_key,
        algorithm="HS256",
    )


def verify_two_fa_ticket(ticket: str) -> str:
    """Return the subject of a valid 2FA ticket or raise 401/403."""
    try:
        payload = jwt.decode(ticket, settings.secret_key, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA ticket"
        ) from exc
    if payload.get("purpose") != TWO_FA_PURPOSE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Wrong token purpose"
        )
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA ticket"
        )
    return str(subject)
