"""Phase A scheduling: slot holds table + availability settings seeds.

booking_holds is ephemeral (10-minute seat holds for guests picking a time
before typing details). Deliberately outside the audit trigger list and RLS
policies: rows live minutes, carry no customer data, and only the API role
touches them. Expired rows are deleted on each hold write (no runner exists).
"""

revision = "10000020"
down_revision = "10000019"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table(
        "booking_holds",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("reference", sa.String(50), unique=True, nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("preferred_date", sa.Date, nullable=False),
        sa.Column("preferred_time", sa.Time, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index(
        "idx_booking_holds_slot", "booking_holds",
        ["preferred_date", "preferred_time"],
    )
    for key, value, desc in (
        ("slot_house_reserve", "1",
         "Seats per slot hidden from public availability (walk-ins and regulars)"),
        ("slot_low_threshold", "2",
         "Public seats left at or below which a slot reads filling"),
        ("slot_hold_minutes", "10",
         "Guest slot-hold lifetime in minutes"),
    ):
        op.execute(
            "INSERT INTO system_settings "
            "(setting_key, setting_value, data_type, category, description) "
            f"VALUES ('{key}', '{value}', 'integer', 'booking', '{desc}') "
            "ON CONFLICT (setting_key) DO NOTHING"
        )


def downgrade() -> None:
    op.execute("DELETE FROM system_settings WHERE setting_key IN "
               "('slot_house_reserve', 'slot_low_threshold', 'slot_hold_minutes')")
    op.drop_index("idx_booking_holds_slot", table_name="booking_holds")
    op.drop_table("booking_holds")
