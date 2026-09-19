"""Refund target: GCash number plus name for payout.

Stores where to send the refund, captured at cancel time when paid.
Approved means owed, completed means payout proof uploaded.
"""

revision = "1000002d"
down_revision = "1000002c"
branch_labels = None
depends_on = None

import sqlalchemy as sa

from alembic import op


def upgrade() -> None:
    op.add_column("refunds", sa.Column("refund_to_number", sa.String(25), nullable=True))
    op.add_column("refunds", sa.Column("refund_to_name", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("refunds", "refund_to_name")
    op.drop_column("refunds", "refund_to_number")
