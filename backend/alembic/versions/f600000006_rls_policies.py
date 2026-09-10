"""Row Level Security: enable + policies on all tables.

Design (CONTRACTS.md R2/U1/R1 notes):
- Own-data checks use auth.uid() directly (no users-table lookup, no recursion)
- Admin checks use public.is_admin() / public.current_app_user_id() helpers
- Guest walk-ins: bookings INSERT with customer_id IS NULL (Turnstile + IP
  rate limit enforced in FastAPI, Phase 2)
- Customers may UPDATE their own bookings (cancel/reschedule request path);
  status transitions are still enforced server-side in Phase 2
- inventory_items: public sees active rows only (hides unit_cost internals
  from anon); admins see all
- system_settings: split policies so is_editable is enforced on UPDATE/DELETE
"""

revision = "f600000006"
down_revision = "e5f6000005"
branch_labels = None
depends_on = None

from alembic import op

_TABLES = [
    "users", "admin_two_fa_codes", "user_sessions",
    "psgc_regions", "psgc_provinces", "psgc_cities_municipalities", "psgc_barangays",
    "services", "service_images", "aircon_brands", "brand_images",
    "system_settings", "bookings", "booking_status_history", "reschedule_requests",
    "payments", "refunds", "ratings", "message_threads", "messages",
    "notifications", "inventory_items", "inventory_movements",
    "booking_inventory_usage", "employee_info", "payroll_records",
    "commission_rules", "audit_logs",
]

