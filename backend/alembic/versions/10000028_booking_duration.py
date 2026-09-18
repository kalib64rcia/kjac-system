"""Add estimated_duration_minutes to bookings for multi-hour scheduling.

Allows admin to set custom duration when placing bookings on schedule,
so multi-hour bookings (e.g., 9:00-10:30) display correctly on the
schedule board and for overlap detection.
"""

revision = "10000028"
down_revision = "10000027"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("estimated_duration_minutes", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bookings", "estimated_duration_minutes")
