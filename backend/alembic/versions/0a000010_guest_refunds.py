"""Guest refunds: requested_by_user_id nullable (Phase 3).

Guest bookings/payments have no user row; the refund is still bookkept with a
NULL requester and processed manually by reference number.
"""

revision = "0a000010"
down_revision = "0900000009"
branch_labels = None
depends_on = None

from alembic import op


def upgrade() -> None:
    op.alter_column("refunds", "requested_by_user_id", nullable=True)


def downgrade() -> None:
    op.execute("DELETE FROM refunds WHERE requested_by_user_id IS NULL")
    op.alter_column("refunds", "requested_by_user_id", nullable=False)
