"""Employee identity fields: gender + privacy-consent timestamp.

Appended per DATABASE_RULES (PostgreSQL appends; deviation documented here,
not reordered):
- users.gender VARCHAR(10) NULL, CHECK IN ('male','female'). Nullable so
  pre-existing employee rows stay honestly blank ("not specified") until the
  owner sets them; accept schemas require it for all NEW employees.
- users.data_privacy_consented_at TIMESTAMPTZ NULL. Stamped when an employee
  ticks the Data Privacy consent box on the invite form. Customers consent
  per-booking instead (agree_terms/agree_payment), so this stays employee-scoped.
"""

revision = "10000018"
down_revision = "10000017"
branch_labels = None
depends_on = None

import sqlalchemy as sa

from alembic import op


def upgrade() -> None:
    # Appended 2026-09-12, out of standard order due to PostgreSQL limitation
    # (DATABASE_RULES: accept + document, do not reorder).
    op.add_column("users", sa.Column("gender", sa.String(10), nullable=True))
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT chk_users_gender_valid "
        "CHECK (gender IS NULL OR gender IN ('male', 'female'))"
    )
    op.add_column(
        "users",
        sa.Column("data_privacy_consented_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "COMMENT ON COLUMN users.gender IS 'Employee gender (male/female). "
        "NULL = joined before recording began; shown as not specified.'"
    )
    op.execute(
        "COMMENT ON COLUMN users.data_privacy_consented_at IS 'When the "
        "employee ticked Data Privacy consent (invite form). Employee-scoped.'"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_gender_valid")
    op.drop_column("users", "data_privacy_consented_at")
    op.drop_column("users", "gender")
