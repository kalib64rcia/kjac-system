"""Technician invite ledger (Phase 5, admin-only invite-gated onboarding).

One row per invitation: unguessable token hash, 7-day expiry, single use.
The emailed link carries the raw token; only the hash is stored.
"""

revision = "0b000011"
down_revision = "0a000010"
branch_labels = None
depends_on = None

import sqlalchemy as sa

from alembic import op


def upgrade() -> None:
    op.create_table(
        "technician_invites",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("token_hash", sa.String(255), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_by_admin_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index("idx_invites_email", "technician_invites", ["email"])
    op.create_index("idx_invites_token_hash", "technician_invites", ["token_hash"])
    op.execute("ALTER TABLE technician_invites ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY invites_admin_all_policy ON technician_invites "
        "FOR ALL USING (public.is_admin())"
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS invites_admin_all_policy ON technician_invites")
    op.drop_table("technician_invites")
