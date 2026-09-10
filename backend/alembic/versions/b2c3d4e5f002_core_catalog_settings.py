"""Core tables: users, sessions, 2FA codes, PSGC, catalog, settings.

CONTRACTS.md adaptations vs DATABASE_TABLES.md:
- users: NO password_hash / remember_token / two_factor_secret (Supabase Auth
  only, C1); phone VARCHAR(25); two_factor_enabled = email-code flag (C2)
- new admin_two_fa_codes table for email-code 2FA (C2)
"""

revision = "b2c3d4e5f002"
down_revision = "a1b2c3d4e001"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


def _ts(name: str = "created_at", nullable: bool = False) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=nullable,
                     server_default=sa.text("NOW()"))


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), unique=True, nullable=False,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("middle_name", sa.String(100)),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("phone", sa.String(25), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True)),
        sa.Column("phone_verified_at", sa.DateTime(timezone=True)),
        sa.Column("role", sa.String(20), nullable=False, server_default="customer"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("profile_picture_url", sa.Text),
        sa.Column("date_of_birth", sa.Date),
        sa.Column("region_code", sa.String(20)),
        sa.Column("province_code", sa.String(20)),
        sa.Column("city_municipality_code", sa.String(20)),
        sa.Column("barangay_code", sa.String(20)),
        sa.Column("street_address", sa.Text),
        sa.Column("landmark", sa.String(255)),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("total_jobs_completed", sa.Integer, server_default="0"),
        sa.Column("average_rating", sa.Numeric(3, 2), server_default="0.00"),
        sa.Column("two_factor_enabled", sa.Boolean, server_default=sa.false()),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("last_login_ip", sa.String(45)),
        _ts(),
        _ts("updated_at"),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("role IN ('admin', 'customer', 'technician')",
                           name="chk_users_role_valid"),
        sa.CheckConstraint(
            "status IN ('active', 'inactive', 'suspended', 'pending_approval')",
            name="chk_users_status_valid"),
        sa.CheckConstraint("average_rating >= 0 AND average_rating <= 5",
                           name="chk_users_rating_range"),
    )
    op.create_index("idx_users_uuid", "users", ["uuid"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_users_email", "users", ["email"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_users_phone", "users", ["phone"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_users_role", "users", ["role"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_users_status", "users", ["status"])

    # --- admin_two_fa_codes (email-code 2FA, CONTRACTS.md C2) ---
    op.create_table(
        "admin_two_fa_codes",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("code_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer, server_default="0"),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        _ts(),
    )
    op.create_index("idx_2fa_user_id", "admin_two_fa_codes", ["user_id"])

    # --- user_sessions ---
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("refresh_token", sa.String(500), unique=True, nullable=False),
        sa.Column("device_name", sa.String(100)),
        sa.Column("device_type", sa.String(20)),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text),
        sa.Column("fcm_token", sa.Text),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        _ts(),
        sa.CheckConstraint("device_type IN ('web', 'ios', 'android')",
                           name="chk_sessions_device_type"),
    )
    op.create_index("idx_sessions_user_id", "user_sessions", ["user_id"])
    op.create_index("idx_sessions_refresh_token", "user_sessions", ["refresh_token"])
    op.create_index("idx_sessions_expires_at", "user_sessions", ["expires_at"])

    # --- PSGC ---
    op.create_table(
        "psgc_regions",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("region_code", sa.String(20), unique=True, nullable=False),
        sa.Column("region_name", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        _ts(), _ts("updated_at"),
    )
    op.create_index("idx_regions_code", "psgc_regions", ["region_code"])
    op.create_table(
        "psgc_provinces",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("province_code", sa.String(20), unique=True, nullable=False),
        sa.Column("province_name", sa.String(100), nullable=False),
        sa.Column("region_code", sa.String(20),
                  sa.ForeignKey("psgc_regions.region_code", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        _ts(), _ts("updated_at"),
    )
    op.create_index("idx_provinces_code", "psgc_provinces", ["province_code"])
    op.create_index("idx_provinces_region", "psgc_provinces", ["region_code"])
    op.create_table(
        "psgc_cities_municipalities",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("city_municipality_code", sa.String(20), unique=True, nullable=False),
        sa.Column("city_municipality_name", sa.String(100), nullable=False),
        sa.Column("province_code", sa.String(20),
                  sa.ForeignKey("psgc_provinces.province_code", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("is_city", sa.Boolean, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        _ts(), _ts("updated_at"),
    )
    op.create_index("idx_cities_code", "psgc_cities_municipalities",
                    ["city_municipality_code"])
    op.create_index("idx_cities_province", "psgc_cities_municipalities", ["province_code"])
    op.create_table(
        "psgc_barangays",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("barangay_code", sa.String(20), unique=True, nullable=False),
        sa.Column("barangay_name", sa.String(100), nullable=False),
        sa.Column("city_municipality_code", sa.String(20),
                  sa.ForeignKey("psgc_cities_municipalities.city_municipality_code",
                                ondelete="CASCADE"), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        _ts(), _ts("updated_at"),
    )
    op.create_index("idx_barangays_code", "psgc_barangays", ["barangay_code"])
    op.create_index("idx_barangays_city", "psgc_barangays", ["city_municipality_code"])

    # --- services ---
    op.create_table(
        "services",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("detailed_description", sa.Text),
        sa.Column("base_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("down_payment_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("down_payment_type", sa.String(20), nullable=False,
                  server_default="fixed"),
        sa.Column("estimated_duration_minutes", sa.Integer),
        sa.Column("process_steps", postgresql.JSONB),
        sa.Column("icon_name", sa.String(50)),
        sa.Column("badge_text", sa.String(50)),
        sa.Column("badge_color", sa.String(20)),
        sa.Column("display_order", sa.Integer, server_default="0"),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        sa.Column("is_featured", sa.Boolean, server_default=sa.false()),
        _ts(), _ts("updated_at"),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("base_price >= 0", name="chk_services_base_price"),
        sa.CheckConstraint("down_payment_amount >= 0", name="chk_services_down_payment"),
        sa.CheckConstraint("down_payment_type IN ('fixed', 'percentage')",
                           name="chk_services_down_payment_type"),
    )
    op.create_index("idx_services_slug", "services", ["slug"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_services_is_active", "services", ["is_active"],
                    postgresql_where=sa.text("deleted_at IS NULL"))

    op.create_table(
        "service_images",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("service_id", sa.BigInteger,
                  sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_url", sa.Text, nullable=False),
        sa.Column("image_type", sa.String(20)),
        sa.Column("caption", sa.Text),
        sa.Column("display_order", sa.Integer, server_default="0"),
        _ts(),
        sa.CheckConstraint("image_type IN ('before', 'after', 'process', 'hero')",
                           name="chk_service_images_type"),
    )
    op.create_index("idx_service_images_service_id", "service_images",
                    ["service_id", "display_order"])

    # --- brands ---
    op.create_table(
        "aircon_brands",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("logo_url", sa.Text),
        sa.Column("is_partner", sa.Boolean, server_default=sa.false()),
        sa.Column("badge_text", sa.String(50)),
        sa.Column("badge_color", sa.String(20)),
        sa.Column("display_order", sa.Integer, server_default="0"),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        _ts(), _ts("updated_at"),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_index("idx_brands_slug", "aircon_brands", ["slug"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_brands_is_active", "aircon_brands", ["is_active"],
                    postgresql_where=sa.text("deleted_at IS NULL"))

    op.create_table(
        "brand_images",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.BigInteger,
                  sa.ForeignKey("aircon_brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_url", sa.Text, nullable=False),
        sa.Column("image_type", sa.String(20)),
        sa.Column("caption", sa.Text),
        sa.Column("display_order", sa.Integer, server_default="0"),
        _ts(),
        sa.CheckConstraint("image_type IN ('logo', 'product', 'banner')",
                           name="chk_brand_images_type"),
    )
    op.create_index("idx_brand_images_brand_id", "brand_images",
                    ["brand_id", "display_order"])

    # --- system_settings ---
    op.create_table(
        "system_settings",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("setting_key", sa.String(100), unique=True, nullable=False),
        sa.Column("setting_value", sa.Text, nullable=False),
        sa.Column("data_type", sa.String(20), nullable=False),
        sa.Column("category", sa.String(50)),
        sa.Column("description", sa.Text),
        sa.Column("is_editable", sa.Boolean, server_default=sa.true()),
        sa.Column("validation_rule", sa.Text),
        _ts(), _ts("updated_at"),
        sa.CheckConstraint("data_type IN ('string', 'integer', 'boolean', 'json')",
                           name="chk_settings_type_valid"),
    )
    op.create_index("idx_settings_key", "system_settings", ["setting_key"])
    op.create_index("idx_settings_category", "system_settings", ["category"])

    for table in ("users", "psgc_regions", "psgc_provinces",
                  "psgc_cities_municipalities", "psgc_barangays", "services",
                  "aircon_brands", "system_settings"):
        op.execute(
            f"CREATE TRIGGER update_{table}_updated_at BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()"
        )

    # RLS helpers (SECURITY DEFINER) — created here because they read the users
    # table. plpgsql (not LANGUAGE SQL) so Postgres does not validate the
    # Supabase-managed auth.uid() reference at CREATE time; on databases
    # without the auth schema they return NULL/FALSE instead of failing DDL.
    # They avoid per-row EXISTS(users) subselects and RLS recursion (R2).
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.current_app_user_id()
        RETURNS BIGINT AS $$
        DECLARE
            result BIGINT;
        BEGIN
            SELECT id INTO result FROM public.users WHERE uuid = auth.uid();
            RETURN result;
        EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql STABLE SECURITY DEFINER
        SET search_path = public;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.is_admin()
        RETURNS BOOLEAN AS $$
        DECLARE
            result BOOLEAN;
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM public.users
                WHERE uuid = auth.uid() AND role = 'admin'
            ) INTO result;
            RETURN result;
        EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
            RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql STABLE SECURITY DEFINER
        SET search_path = public;
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS public.is_admin()")
    op.execute("DROP FUNCTION IF EXISTS public.current_app_user_id()")
    for table in ("users", "psgc_regions", "psgc_provinces",
                  "psgc_cities_municipalities", "psgc_barangays", "services",
                  "aircon_brands", "system_settings"):
        op.execute(f"DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table}")
    for table in ("system_settings", "brand_images", "aircon_brands", "service_images",
                  "services", "psgc_barangays", "psgc_cities_municipalities",
                  "psgc_provinces", "psgc_regions", "user_sessions",
                  "admin_two_fa_codes", "users"):
        op.drop_table(table)
