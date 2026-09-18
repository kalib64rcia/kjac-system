"""Async SQLAlchemy engine/session (see fastapi-patterns skill).

Lifespan in main.py disposes the engine on shutdown.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    # Fail fast instead of hanging a request: connect timeout per attempt,
    # cap on waiting for a pooled connection, recycle stale server-side drops.
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=300,
    connect_args={"timeout": 10, "command_timeout": 30},
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            try:
                await session.rollback()
            except Exception:
                pass
            raise
        finally:
            # Never leak one request's audit identity to the next pool checkout.
            # Best-effort: must never mask the real request error (e.g. when
            # the DB itself is unreachable, this RESET would raise TimeoutError
            # during teardown and hide the original exception).
            try:
                await session.execute(text("RESET app.current_user_uuid"))
            except Exception:
                try:
                    await session.rollback()
                except Exception:
                    pass
