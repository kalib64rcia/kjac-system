"""Make preferred_time nullable to support bookings without scheduled times.

When customers book, they no longer select a time. The booking is created
with preferred_time = NULL and stays in the pool until admin assigns a time
via the schedule board.

Revision ID: 10000029
"""

revision = "10000029"
down_revision = "10000028"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.alter_column("bookings", "preferred_time", existing_type=sa.Time(), nullable=True)
    op.alter_column("booking_holds", "preferred_time", existing_type=sa.Time(), nullable=True)


def downgrade() -> None:
    op.alter_column("bookings", "preferred_time", existing_type=sa.Time(), nullable=False)
    op.alter_column("booking_holds", "preferred_time", existing_type=sa.Time(), nullable=False)
