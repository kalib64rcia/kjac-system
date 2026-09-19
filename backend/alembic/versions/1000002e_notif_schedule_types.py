"""Widen notification types: schedule propose + withdraw.

- 'booking_scheduled' was already written by schedule_booking but missing
  from the CHECK (guest proposes skipped it, authed proposes hit it).
- 'booking_schedule_withdrawn' is the new office-unschedule notice.
Widening only: no existing rows affected.
"""

revision = "1000002e"
down_revision = "1000002d"
branch_labels = None
depends_on = None

from alembic import op

_NEW = (
    "type IN ('booking_submitted', 'payment_uploaded', 'payment_verified', "
    "'payment_rejected', 'booking_confirmed', 'technician_assigned', "
    "'technician_on_way', 'technician_arrived', 'service_started', "
    "'service_completed', 'booking_cancelled', 'booking_expiring', "
    "'refund_approved', 'refund_denied', 'refund_completed', "
    "'reschedule_approved', 'reschedule_denied', 'low_stock_alert', "
    "'technician_pending_approval', 'staff_pending_approval', "
    "'refund_proposed', 'refund_reviewed', 'password_reset', 'account_locked', "
    "'waitlist_joined', 'booking_reminder_tomorrow', 'payment_reminder', "
    "'booking_scheduled', 'booking_schedule_withdrawn')"
)


def upgrade() -> None:
    op.execute("ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type_valid")
    op.execute(
        "ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type_valid "
        f"CHECK ({_NEW})"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type_valid")
    op.execute(
        "ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type_valid "
        "CHECK (type IN ('booking_submitted', 'payment_uploaded', 'payment_verified', "
        "'payment_rejected', 'booking_confirmed', 'technician_assigned', "
        "'technician_on_way', 'technician_arrived', 'service_started', "
        "'service_completed', 'booking_cancelled', 'booking_expiring', "
        "'refund_approved', 'refund_denied', 'refund_completed', "
        "'reschedule_approved', 'reschedule_denied', 'low_stock_alert', "
        "'technician_pending_approval', 'staff_pending_approval', "
        "'refund_proposed', 'refund_reviewed', 'password_reset', 'account_locked', "
        "'waitlist_joined', 'booking_reminder_tomorrow', 'payment_reminder'))"
    )
