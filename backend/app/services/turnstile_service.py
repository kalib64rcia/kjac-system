"""Cloudflare Turnstile verification for web bookings.

Empty TURNSTILE_SECRET = dev bypass (accept + warn). Production MUST set it;
mobile authed bookings skip CAPTCHA by design (authenticated users).
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: str | None, remote_ip: str | None = None) -> bool:
    if not settings.turnstile_secret:
        logger.warning("turnstile dev bypass active — set TURNSTILE_SECRET in prod")
        return True
    if not token:
        return False
    try:
        response = httpx.post(
            _VERIFY_URL,
            data={
                "secret": settings.turnstile_secret,
                "response": token,
                **({"remoteip": remote_ip} if remote_ip else {}),
            },
            timeout=10,
        )
        return bool(response.json().get("success", False))
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("turnstile verification failed: %s", exc)
        return False
