"""Phase A hybrid: window bookings (morning/afternoon, office places the hour).

One nullable column; NULL = exact booking as before. No CHECK changes, no
RLS changes, lifecycle untouched.
"""

revision = "10000021"
down_revision = "10000020"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("flex_window", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bookings", "flex_window")
