"""Public payment identifiers: unguessable UUID per payment.

Sequential payment ids in public URLs (/bookings/{id}/payment,
/payments/{id}/receipt) invite enumeration. Ownership checks already answer
uniform 404s, but UUIDs remove the oracle entirely (security best practice:
random UUID4 for public resource ids). Admin verify keeps the integer id
behind 2FA. Backfilled by the server default; additive only.
"""

revision = "10000026"
down_revision = "10000025"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


def upgrade() -> None:
    op.add_column(
        "payments",
        sa.Column(
            "uuid", postgresql.UUID(as_uuid=True), unique=True, nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
    )
    # Backfill existing payments with UUIDs (server_default only applies to new inserts)
    op.execute("UPDATE payments SET uuid = gen_random_uuid() WHERE uuid IS NULL")
    op.create_index("idx_payments_uuid", "payments", ["uuid"])


def downgrade() -> None:
    op.drop_index("idx_payments_uuid", table_name="payments")
    op.drop_column("payments", "uuid")
