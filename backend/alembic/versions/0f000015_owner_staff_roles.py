"""Owner/staff role split (approved role plan).

- users.role gains 'owner' + 'staff'; existing 'admin' rows become 'owner'
  (the owner demotes extras to staff in the UI).
- users gains position + three per-account delegation grants (default OFF).
  Payroll is ungrantable by design (no column, no toggle, ever).
- public.is_admin() is redefined as office access (owner OR staff) so the 67
  existing RLS policies widen without rewrites; new public.is_owner()
  gates owner-only data. Owner-only policies are swapped below.
- staff_invites mirrors technician_invites (owner-managed, is_owner RLS).
"""

revision = "0f000015"
down_revision = "0e000014"
branch_labels = None
depends_on = None

import sqlalchemy as sa

from alembic import op

_OWNER_ONLY_SWAPS = [
    # (table, old_policy, cmd, new_policy)
    ("audit_logs", "audit_logs_select_admin_policy", "SELECT",
     "audit_logs_select_owner_policy"),
    ("payroll_records", "payroll_admin_all_policy", "ALL",
     "payroll_owner_all_policy"),
    ("commission_rules", "commission_admin_all_policy", "ALL",
     "commission_owner_all_policy"),
    ("employee_info", "employee_info_admin_all_policy", "ALL",
     "employee_info_owner_all_policy"),
    ("system_settings", "settings_admin_insert_policy", "INSERT",
     "settings_owner_insert_policy"),
    ("system_settings", "settings_admin_update_policy", "UPDATE",
     "settings_owner_update_policy"),
    ("system_settings", "settings_admin_delete_policy", "DELETE",
     "settings_owner_delete_policy"),
]


def _policy_sql(table: str, name: str, cmd: str, using: str | None,
                check: str | None) -> str:
    if cmd == "INSERT":
        return (f"CREATE POLICY {name} ON {table} FOR INSERT "
                f"WITH CHECK ({check})")
    if cmd == "DELETE":
        return f"CREATE POLICY {name} ON {table} FOR DELETE USING ({using})"
    if cmd == "UPDATE":
        using_clause = f"USING ({using})"
        check_clause = f" WITH CHECK ({check})" if check else ""
        return f"CREATE POLICY {name} ON {table} FOR UPDATE {using_clause}{check_clause}"
    if cmd == "ALL":
        return f"CREATE POLICY {name} ON {table} FOR ALL USING ({using})"
    return f"CREATE POLICY {name} ON {table} FOR SELECT USING ({using})"


