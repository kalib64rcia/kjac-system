"""Swap booking flow: schedule visibility before payment.

New flow: submitted → proposed → scheduled → confirmed → assigned → ongoing → completed

This moves the schedule visibility (proposed + customer acceptance) BEFORE payment,
preventing customers from paying for unavailable time slots and reducing refunds.

Status changes:
- 'pending' → 'proposed' (admin proposes time)
- 'confirmed' → 'scheduled' (customer accepts, awaiting payment)
- 'scheduled' → 'confirmed' (payment verified, ready for tech)

Revision ID: 1000002b
"""

revision = "1000002b"
down_revision = "1000002a"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # First, drop the CHECK constraint to allow temp values
    op.drop_constraint("chk_bookings_status_valid", "bookings", type_="check")
    
    # Update status values in bookings table
    # pending → proposed
    op.execute("UPDATE bookings SET status = 'proposed' WHERE status = 'pending'")
    
    # confirmed → scheduled (old "confirmed" was after payment, now it's after acceptance)
    op.execute("UPDATE bookings SET status = 'scheduled_tmp' WHERE status = 'confirmed'")
    
    # scheduled → confirmed (old "scheduled" was after admin placed on calendar, now it's final)
    op.execute("UPDATE bookings SET status = 'confirmed' WHERE status = 'scheduled'")
    
    # Now update the temporary values to final
    op.execute("UPDATE bookings SET status = 'scheduled' WHERE status = 'scheduled_tmp'")
    
    # Recreate CHECK constraint with new statuses
    op.create_check_constraint(
        "chk_bookings_status_valid",
        "bookings",
        "status IN ('submitted', 'proposed', 'scheduled', 'confirmed', 'assigned', "
        "'ongoing', 'completed', 'cancelled', 'expired', 'rescheduled', "
        "'alternative_proposed', 'awaiting_payment')"
    )
    
    # Rename timestamp columns to match new flow
    # pending_at → proposed_at
    op.alter_column('bookings', 'pending_at', new_column_name='proposed_at')
    
    # Update the trigger function to use proposed_at and proposed status
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.update_booking_status_timestamps()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.status IS DISTINCT FROM OLD.status THEN
                CASE NEW.status
                    WHEN 'proposed' THEN NEW.proposed_at := NOW();
                    WHEN 'confirmed' THEN NEW.confirmed_at := NOW();
                    WHEN 'ongoing' THEN NEW.ongoing_at := NOW();
                    WHEN 'completed' THEN NEW.completed_at := NOW();
                    WHEN 'cancelled' THEN NEW.cancelled_at := NOW();
                    ELSE NULL; -- expired/rescheduled/submitted/scheduled/assigned carry no stamp
                END CASE;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    # First, drop the CHECK constraint to allow temp values
    op.drop_constraint("chk_bookings_status_valid", "bookings", type_="check")
    
    # Revert status values
    # confirmed → scheduled
    op.execute("UPDATE bookings SET status = 'scheduled_tmp' WHERE status = 'confirmed'")
    
    # scheduled → confirmed
    op.execute("UPDATE bookings SET status = 'confirmed' WHERE status = 'scheduled'")
    
    # Now update back
    op.execute("UPDATE bookings SET status = 'scheduled' WHERE status = 'scheduled_tmp'")
    
    # proposed → pending
    op.execute("UPDATE bookings SET status = 'pending' WHERE status = 'proposed'")
    
    # Recreate original CHECK constraint
    op.create_check_constraint(
        "chk_bookings_status_valid",
        "bookings",
        "status IN ('submitted', 'pending', 'confirmed', 'scheduled', 'assigned', "
        "'ongoing', 'completed', 'cancelled', 'expired', 'rescheduled', "
        "'alternative_proposed', 'awaiting_payment')"
    )
    
    # Revert column name
    op.alter_column('bookings', 'proposed_at', new_column_name='pending_at')
    
    # Restore the old trigger function
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

