"""Phase B: waitlist for full days + payment-reminder stamp.

Additive only: new booking_waitlist table (guest name/phone, no account
needed) + one nullable stamp on bookings. No CHECK changes on existing
tables, no RLS changes, lifecycle untouched.
"""

revision = "10000022"
down_revision = "10000021"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa

# notifications.type gains the Phase B rows (office waitlist notice +
# guest reminder receipts). Same drop/re-add pattern as 10000017.
_NOTIF_TYPES = (
    "type IN ('booking_submitted', 'payment_uploaded', 'payment_verified', "
    "'payment_rejected', 'booking_confirmed', 'technician_assigned', "
    "'technician_on_way', 'technician_arrived', 'service_started', "
    "'service_completed', 'booking_cancelled', 'booking_expiring', "
    "'refund_approved', 'refund_denied', 'refund_completed', "
    "'reschedule_approved', 'reschedule_denied', 'low_stock_alert', "
    "'technician_pending_approval', 'staff_pending_approval', "
    "'refund_proposed', 'refund_reviewed', 'password_reset', 'account_locked', "
    "'waitlist_joined', 'booking_reminder_tomorrow', 'payment_reminder')"
)
_NOTIF_TYPES_OLD = (
    "type IN ('booking_submitted', 'payment_uploaded', 'payment_verified', "
    "'payment_rejected', 'booking_confirmed', 'technician_assigned', "
    "'technician_on_way', 'technician_arrived', 'service_started', "
    "'service_completed', 'booking_cancelled', 'booking_expiring', "
    "'refund_approved', 'refund_denied', 'refund_completed', "
    "'reschedule_approved', 'reschedule_denied', 'low_stock_alert', "
    "'technician_pending_approval', 'staff_pending_approval', "
    "'refund_proposed', 'refund_reviewed', 'password_reset', 'account_locked')"
)


def upgrade() -> None:
    op.create_table(
        "booking_waitlist",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("preferred_date", sa.Date, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("phone", sa.String(25), nullable=False),
        sa.Column("email", sa.String(320)),
        sa.Column(
            "status", sa.String(20), nullable=False, server_default="waiting",
        ),
        sa.Column(
            "offer_hold_id", sa.BigInteger,
            sa.ForeignKey("booking_holds.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "status IN ('waiting', 'offered', 'removed')",
            name="chk_waitlist_status_valid",
        ),
    )
    op.create_index(
        "idx_waitlist_day", "booking_waitlist",
        ["preferred_date", "status"],
    )
    op.add_column(
        "bookings",
        sa.Column("payment_reminder_sent_at", sa.DateTime(timezone=True)),
    )
    op.execute("ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type_valid")
    op.execute(
        "ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type_valid "
        f"CHECK ({_NOTIF_TYPES})"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type_valid")
    op.execute(
        "ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type_valid "
        f"CHECK ({_NOTIF_TYPES_OLD})"
    )
    op.drop_column("bookings", "payment_reminder_sent_at")
    op.drop_index("idx_waitlist_day", table_name="booking_waitlist")
    op.drop_table("booking_waitlist")
