"""Rate limiting via slowapi (in-memory store).

Keys: authenticated callers are keyed by a hash of their Authorization header
(≈ per user/token), everyone else by IP. Tiers from settings:
public 100/min, authenticated 300/min, admin 500/min — applied per-endpoint.

Scale note: in-memory state does not span instances; swap
`limiter._storage` for a Redis backend (slowapi supports it) when running
more than one API replica.
"""

import hashlib

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def rate_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth:
        digest = hashlib.sha256(auth.encode()).hexdigest()[:16]
        return f"user:{digest}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=rate_key)



def conditional_limit(limit_string: str):
    """Decorator that conditionally applies rate limiting based on config.
    
    If ENDPOINT_RATE_LIMIT_ENABLED is False, this returns a no-op decorator.
    Otherwise, applies the slowapi limiter with the given limit string.
    
    Usage:
        @conditional_limit("10/minute")
        async def my_endpoint(...):
            ...
    """
    from app.core.config import settings
    
    def decorator(func):
        if settings.endpoint_rate_limit_enabled:
            # Apply the rate limiter
            return limiter.limit(limit_string)(func)
        else:
            # Return function unchanged (no-op)
            return func
    
    return decorator
