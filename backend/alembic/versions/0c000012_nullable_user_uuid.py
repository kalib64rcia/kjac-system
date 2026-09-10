"""Invite-accepted technician rows have no Supabase uuid until first sync.

users.uuid becomes nullable; RLS comparisons against NULL evaluate to false,
so no policy change is needed. Sync links the row by verified email.
"""

revision = "0c000012"
down_revision = "0b000011"
branch_labels = None
depends_on = None

from alembic import op


def upgrade() -> None:
    op.alter_column("users", "uuid", nullable=True)


def downgrade() -> None:
    op.execute("DELETE FROM users WHERE uuid IS NULL")
    op.alter_column("users", "uuid", nullable=False)
