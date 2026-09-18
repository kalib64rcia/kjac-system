"""Phase D: technician roster (who works which days).

Weekly template per tech (default: working — capacity is unchanged until
the office touches the roster) + time-off ranges. Leave wins over the
template; Sundays stay governed by the global Sunday setting.
Additive only: no changes to existing tables.
"""

revision = "10000024"
down_revision = "10000023"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table(
        "technician_workdays",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "user_id", sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        # Python weekday: 0 = Monday .. 6 = Sunday.
        sa.Column("weekday", sa.Integer, nullable=False),
        sa.Column(
            "is_working", sa.Boolean, nullable=False, server_default=sa.text("TRUE"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.UniqueConstraint("user_id", "weekday", name="uq_tech_workdays_user_day"),
        sa.CheckConstraint(
            "weekday >= 0 AND weekday <= 6",
            name="chk_tech_workdays_weekday",
        ),
    )
    op.create_index(
        "idx_tech_workdays_user", "technician_workdays", ["user_id"],
    )
    op.create_table(
        "technician_time_off",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "user_id", sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("date_from", sa.Date, nullable=False),
        sa.Column("date_to", sa.Date, nullable=False),
        sa.Column("reason", sa.Text),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "date_from <= date_to",
            name="chk_tech_time_off_range",
        ),
    )
    op.create_index(
        "idx_tech_time_off_user", "technician_time_off", ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_tech_time_off_user", table_name="technician_time_off")
    op.drop_table("technician_time_off")
    op.drop_index("idx_tech_workdays_user", table_name="technician_workdays")
    op.drop_table("technician_workdays")
