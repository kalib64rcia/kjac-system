"""Scheduling V1: explicit ASSIGNED + manual Close + crew join + refund proof.

- ASSIGNED = paid + team picked, only this counts (CONFIRMED = paid, no team).
  Adds 'assigned', 'alternative_proposed', 'awaiting_payment' to the status
  CHECK (PENDING_VERIFY reuses 'pending'). Existing rows untouched.
- window_closures(date, window): manual FULL per date+window, default open.
  Closed blocks new submits (409), reopen allowed, existing PENDING kept.
- booking_crew_members(booking_id, user_id): 1..6 names per booking,
  solo allowed, one crew may take all jobs. technician_id stays as lead
  for backward compat (payroll/reports).
- refunds payout proof: payout_receipt_url + payout_reference_number.
  approved = owed, completed = receipt + ref uploaded (manual GCash).
"""

revision = "10000027"
down_revision = "10000026"
branch_labels = None
depends_on = None

import sqlalchemy as sa

from alembic import op

NEW_STATUSES = (
    "submitted",
    "pending",
    "confirmed",
    "assigned",
    "ongoing",
    "completed",
    "cancelled",
    "expired",
    "rescheduled",
    "alternative_proposed",
    "awaiting_payment",
)


def upgrade() -> None:
    op.execute("ALTER TABLE bookings DROP CONSTRAINT chk_bookings_status_valid")
    op.create_check_constraint(
        "chk_bookings_status_valid",
        "bookings",
        f"status IN {NEW_STATUSES}",
    )
    op.create_table(
        "window_closures",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("preferred_date", sa.Date, nullable=False),
        sa.Column("window", sa.String(20), nullable=False),
        sa.Column(
            "closed_by_user_id", sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("reason", sa.Text),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.UniqueConstraint("preferred_date", "window", name="uq_window_closures_day_window"),
        sa.CheckConstraint(
            '"window" IN (\'morning\', \'afternoon\', \'anytime\')',
            name="chk_window_closures_window",
        ),
    )
    op.create_index(
        "idx_window_closures_day", "window_closures", ["preferred_date", "window"],
    )
    op.create_table(
        "booking_crew_members",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "booking_id", sa.BigInteger,
            sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column(
            "user_id", sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.UniqueConstraint("booking_id", "user_id", name="uq_booking_crew_booking_user"),
    )
    op.create_index(
        "idx_booking_crew_booking", "booking_crew_members", ["booking_id"],
    )
    op.create_index(
        "idx_booking_crew_user", "booking_crew_members", ["user_id"],
    )
    op.add_column(
        "refunds",
        sa.Column("payout_receipt_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "refunds",
        sa.Column("payout_reference_number", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("refunds", "payout_reference_number")
    op.drop_column("refunds", "payout_receipt_url")
    op.drop_index("idx_booking_crew_user", table_name="booking_crew_members")
    op.drop_index("idx_booking_crew_booking", table_name="booking_crew_members")
    op.drop_table("booking_crew_members")
    op.drop_index("idx_window_closures_day", table_name="window_closures")
    op.drop_table("window_closures")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT chk_bookings_status_valid")
    op.create_check_constraint(
        "chk_bookings_status_valid",
        "bookings",
        "status IN ('submitted', 'pending', 'confirmed', 'ongoing', "
        "'completed', 'cancelled', 'expired', 'rescheduled')",
    )