def upgrade() -> None:
    # 1. Widen the role domain, then promote existing admins to owner.
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role_valid")
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT chk_users_role_valid "
        "CHECK (role IN ('owner', 'staff', 'customer', 'technician'))"
    )
    op.execute("UPDATE users SET role = 'owner' WHERE role = 'admin'")

    # 2. Position title + per-account delegation grants (default deny).
    op.add_column("users", sa.Column("position", sa.String(100), nullable=True))
    for grant in ("can_approve_technicians", "can_execute_refunds", "can_view_audit"):
        op.add_column(
            "users",
            sa.Column(grant, sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    # 3. Helpers: is_admin() = office (owner/staff); is_owner() = owner only.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.is_admin()
        RETURNS BOOLEAN AS $$
        DECLARE
            result BOOLEAN;
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM public.users
                WHERE uuid = auth.uid() AND role IN ('owner', 'staff')
            ) INTO result;
            RETURN result;
        EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
            RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql STABLE SECURITY DEFINER
        SET search_path = public;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.is_owner()
        RETURNS BOOLEAN AS $$
        DECLARE
            result BOOLEAN;
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM public.users
                WHERE uuid = auth.uid() AND role = 'owner'
            ) INTO result;
            RETURN result;
        EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
            RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql STABLE SECURITY DEFINER
        SET search_path = public;
        """
    )

    # 4. Swap owner-only policies from is_admin() to is_owner().
    for table, old, cmd, new in _OWNER_ONLY_SWAPS:
        op.execute(f"DROP POLICY IF EXISTS {old} ON {table}")
    op.execute(_policy_sql(
        "audit_logs", "audit_logs_select_owner_policy", "SELECT",
        "public.is_owner()", None))
    op.execute(_policy_sql(
        "payroll_records", "payroll_owner_all_policy", "ALL",
        "public.is_owner()", None))
    op.execute(_policy_sql(
        "commission_rules", "commission_owner_all_policy", "ALL",
        "public.is_owner()", None))
    op.execute(_policy_sql(
        "employee_info", "employee_info_owner_all_policy", "ALL",
        "public.is_owner()", None))
    op.execute(_policy_sql(
        "system_settings", "settings_owner_insert_policy", "INSERT",
        None, "public.is_owner()"))
    op.execute(_policy_sql(
        "system_settings", "settings_owner_update_policy", "UPDATE",
        "public.is_owner()", "(is_editable = TRUE)"))
    op.execute(_policy_sql(
        "system_settings", "settings_owner_delete_policy", "DELETE",
        "public.is_owner()", "(is_editable = TRUE)"))

    # 5. staff_invites ledger (mirrors technician_invites, owner-managed).
    op.create_table(
        "staff_invites",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("token_hash", sa.String(255), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_by_owner_id",
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
    op.create_index("idx_staff_invites_email", "staff_invites", ["email"])
    op.create_index("idx_staff_invites_token_hash", "staff_invites", ["token_hash"])
    op.execute("ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY staff_invites_owner_all_policy ON staff_invites "
        "FOR ALL USING (public.is_owner())"
    )


def downgrade() -> None:
    # Caller must remap owner/staff rows to admin/customer first, else the
    # re-narrowed CHECK below fails loudly (safe failure, no silent loss).
    op.execute("DROP POLICY IF EXISTS staff_invites_owner_all_policy ON staff_invites")
    op.drop_table("staff_invites")
    for table, _old, _cmd, new in _OWNER_ONLY_SWAPS:
        op.execute(f"DROP POLICY IF EXISTS {new} ON {table}")
    op.execute(_policy_sql(
        "audit_logs", "audit_logs_select_admin_policy", "SELECT",
        "public.is_admin()", None))
    op.execute(_policy_sql(
        "payroll_records", "payroll_admin_all_policy", "ALL",
        "public.is_admin()", None))
    op.execute(_policy_sql(
        "commission_rules", "commission_admin_all_policy", "ALL",
        "public.is_admin()", None))
    op.execute(_policy_sql(
        "employee_info", "employee_info_admin_all_policy", "ALL",
        "public.is_admin()", None))
    op.execute(_policy_sql(
        "system_settings", "settings_admin_insert_policy", "INSERT",
        None, "public.is_admin()"))
    op.execute(_policy_sql(
        "system_settings", "settings_admin_update_policy", "UPDATE",
        "public.is_admin()", "(is_editable = TRUE)"))
    op.execute(_policy_sql(
        "system_settings", "settings_admin_delete_policy", "DELETE",
        "public.is_admin()", "(is_editable = TRUE)"))
    op.execute("DROP FUNCTION IF EXISTS public.is_owner()")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.is_admin()
        RETURNS BOOLEAN AS $$
        DECLARE
            result BOOLEAN;
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM public.users
                WHERE uuid = auth.uid() AND role = 'admin'
            ) INTO result;
            RETURN result;
        EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
            RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql STABLE SECURITY DEFINER
        SET search_path = public;
        """
    )
    for grant in ("can_approve_technicians", "can_execute_refunds", "can_view_audit"):
        op.drop_column("users", grant)
    op.drop_column("users", "position")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role_valid")
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT chk_users_role_valid "
        "CHECK (role IN ('admin', 'customer', 'technician'))"
    )
