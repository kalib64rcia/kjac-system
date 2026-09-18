"""App factory + lifespan.

Lifespan intentionally does NOT create tables: schemas managed via Alembic.
"""
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.core.database import engine
from app.core.errors import register_error_handlers
from app.core.rate_limit import limiter


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Fail-fast reachability probe: a network-level outage (firewall/VPN
    # blocking 5432/6543, paused Supabase project) otherwise surfaces only
    # as every request hanging until pool/connect timeout. Log one clear
    # line here; boot continues so /health still answers.
    try:
        async with engine.connect():
            pass
        logger.info("database reachable")
    except Exception as exc:
        logger.error(
            "database unreachable at startup: %r — check DATABASE_URL "
            "(host/port, ?ssl=require), outbound TCP 5432/6543, and "
            "Supabase project status",
            exc,
        )
    yield
    await engine.dispose()


async def cors_response_middleware(request: Request, call_next) -> Response:
    """Add CORS headers to all responses, including errors and rate limit."""
    response = await call_next(request)
    origin = request.headers.get("origin", "")
    
    # Check if origin is allowed - be permissive for localhost development
    is_allowed = (
        origin in settings.allowed_origins or
        origin.startswith("http://localhost:") or  # Allow any localhost port
        origin == "schedule:1"  # Allow Vite internal origin
    )
    
    if is_allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = ", ".join(settings.allowed_methods)
        response.headers["Access-Control-Allow-Headers"] = ", ".join(settings.allowed_headers)
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "X-Total-Count, X-Page-Count"
    return response


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)
    
    # CORSMiddleware for preflight OPTIONS requests  
    # Allow any localhost origin for development
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^http://localhost:\d+$|^schedule:1$",
        allow_credentials=settings.allow_credentials,
        allow_methods=settings.allowed_methods,
        allow_headers=settings.allowed_headers,
        expose_headers=["X-Total-Count", "X-Page-Count"],
        max_age=600,
    )
    
    # Middleware to add CORS headers to all responses (errors, rate limits, etc)
    app.middleware("http")(cors_response_middleware)
    
    app.state.limiter = limiter
    register_error_handlers(app)
    app.include_router(v1_router)
    return app


app = create_app()