_POLICIES = [
    # users
    ("users", "users_select_own_policy", "SELECT", "(uuid = auth.uid())", None),
    ("users", "users_select_admin_policy", "SELECT", "public.is_admin()", None),
    ("users", "users_update_own_policy", "UPDATE", "(uuid = auth.uid())", None),
    ("users", "users_admin_all_policy", "ALL", "public.is_admin()", None),
    # 2fa codes: owner + admin
    ("admin_two_fa_codes", "twofa_select_policy", "SELECT",
     "(user_id = public.current_app_user_id()) OR public.is_admin()", None),
    ("admin_two_fa_codes", "twofa_admin_all_policy", "ALL",
     "public.is_admin()", None),
    # sessions
    ("user_sessions", "sessions_select_own_policy", "SELECT",
     "(user_id = public.current_app_user_id())", None),
    ("user_sessions", "sessions_delete_own_policy", "DELETE",
     "(user_id = public.current_app_user_id())", None),
    ("user_sessions", "sessions_admin_all_policy", "ALL",
     "public.is_admin()", None),
    # PSGC: public active reads, admin writes
    ("psgc_regions", "regions_select_all_policy", "SELECT", "(is_active = TRUE)", None),
    ("psgc_regions", "regions_admin_all_policy", "ALL", "public.is_admin()", None),
    ("psgc_provinces", "provinces_select_all_policy", "SELECT", "(is_active = TRUE)", None),
    ("psgc_provinces", "provinces_admin_all_policy", "ALL", "public.is_admin()", None),
    ("psgc_cities_municipalities", "cities_select_all_policy", "SELECT",
     "(is_active = TRUE)", None),
    ("psgc_cities_municipalities", "cities_admin_all_policy", "ALL",
     "public.is_admin()", None),
    ("psgc_barangays", "barangays_select_all_policy", "SELECT", "(is_active = TRUE)", None),
    ("psgc_barangays", "barangays_admin_all_policy", "ALL", "public.is_admin()", None),
    # catalog
    ("services", "services_select_active_policy", "SELECT",
     "(is_active = TRUE AND deleted_at IS NULL)", None),
    ("services", "services_admin_all_policy", "ALL", "public.is_admin()", None),
    ("service_images", "service_images_select_all_policy", "SELECT", "(TRUE)", None),
    ("service_images", "service_images_admin_all_policy", "ALL",
     "public.is_admin()", None),
    ("aircon_brands", "brands_select_active_policy", "SELECT",
     "(is_active = TRUE AND deleted_at IS NULL)", None),
    ("aircon_brands", "brands_admin_all_policy", "ALL", "public.is_admin()", None),
    ("brand_images", "brand_images_select_all_policy", "SELECT", "(TRUE)", None),
    ("brand_images", "brand_images_admin_all_policy", "ALL",
     "public.is_admin()", None),
    # settings: public read; admin writes honoring is_editable
    ("system_settings", "settings_select_all_policy", "SELECT", "(TRUE)", None),
    ("system_settings", "settings_admin_insert_policy", "INSERT", None,
     "public.is_admin()"),
    ("system_settings", "settings_admin_update_policy", "UPDATE",
     "public.is_admin()", "(is_editable = TRUE)"),
    ("system_settings", "settings_admin_delete_policy", "DELETE",
     "public.is_admin()", "(is_editable = TRUE)"),
    # bookings
    ("bookings", "bookings_select_policy", "SELECT",
     ("(customer_id = public.current_app_user_id()) OR "
      "(technician_id = public.current_app_user_id()) OR public.is_admin()"), None),
    ("bookings", "bookings_insert_policy", "INSERT", None,
     ("(customer_id = public.current_app_user_id()) OR "
      "(customer_id IS NULL) OR public.is_admin()")),
    ("bookings", "bookings_update_policy", "UPDATE",
     ("(customer_id = public.current_app_user_id()) OR "
      "(technician_id = public.current_app_user_id()) OR public.is_admin()"), None),
    ("bookings", "bookings_delete_admin_policy", "DELETE",
     "public.is_admin()", None),
    # history: related parties read; writes via trigger (SECURITY DEFINER)
    ("booking_status_history", "booking_history_select_policy", "SELECT",
     ("(booking_id IN (SELECT id FROM public.bookings WHERE "
      "customer_id = public.current_app_user_id() OR "
      "technician_id = public.current_app_user_id())) OR public.is_admin()"), None),
    # reschedule
    ("reschedule_requests", "reschedule_select_policy", "SELECT",
     "(requested_by_user_id = public.current_app_user_id()) OR public.is_admin()",
     None),
    ("reschedule_requests", "reschedule_insert_policy", "INSERT", None,
     "(requested_by_user_id = public.current_app_user_id())"),
    ("reschedule_requests", "reschedule_update_admin_policy", "UPDATE",
     "public.is_admin()", None),
    # payments / refunds (customer_id nullable for guests on payments)
    ("payments", "payments_select_policy", "SELECT",
     "(customer_id = public.current_app_user_id()) OR public.is_admin()", None),
    ("payments", "payments_insert_policy", "INSERT", None,
     ("(customer_id = public.current_app_user_id()) OR "
      "(customer_id IS NULL) OR public.is_admin()")),
    ("payments", "payments_update_admin_policy", "UPDATE",
     "public.is_admin()", None),
    ("refunds", "refunds_select_policy", "SELECT",
     "(requested_by_user_id = public.current_app_user_id()) OR public.is_admin()",
     None),
    ("refunds", "refunds_insert_policy", "INSERT", None,
     "(requested_by_user_id = public.current_app_user_id())"),
    ("refunds", "refunds_update_admin_policy", "UPDATE",
     "public.is_admin()", None),
    # ratings: public active reads; customers insert own; admin deletes
    ("ratings", "ratings_select_policy", "SELECT", "(deleted_at IS NULL)", None),
    ("ratings", "ratings_insert_customer_policy", "INSERT", None,
     "(customer_id = public.current_app_user_id())"),
    ("ratings", "ratings_delete_admin_policy", "DELETE",
     "public.is_admin()", None),
    # threads / messages
    ("message_threads", "threads_select_policy", "SELECT",
     ("(public.current_app_user_id() = ANY (participant_user_ids)) OR "
      "public.is_admin()"), None),
    ("message_threads", "threads_insert_policy", "INSERT", None,
     ("(public.current_app_user_id() = ANY (participant_user_ids)) OR "
      "public.is_admin()")),
    ("message_threads", "threads_update_policy", "UPDATE",
     ("(public.current_app_user_id() = ANY (participant_user_ids)) OR "
      "public.is_admin()"), None),
    ("messages", "messages_select_policy", "SELECT",
     ("(EXISTS (SELECT 1 FROM public.message_threads t WHERE t.id = messages.thread_id "
      "AND (public.current_app_user_id() = ANY (t.participant_user_ids)))) OR "
      "public.is_admin()"), None),
    ("messages", "messages_insert_policy", "INSERT", None,
     "(sender_id = public.current_app_user_id())"),
    # notifications: owner read/update; backend writes via service role / triggers
    ("notifications", "notifications_select_own_policy", "SELECT",
     "(user_id = public.current_app_user_id())", None),
    ("notifications", "notifications_update_own_policy", "UPDATE",
     "(user_id = public.current_app_user_id())", None),
    ("notifications", "notifications_admin_all_policy", "ALL",
     "public.is_admin()", None),
    # inventory: active rows visible to all authenticated reads; admin full
    ("inventory_items", "inventory_select_active_policy", "SELECT",
     "(is_active = TRUE AND deleted_at IS NULL)", None),
    ("inventory_items", "inventory_admin_all_policy", "ALL",
     "public.is_admin()", None),
    ("inventory_movements", "movements_select_policy", "SELECT",
     "public.is_admin()", None),
    ("inventory_movements", "movements_insert_policy", "INSERT", None,
     "public.is_admin()"),
    ("booking_inventory_usage", "booking_inventory_select_policy", "SELECT",
     "public.is_admin()", None),
    ("booking_inventory_usage", "booking_inventory_insert_policy", "INSERT", None,
     "public.is_admin()"),
    # hr
    ("employee_info", "employee_info_select_policy", "SELECT",
     "(user_id = public.current_app_user_id()) OR public.is_admin()", None),
    ("employee_info", "employee_info_admin_all_policy", "ALL",
     "public.is_admin()", None),
    ("payroll_records", "payroll_select_policy", "SELECT",
     "(employee_user_id = public.current_app_user_id()) OR public.is_admin()",
     None),
    ("payroll_records", "payroll_admin_all_policy", "ALL",
     "public.is_admin()", None),
    ("commission_rules", "commission_admin_all_policy", "ALL",
     "public.is_admin()", None),
    # audit: admin reads only; rows written by triggers
    ("audit_logs", "audit_logs_select_admin_policy", "SELECT",
     "public.is_admin()", None),
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
    # Local/vanilla Postgres has no Supabase auth schema, but Postgres
    # resolves auth.uid() when a POLICY is created. Create a stub ONLY when
    # the real function is absent — on Supabase this branch is skipped so the
    # genuine auth.uid() is never replaced. The stub reads a session setting
    # so local tests can impersonate a user via SET app.current_uid.
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'auth' AND p.proname = 'uid'
            ) THEN
                CREATE SCHEMA IF NOT EXISTS auth;
                CREATE FUNCTION auth.uid() RETURNS uuid
                LANGUAGE sql STABLE AS
                $func$
                    SELECT NULLIF(current_setting('app.current_uid', TRUE), '')::uuid
                $func$;
            END IF;
        END
        $$;
        """
    )
    for table in _TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    for table, name, cmd, using, check in _POLICIES:
        op.execute(_policy_sql(table, name, cmd, using, check))


def downgrade() -> None:
    for table, name, _cmd, _using, _check in reversed(_POLICIES):
        op.execute(f"DROP POLICY IF EXISTS {name} ON {table}")
    for table in _TABLES:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
