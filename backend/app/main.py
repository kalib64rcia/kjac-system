"""App factory + lifespan (fastapi-patterns skill).

Lifespan intentionally does NOT create tables: schemas are managed via
Alembic migrations (Phase 1). Health endpoint proves wiring.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.core.database import engine
from app.core.errors import register_error_handlers
from app.core.rate_limit import limiter


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)
    app.state.limiter = limiter
    register_error_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=settings.allow_credentials,
        allow_methods=settings.allowed_methods,
        allow_headers=settings.allowed_headers,
    )
    app.include_router(v1_router)
    return app


app = create_app()
