"""Add last_attempt_at to admin_two_fa_codes (lockout window tracking, Phase 2)."""

revision = "0800000008"
down_revision = "0700000007"
branch_labels = None
depends_on = None

import sqlalchemy as sa

from alembic import op


def upgrade() -> None:
    op.add_column(
        "admin_two_fa_codes",
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("admin_two_fa_codes", "last_attempt_at")
