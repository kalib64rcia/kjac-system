"""Retire travel-as-capacity + add manual day-plan order.

The travel buffer (10000023) solved the wrong problem: drive time never
decided capacity, and the office asked for day ORDER instead (which job
first on a multi-town day). The table never reached production, but the
drop is IF EXISTS so the chain holds whether or not 10000023 applied.
dispatch_order is a plain nullable sequence (office up/down arrows);
unordered bookings sort by time.
"""

revision = "10000025"
down_revision = "10000024"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS travel_minutes")
    op.add_column(
        "bookings",
        sa.Column("dispatch_order", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bookings", "dispatch_order")
    op.create_table(
        "travel_minutes",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("area_level", sa.String(20), nullable=False),
        sa.Column("area_code", sa.String(20), nullable=False),
        sa.Column("area_name", sa.String(200), nullable=False),
        sa.Column("minutes", sa.Integer, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
