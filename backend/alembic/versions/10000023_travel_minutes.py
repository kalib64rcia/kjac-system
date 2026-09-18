"""Phase C: travel buffer per area.

One table: drive minutes for a region/province/city. Bookings in areas
with an hour or more of travel occupy extra slots (nearest hour).
Additive only: no changes to existing tables.
"""

revision = "10000023"
down_revision = "10000022"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
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
        sa.UniqueConstraint("area_level", "area_code", name="uq_travel_minutes_area"),
        sa.CheckConstraint(
            "area_level IN ('region', 'province', 'city')",
            name="chk_travel_minutes_level_valid",
        ),
        sa.CheckConstraint(
            "minutes >= 0 AND minutes <= 480",
            name="chk_travel_minutes_range",
        ),
    )
    op.create_index(
        "idx_travel_minutes_area", "travel_minutes",
        ["area_level", "area_code"],
    )


def downgrade() -> None:
    op.drop_index("idx_travel_minutes_area", table_name="travel_minutes")
    op.drop_table("travel_minutes")
