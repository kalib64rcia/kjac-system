"""Booking tables + workflow triggers.

CONTRACTS.md adaptations:
- bookings.customer_id NULLABLE (guest walk-ins, U1)
- set_booking_expiry hardened: NULL created_at + missing/garbage setting fall
  back to NOW() + 3h instead of failing silently
"""

revision = "c3d4e5f60003"
down_revision = "b2c3d4e5f002"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


def upgrade() -> None:
    op.create_table(
        "bookings",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("reference_id", sa.String(50), unique=True, nullable=False),
        sa.Column("customer_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("technician_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("service_id", sa.BigInteger,
                  sa.ForeignKey("services.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("brand_id", sa.BigInteger,
                  sa.ForeignKey("aircon_brands.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("customer_first_name", sa.String(100), nullable=False),
        sa.Column("customer_last_name", sa.String(100), nullable=False),
        sa.Column("customer_email", sa.String(255), nullable=False),
        sa.Column("customer_phone", sa.String(25), nullable=False),
        sa.Column("region_code", sa.String(20)),
        sa.Column("province_code", sa.String(20)),
        sa.Column("city_municipality_code", sa.String(20)),
        sa.Column("barangay_code", sa.String(20)),
        sa.Column("street_address", sa.Text, nullable=False),
        sa.Column("landmark", sa.String(255), nullable=False),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("preferred_date", sa.Date, nullable=False),
        sa.Column("preferred_time", sa.Time, nullable=False),
        sa.Column("problem_description", sa.Text),
        sa.Column("aircon_photos", postgresql.ARRAY(sa.Text)),
        sa.Column("down_payment_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("total_service_cost", sa.Numeric(10, 2)),
        sa.Column("status", sa.String(20), nullable=False, server_default="submitted"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("pending_at", sa.DateTime(timezone=True)),
        sa.Column("confirmed_at", sa.DateTime(timezone=True)),
        sa.Column("ongoing_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("cancellation_reason", sa.Text),
        sa.Column("cancelled_by_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("admin_notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(r"reference_id ~ '^KJAC-\d{4}-[A-Z0-9]{6}$'",
                           name="chk_bookings_reference_format"),
        sa.CheckConstraint("down_payment_amount >= 0", name="chk_bookings_down_payment"),
        sa.CheckConstraint("total_service_cost >= 0", name="chk_bookings_total_cost"),
        sa.CheckConstraint(
            "status IN ('submitted', 'pending', 'confirmed', 'ongoing', 'completed', "
            "'cancelled', 'expired', 'rescheduled')",
            name="chk_bookings_status_valid"),
    )
    op.create_index("idx_bookings_reference_id", "bookings", ["reference_id"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_bookings_customer_id", "bookings", ["customer_id"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_bookings_technician_id", "bookings", ["technician_id"],
                    postgresql_where=sa.text("technician_id IS NOT NULL AND deleted_at IS NULL"))
    op.create_index("idx_bookings_status", "bookings", ["status"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_bookings_preferred_date", "bookings", ["preferred_date"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_bookings_created_at", "bookings",
                    [sa.text("created_at DESC")])
    op.create_index("idx_bookings_service_id", "bookings", ["service_id"])
    op.create_index("idx_bookings_brand_id", "bookings", ["brand_id"])
    op.create_index("idx_bookings_customer_status", "bookings", ["customer_id", "status"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_bookings_technician_date", "bookings",
                    ["technician_id", "preferred_date"],
                    postgresql_where=sa.text("deleted_at IS NULL"))

    op.create_table(
        "booking_status_history",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("changed_by_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("old_status", sa.String(20)),
        sa.Column("new_status", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
    )
    op.create_index("idx_booking_history_booking_id", "booking_status_history",
                    ["booking_id"])
    op.create_index("idx_booking_history_created_at", "booking_status_history",
                    [sa.text("created_at DESC")])

    op.create_table(
        "reschedule_requests",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requested_by_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reviewed_by_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("old_preferred_date", sa.Date, nullable=False),
        sa.Column("old_preferred_time", sa.Time, nullable=False),
        sa.Column("new_preferred_date", sa.Date, nullable=False),
        sa.Column("new_preferred_time", sa.Time, nullable=False),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("admin_notes", sa.Text),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('pending', 'approved', 'denied')",
                           name="chk_reschedule_status_valid"),
    )
    op.create_index("idx_reschedule_booking_id", "reschedule_requests", ["booking_id"])
    op.create_index("idx_reschedule_status", "reschedule_requests", ["status"])
    op.create_index("idx_reschedule_requested_by", "reschedule_requests",
                    ["requested_by_user_id"])

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.set_booking_expiry()
        RETURNS TRIGGER AS $$
        DECLARE
            expiry_hours INTEGER := 3;
            base_time TIMESTAMPTZ;
        BEGIN
            BEGIN
                SELECT NULLIF(setting_value, '')::INTEGER INTO expiry_hours
                FROM public.system_settings
                WHERE setting_key = 'booking_expiration_hours';
                IF expiry_hours IS NULL OR expiry_hours <= 0 THEN
                    expiry_hours := 3;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                expiry_hours := 3;
            END;

            base_time := COALESCE(NEW.created_at, NOW());
            IF NEW.status = 'submitted' THEN
                NEW.expires_at := base_time + (expiry_hours || ' hours')::INTERVAL;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        "CREATE TRIGGER set_booking_expiry_trigger "
        "BEFORE INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_expiry()"
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.update_booking_status_timestamps()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.status IS DISTINCT FROM OLD.status THEN
                CASE NEW.status
                    WHEN 'pending' THEN NEW.pending_at := NOW();
                    WHEN 'confirmed' THEN NEW.confirmed_at := NOW();
                    WHEN 'ongoing' THEN NEW.ongoing_at := NOW();
                    WHEN 'completed' THEN NEW.completed_at := NOW();
                    WHEN 'cancelled' THEN NEW.cancelled_at := NOW();
                    ELSE NULL; -- expired/resubmitted/submitted carry no stamp
                END CASE;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        "CREATE TRIGGER update_booking_status_timestamps_trigger "
        "BEFORE UPDATE ON bookings FOR EACH ROW "
        "EXECUTE FUNCTION public.update_booking_status_timestamps()"
    )

    # SECURITY DEFINER so backend service-role / cron writes still log history
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.log_booking_status_change()
        RETURNS TRIGGER AS $$
        DECLARE
            current_user_id BIGINT;
        BEGIN
            IF NEW.status IS DISTINCT FROM OLD.status THEN
                BEGIN
                    SELECT id INTO current_user_id FROM public.users
                    WHERE uuid = auth.uid();
                EXCEPTION WHEN undefined_function THEN
                    current_user_id := NULL;
                END;
                INSERT INTO public.booking_status_history
                    (booking_id, changed_by_user_id, old_status, new_status)
                VALUES (NEW.id, current_user_id, OLD.status, NEW.status);
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )
    op.execute(
        "CREATE TRIGGER log_booking_status_change_trigger "
        "AFTER UPDATE ON bookings FOR EACH ROW "
        "EXECUTE FUNCTION public.log_booking_status_change()"
    )

    for table in ("bookings", "reschedule_requests"):
        op.execute(
            f"CREATE TRIGGER update_{table}_updated_at BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()"
        )


def downgrade() -> None:
    for table in ("bookings", "reschedule_requests"):
        op.execute(f"DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table}")
    op.execute("DROP TRIGGER IF EXISTS log_booking_status_change_trigger ON bookings")
    op.execute("DROP FUNCTION IF EXISTS public.log_booking_status_change()")
    op.execute("DROP TRIGGER IF EXISTS update_booking_status_timestamps_trigger ON bookings")
    op.execute("DROP FUNCTION IF EXISTS public.update_booking_status_timestamps()")
    op.execute("DROP TRIGGER IF EXISTS set_booking_expiry_trigger ON bookings")
    op.execute("DROP FUNCTION IF EXISTS public.set_booking_expiry()")
    for table in ("reschedule_requests", "booking_status_history", "bookings"):
        op.drop_table(table)
