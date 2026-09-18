"""Add 'scheduled' status to bookings workflow.

New status 'scheduled' represents when admin has placed a booking on the
schedule (picked time slot) and customer has been notified. This is
distinct from 'confirmed' (payment verified) and 'assigned' (customer
accepted + technician assigned).

Status flow: confirmed → scheduled → assigned → ongoing

Revision ID: 1000002a
"""

revision = "1000002a"
down_revision = "10000029"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # Drop existing CHECK constraint
    op.drop_constraint("chk_bookings_status_valid", "bookings", type_="check")

    # Add new scheduled_at timestamp column
    op.add_column(
        "bookings",
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True)
    )

    # Re-create CHECK constraint with 'scheduled' status included
    op.create_check_constraint(
        "chk_bookings_status_valid",
        "bookings",
        "status IN ('submitted', 'pending', 'confirmed', 'scheduled', 'assigned', "
        "'ongoing', 'completed', 'cancelled', 'expired', 'rescheduled', "
        "'alternative_proposed', 'awaiting_payment')"
    )


def downgrade() -> None:
    # Drop the constraint and column
    op.drop_constraint("chk_bookings_status_valid", "bookings", type_="check")

    op.drop_column("bookings", "scheduled_at")

    # Restore original constraint
    op.create_check_constraint(
        "chk_bookings_status_valid",
        "bookings",
        "status IN ('submitted', 'pending', 'confirmed', 'assigned', 'ongoing', "
        "'completed', 'cancelled', 'expired', 'rescheduled', 'alternative_proposed', "
        "'awaiting_payment')"
    )
