"""Guest reschedules: requested_by_user_id nullable (Phase 3).

Guests have no user row; their requests link via booking_id and are proven by
email match in the service layer. RLS still requires auth for direct writes;
the backend connection bypasses RLS (documented in CONTRACTS.md).
"""

revision = "0900000009"
down_revision = "0800000008"
branch_labels = None
depends_on = None

from alembic import op


def upgrade() -> None:
    op.alter_column("reschedule_requests", "requested_by_user_id", nullable=True)


def downgrade() -> None:
    op.execute("DELETE FROM reschedule_requests WHERE requested_by_user_id IS NULL")
    op.alter_column("reschedule_requests", "requested_by_user_id", nullable=False)
