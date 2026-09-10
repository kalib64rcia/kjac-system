"""Payments, refunds, ratings, threads, messages, notifications.

CONTRACTS.md adaptations:
- payments.customer_id NULLABLE (guest uploads link via booking_id; U1)
- rating trigger fires on INSERT/UPDATE/DELETE and skips soft-deleted rows
- thread/history writers are SECURITY DEFINER (service-role safe)
"""

revision = "d4e5f60004"
down_revision = "c3d4e5f60003"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("verified_by_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("payment_type", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_method", sa.String(20)),
        sa.Column("gcash_reference_number", sa.String(100)),
        sa.Column("gcash_receipt_url", sa.Text),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("verified_at", sa.DateTime(timezone=True)),
        sa.Column("rejection_reason", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "payment_type IN ('down_payment', 'full_payment', 'additional')",
            name="chk_payments_type_valid"),
        sa.CheckConstraint("amount > 0", name="chk_payments_amount_positive"),
        sa.CheckConstraint(
            "payment_method IN ('gcash', 'cash', 'bank_transfer', 'online')",
            name="chk_payments_method_valid"),
        sa.CheckConstraint("status IN ('pending', 'verified', 'rejected')",
                           name="chk_payments_status_valid"),
    )
    op.create_index("idx_payments_booking_id", "payments", ["booking_id"])
    op.create_index("idx_payments_customer_id", "payments", ["customer_id"])
    op.create_index("idx_payments_status", "payments", ["status"])
    op.create_index("idx_payments_created_at", "payments", [sa.text("created_at DESC")])
    # One verified payment per GCash reference blocks double-spend / reuse (R8)
    op.create_index(
        "uniq_payments_verified_gcash_ref", "payments", ["gcash_reference_number"],
        unique=True,
        postgresql_where=sa.text(
            "status = 'verified' AND gcash_reference_number IS NOT NULL"),
    )

    op.create_table(
        "refunds",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payment_id", sa.BigInteger,
                  sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requested_by_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("processed_by_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("refund_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("refund_type", sa.String(20)),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="processing"),
        sa.Column("admin_notes", sa.Text),
        sa.Column("denial_reason", sa.Text),
        sa.Column("refund_method", sa.String(20)),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("refund_amount >= 0", name="chk_refunds_amount"),
        sa.CheckConstraint("refund_type IN ('full', 'partial', 'none')",
                           name="chk_refunds_type_valid"),
        sa.CheckConstraint(
            "status IN ('processing', 'approved', 'denied', 'completed')",
            name="chk_refunds_status_valid"),
        sa.CheckConstraint("refund_method IN ('gcash', 'bank_transfer', 'cash')",
                           name="chk_refunds_method_valid"),
    )
    op.create_index("idx_refunds_booking_id", "refunds", ["booking_id"])
    op.create_index("idx_refunds_payment_id", "refunds", ["payment_id"])
    op.create_index("idx_refunds_status", "refunds", ["status"])
    op.create_index("idx_refunds_requested_by", "refunds", ["requested_by_user_id"])

    op.create_table(
        "ratings",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="CASCADE"),
                  unique=True, nullable=False),
        sa.Column("customer_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("technician_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("review_text", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="chk_ratings_range"),
    )
    op.create_index("idx_ratings_booking_id", "ratings", ["booking_id"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_ratings_customer_id", "ratings", ["customer_id"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_ratings_technician_id", "ratings", ["technician_id"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_ratings_rating", "ratings", ["rating"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_ratings_created_at", "ratings", [sa.text("created_at DESC")])

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.update_technician_rating()
        RETURNS TRIGGER AS $$
        DECLARE
            target_technician BIGINT;
        BEGIN
            IF TG_OP = 'DELETE' THEN
                target_technician := OLD.technician_id;
            ELSE
                target_technician := NEW.technician_id;
            END IF;
            UPDATE public.users
            SET average_rating = (
                SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0.00)
                FROM public.ratings
                WHERE technician_id = target_technician
                AND deleted_at IS NULL
            )
            WHERE id = target_technician;
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )
    op.execute(
        "CREATE TRIGGER update_technician_rating_trigger "
        "AFTER INSERT OR UPDATE OR DELETE ON ratings FOR EACH ROW "
        "EXECUTE FUNCTION public.update_technician_rating()"
    )

    op.create_table(
        "message_threads",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="SET NULL")),
        sa.Column("participant_user_ids", postgresql.ARRAY(sa.BigInteger),
                  nullable=False),
        sa.Column("thread_type", sa.String(20), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True)),
        sa.Column("last_message_preview", sa.Text),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("thread_type IN ('booking_chat', 'general_message')",
                           name="chk_threads_type_valid"),
    )
    op.create_index("idx_threads_booking_id", "message_threads", ["booking_id"],
                    postgresql_where=sa.text("booking_id IS NOT NULL"))
    op.execute(
        "CREATE INDEX idx_threads_participants ON message_threads "
        "USING GIN(participant_user_ids)"
    )
    op.create_index("idx_threads_last_message", "message_threads",
                    [sa.text("last_message_at DESC")])

    op.create_table(
        "messages",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("thread_id", sa.BigInteger,
                  sa.ForeignKey("message_threads.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("sender_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message_text", sa.Text, nullable=False),
        sa.Column("message_type", sa.String(20), server_default="text"),
        sa.Column("is_read", sa.Boolean, server_default=sa.false()),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("message_type IN ('text', 'system')",
                           name="chk_messages_type_valid"),
    )
    op.create_index("idx_messages_thread_id", "messages", ["thread_id", "created_at"])
    op.create_index("idx_messages_sender_id", "messages", ["sender_id"])
    op.create_index("idx_messages_is_read", "messages", ["is_read"],
                    postgresql_where=sa.text("is_read = FALSE"))

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.update_thread_last_message()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE public.message_threads
            SET last_message_at = NEW.created_at,
                last_message_preview = LEFT(NEW.message_text, 100),
                updated_at = NOW()
            WHERE id = NEW.thread_id;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )
    op.execute(
        "CREATE TRIGGER update_thread_last_message_trigger "
        "AFTER INSERT ON messages FOR EACH ROW "
        "EXECUTE FUNCTION public.update_thread_last_message()"
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="SET NULL")),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("data", postgresql.JSONB),
        sa.Column("is_read", sa.Boolean, server_default=sa.false()),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("sent_via_push", sa.Boolean, server_default=sa.false()),
        sa.Column("sent_via_email", sa.Boolean, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "type IN ('booking_submitted', 'payment_uploaded', 'payment_verified', "
            "'payment_rejected', 'booking_confirmed', 'technician_assigned', "
            "'technician_on_way', 'technician_arrived', 'service_started', "
            "'service_completed', 'booking_cancelled', 'booking_expiring', "
            "'refund_approved', 'refund_denied', 'refund_completed', "
            "'reschedule_approved', 'reschedule_denied', 'low_stock_alert', "
            "'technician_pending_approval', 'password_reset', 'account_locked')",
            name="chk_notifications_type_valid"),
    )
    op.create_index("idx_notifications_user_id", "notifications",
                    ["user_id", sa.text("created_at DESC")])
    op.create_index("idx_notifications_is_read", "notifications", ["user_id", "is_read"],
                    postgresql_where=sa.text("is_read = FALSE"))
    op.create_index("idx_notifications_type", "notifications", ["type"])
    op.create_index("idx_notifications_booking_id", "notifications", ["booking_id"],
                    postgresql_where=sa.text("booking_id IS NOT NULL"))

    for table in ("payments", "refunds", "ratings", "message_threads"):
        op.execute(
            f"CREATE TRIGGER update_{table}_updated_at BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()"
        )


def downgrade() -> None:
    for table in ("payments", "refunds", "ratings", "message_threads"):
        op.execute(f"DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table}")
    op.execute("DROP TRIGGER IF EXISTS update_thread_last_message_trigger ON messages")
    op.execute("DROP FUNCTION IF EXISTS public.update_thread_last_message()")
    op.execute("DROP TRIGGER IF EXISTS update_technician_rating_trigger ON ratings")
    op.execute("DROP FUNCTION IF EXISTS public.update_technician_rating()")
    for table in ("notifications", "messages", "message_threads", "ratings",
                  "refunds", "payments"):
        op.drop_table(table)
