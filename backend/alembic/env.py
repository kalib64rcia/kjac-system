"""Alembic environment — reads DATABASE_URL from settings."""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.core.config import settings
from app.core.database import Base

config = context.config
# Alembic runs synchronously: map the async app URL to the psycopg2 driver.
# asyncpg uses ?ssl=require while psycopg2 wants ?sslmode=require — translate
# it so staging/supabase URLs (which carry the flag) don't break the sync DSN.
_sync_url = settings.database_url.replace("+asyncpg", "+psycopg2")
_sync_url = _sync_url.replace("?ssl=require", "?sslmode=require").replace(
    "&ssl=require", "&sslmode=require"
)
config.set_main_option("sqlalchemy.url", _sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
