"""Centralized settings via pydantic-settings (see fastapi-patterns skill).

All secrets come from environment — never commit .env (R4).
"""

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "KJAC API"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/kjac_db"

    # Supabase Auth — sole auth source (CONTRACTS.md C1). No local password storage.
    # New dashboard names accepted first; legacy anon/service_role names still work.
    supabase_url: str = "https://PROJECT.supabase.co"
    supabase_publishable_key: str = Field(
        default="change-me",
        validation_alias=AliasChoices("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"),
    )
    supabase_secret_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_KEY"),
    )
    supabase_jwks_url: str = "https://PROJECT.supabase.co/auth/v1/.well-known/jwks.json"
    supabase_jwt_audience: str = "authenticated"

    # Email-code 2FA (CONTRACTS.md C2)
    two_fa_code_ttl_minutes: int = 10
    two_fa_resend_cooldown_seconds: int = 60
    two_fa_max_attempts: int = 5
    two_fa_ticket_ttl_hours: int = 12

    # Signs admin 2FA tickets (HS256). REQUIRED in production — never commit.
    secret_key: str = "dev-only-change-me"

    # Outbound email (2FA codes, receipts). Empty user = unauthenticated relay.
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "KJAC <noreply@kjac-system.com>"
    smtp_use_tls: bool = False

    # Rate limits (CONTRACTS.md)
    login_max_attempts: int = 5
    login_lockout_minutes: int = 15
    booking_rate_limit_count: int = 3
    booking_rate_limit_minutes: int = 30

    # Web booking CAPTCHA. Empty = dev bypass (accept + warn, never in prod).
    turnstile_secret: str = ""

    # Uploads: local dir (dev) or supabase storage (prod, needs secret key).
    storage_backend: str = "local"
    storage_dir: str = "storage"
    max_upload_mb: int = 3

    # PSGC address proxy (Phase 3): upstream + TTL cache + DB upsert.
    psgc_base_url: str = "https://psgc.cloud/api"
    psgc_cache_ttl_seconds: int = 86400

    # Public web base URL for emailed links (technician invites, Phase 5).
    public_app_url: str = "http://localhost:5173"

    # First-owner bootstrap: when NO active owner exists yet, a sync whose
    # email matches becomes the owner. One-time, self-closing. Unset = off.
    bootstrap_owner_email: str = ""

    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    allowed_methods: list[str] = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    allowed_headers: list[str] = ["Authorization", "Content-Type", "X-Admin-2FA"]
    allow_credentials: bool = True


settings = Settings()
