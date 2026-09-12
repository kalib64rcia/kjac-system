"""Widen refund + notification domains for the maker-checker refund flow.

- refunds.status gains 'proposed' (staff proposal awaiting review).
- refunds.refund_type gains 'manual' (discretionary, non-policy refunds).
- notifications.type gains 'staff_pending_approval', 'refund_proposed',
  'refund_reviewed'.
"""

revision = "10000017"
down_revision = "10000016"
branch_labels = None
depends_on = None

from alembic import op

_REFUND_STATUS = (
    "status IN ('proposed', 'processing', 'approved', 'denied', 'completed')"
)
_REFUND_STATUS_OLD = "status IN ('processing', 'approved', 'denied', 'completed')"
_REFUND_TYPE = "refund_type IN ('full', 'partial', 'none', 'manual')"
_REFUND_TYPE_OLD = "refund_type IN ('full', 'partial', 'none')"
_NOTIF_TYPES = (
    "type IN ('booking_submitted', 'payment_uploaded', 'payment_verified', "
    "'payment_rejected', 'booking_confirmed', 'technician_assigned', "
    "'technician_on_way', 'technician_arrived', 'service_started', "
    "'service_completed', 'booking_cancelled', 'booking_expiring', "
    "'refund_approved', 'refund_denied', 'refund_completed', "
    "'reschedule_approved', 'reschedule_denied', 'low_stock_alert', "
    "'technician_pending_approval', 'staff_pending_approval', "
    "'refund_proposed', 'refund_reviewed', 'password_reset', 'account_locked')"
)
_NOTIF_TYPES_OLD = (
    "type IN ('booking_submitted', 'payment_uploaded', 'payment_verified', "
    "'payment_rejected', 'booking_confirmed', 'technician_assigned', "
    "'technician_on_way', 'technician_arrived', 'service_started', "
    "'service_completed', 'booking_cancelled', 'booking_expiring', "
    "'refund_approved', 'refund_denied', 'refund_completed', "
    "'reschedule_approved', 'reschedule_denied', 'low_stock_alert', "
    "'technician_pending_approval', 'password_reset', 'account_locked')"
)


def upgrade() -> None:
    op.execute("ALTER TABLE refunds DROP CONSTRAINT chk_refunds_status_valid")
    op.execute(f"ALTER TABLE refunds ADD CONSTRAINT chk_refunds_status_valid CHECK ({_REFUND_STATUS})")
    op.execute("ALTER TABLE refunds DROP CONSTRAINT chk_refunds_type_valid")
    op.execute(f"ALTER TABLE refunds ADD CONSTRAINT chk_refunds_type_valid CHECK ({_REFUND_TYPE})")
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
    op.execute("ALTER TABLE refunds DROP CONSTRAINT chk_refunds_type_valid")
    op.execute(
        "ALTER TABLE refunds ADD CONSTRAINT chk_refunds_type_valid "
        f"CHECK ({_REFUND_TYPE_OLD})"
    )
    op.execute("ALTER TABLE refunds DROP CONSTRAINT chk_refunds_status_valid")
    op.execute(
        "ALTER TABLE refunds ADD CONSTRAINT chk_refunds_status_valid "
        f"CHECK ({_REFUND_STATUS_OLD})"
    )
