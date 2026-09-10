"""Inventory, HR/payroll, audit logs + audit triggers."""

revision = "e5f6000005"
down_revision = "d4e5f60004"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


def upgrade() -> None:
    op.create_table(
        "inventory_items",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("sku", sa.String(50), unique=True, nullable=False),
        sa.Column("qr_code", sa.String(100), unique=True),
        sa.Column("barcode", sa.String(100)),
        sa.Column("item_type", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("brand_id", sa.BigInteger,
                  sa.ForeignKey("aircon_brands.id", ondelete="SET NULL")),
        sa.Column("model_number", sa.String(100)),
        sa.Column("part_number", sa.String(100)),
        sa.Column("compatible_brands", postgresql.ARRAY(sa.Text)),
        sa.Column("quantity", sa.Integer, nullable=False, server_default="0"),
        sa.Column("minimum_stock_level", sa.Integer, server_default="10"),
        sa.Column("unit_of_measure", sa.String(20), server_default="piece"),
        sa.Column("unit_cost", sa.Numeric(10, 2), nullable=False),
        sa.Column("selling_price", sa.Numeric(10, 2)),
        sa.Column("storage_location", sa.String(100)),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        sa.Column("image_url", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "item_type IN ('aircon_unit', 'replacement_part', 'tool', 'consumable')",
            name="chk_inventory_type_valid"),
        sa.CheckConstraint("quantity >= 0", name="chk_inventory_quantity"),
        sa.CheckConstraint("unit_cost >= 0", name="chk_inventory_unit_cost"),
        sa.CheckConstraint("selling_price >= 0", name="chk_inventory_selling_price"),
    )
    op.create_index("idx_inventory_sku", "inventory_items", ["sku"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_inventory_qr_code", "inventory_items", ["qr_code"],
                    postgresql_where=sa.text("qr_code IS NOT NULL"))
    op.create_index("idx_inventory_barcode", "inventory_items", ["barcode"],
                    postgresql_where=sa.text("barcode IS NOT NULL"))
    op.create_index("idx_inventory_type", "inventory_items", ["item_type"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_inventory_brand_id", "inventory_items", ["brand_id"],
                    postgresql_where=sa.text("brand_id IS NOT NULL"))

    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("inventory_item_id", sa.BigInteger,
                  sa.ForeignKey("inventory_items.id", ondelete="RESTRICT"),
                  nullable=False),
        sa.Column("user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="SET NULL")),
        sa.Column("movement_type", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("previous_quantity", sa.Integer, nullable=False),
        sa.Column("new_quantity", sa.Integer, nullable=False),
        sa.Column("reason", sa.Text),
        sa.Column("reference_number", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "movement_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', "
            "'damaged', 'returned')",
            name="chk_movements_type_valid"),
    )
    op.create_index("idx_movements_item_id", "inventory_movements", ["inventory_item_id"])
    op.create_index("idx_movements_user_id", "inventory_movements", ["user_id"])
    op.create_index("idx_movements_booking_id", "inventory_movements", ["booking_id"],
                    postgresql_where=sa.text("booking_id IS NOT NULL"))
    op.create_index("idx_movements_type", "inventory_movements", ["movement_type"])
    op.create_index("idx_movements_created_at", "inventory_movements",
                    [sa.text("created_at DESC")])

    # SECURITY DEFINER so tech/admin writes always sync quantity + alert
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE public.inventory_items
            SET quantity = NEW.new_quantity, updated_at = NOW()
            WHERE id = NEW.inventory_item_id;

            IF NEW.new_quantity <= (
                SELECT minimum_stock_level FROM public.inventory_items
                WHERE id = NEW.inventory_item_id
            ) THEN
                INSERT INTO public.notifications
                    (user_id, type, title, message, data)
                SELECT u.id, 'low_stock_alert', 'Low Stock Alert',
                    'Item ' || ii.name || ' is running low (Quantity: '
                    || NEW.new_quantity || ')',
                    jsonb_build_object('inventory_item_id', NEW.inventory_item_id,
                                       'quantity', NEW.new_quantity)
                FROM public.users u
                CROSS JOIN public.inventory_items ii
                WHERE u.role = 'admin' AND u.deleted_at IS NULL
                AND ii.id = NEW.inventory_item_id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )
    op.execute(
        "CREATE TRIGGER update_inventory_quantity_trigger "
        "AFTER INSERT ON inventory_movements FOR EACH ROW "
        "EXECUTE FUNCTION public.update_inventory_quantity()"
    )

    op.create_table(
        "booking_inventory_usage",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("booking_id", sa.BigInteger,
                  sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inventory_item_id", sa.BigInteger,
                  sa.ForeignKey("inventory_items.id", ondelete="RESTRICT"),
                  nullable=False),
        sa.Column("quantity_used", sa.Integer, nullable=False),
        sa.Column("unit_cost", sa.Numeric(10, 2), nullable=False),
        sa.Column("total_cost", sa.Numeric(10, 2), nullable=False),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("quantity_used > 0", name="chk_usage_quantity_positive"),
    )
    op.create_index("idx_booking_inventory_booking_id", "booking_inventory_usage",
                    ["booking_id"])
    op.create_index("idx_booking_inventory_item_id", "booking_inventory_usage",
                    ["inventory_item_id"])

    op.create_table(
        "employee_info",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  unique=True, nullable=False),
        sa.Column("tin", sa.String(50)),
        sa.Column("sss_number", sa.String(50)),
        sa.Column("philhealth_number", sa.String(50)),
        sa.Column("pagibig_number", sa.String(50)),
        sa.Column("bank_name", sa.String(100)),
        sa.Column("bank_account_number", sa.String(50)),
        sa.Column("bank_account_name", sa.String(200)),
        sa.Column("emergency_contact_name", sa.String(200)),
        sa.Column("emergency_contact_relationship", sa.String(50)),
        sa.Column("emergency_contact_phone", sa.String(25)),
        sa.Column("employment_start_date", sa.Date),
        sa.Column("employment_end_date", sa.Date),
        sa.Column("employment_status", sa.String(20)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "employment_status IN ('active', 'on_leave', 'terminated', 'resigned')",
            name="chk_employee_status_valid"),
    )
    op.create_index("idx_employee_info_user_id", "employee_info", ["user_id"])
    op.create_index("idx_employee_info_employment_status", "employee_info",
                    ["employment_status"])

    op.create_table(
        "payroll_records",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("employee_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("processed_by_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("period_start_date", sa.Date, nullable=False),
        sa.Column("period_end_date", sa.Date, nullable=False),
        sa.Column("payment_date", sa.Date, nullable=False),
        sa.Column("base_salary", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("commission", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("overtime_pay", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("bonuses", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("other_earnings", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("total_earnings", sa.Numeric(10, 2), nullable=False),
        sa.Column("tax_withheld", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("sss_contribution", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("philhealth_contribution", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("pagibig_contribution", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("other_deductions", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("total_deductions", sa.Numeric(10, 2), nullable=False),
        sa.Column("net_pay", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("payment_method", sa.String(20)),
        sa.Column("notes", sa.Text),
        sa.Column("payslip_url", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('pending', 'approved', 'paid', 'cancelled')",
                           name="chk_payroll_status_valid"),
        sa.CheckConstraint("payment_method IN ('bank_transfer', 'cash', 'gcash')",
                           name="chk_payroll_method_valid"),
    )
    op.create_index("idx_payroll_employee_id", "payroll_records", ["employee_user_id"])
    op.create_index("idx_payroll_period", "payroll_records",
                    ["period_start_date", "period_end_date"])
    op.create_index("idx_payroll_payment_date", "payroll_records", ["payment_date"])
    op.create_index("idx_payroll_status", "payroll_records", ["status"])

    op.create_table(
        "commission_rules",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("service_id", sa.BigInteger,
                  sa.ForeignKey("services.id", ondelete="CASCADE")),
        sa.Column("commission_type", sa.String(20), nullable=False),
        sa.Column("commission_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("applies_to_all_services", sa.Boolean, server_default=sa.false()),
        sa.Column("effective_from", sa.Date, nullable=False),
        sa.Column("effective_until", sa.Date),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("commission_type IN ('percentage', 'fixed_amount')",
                           name="chk_commission_type_valid"),
    )
    op.create_index("idx_commission_service_id", "commission_rules", ["service_id"],
                    postgresql_where=sa.text("service_id IS NOT NULL"))
    op.create_index("idx_commission_effective", "commission_rules",
                    ["effective_from", "effective_until"],
                    postgresql_where=sa.text("is_active = TRUE"))

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("table_name", sa.String(50), nullable=False),
        sa.Column("record_id", sa.BigInteger, nullable=False),
        sa.Column("action", sa.String(10), nullable=False),
        sa.Column("old_data", postgresql.JSONB),
        sa.Column("new_data", postgresql.JSONB),
        sa.Column("changed_fields", postgresql.ARRAY(sa.Text)),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text),
        sa.Column("request_id", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')",
                           name="chk_audit_action_valid"),
    )
    op.create_index("idx_audit_table_record", "audit_logs", ["table_name", "record_id"])
    op.create_index("idx_audit_user_id", "audit_logs", ["user_id"],
                    postgresql_where=sa.text("user_id IS NOT NULL"))
    op.create_index("idx_audit_action", "audit_logs", ["action"])
    op.create_index("idx_audit_created_at", "audit_logs", [sa.text("created_at DESC")])
    op.create_index("idx_audit_table_name", "audit_logs", ["table_name"])

    # Generic audit triggers on money/state tables (auth.uid() NULL-safe via helper)
    for table in ("users", "bookings", "payments", "refunds", "inventory_items",
                  "payroll_records"):
        op.execute(
            f"CREATE TRIGGER audit_{table}_trigger "
            f"AFTER INSERT OR UPDATE OR DELETE ON {table} FOR EACH ROW "
            "EXECUTE FUNCTION public.audit_trigger_function()"
        )

    for table in ("inventory_items", "employee_info", "payroll_records",
                  "commission_rules"):
        op.execute(
            f"CREATE TRIGGER update_{table}_updated_at BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()"
        )


def downgrade() -> None:
    for table in ("inventory_items", "employee_info", "payroll_records",
                  "commission_rules"):
        op.execute(f"DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table}")
    for table in ("users", "bookings", "payments", "refunds", "inventory_items",
                  "payroll_records"):
        op.execute(f"DROP TRIGGER IF EXISTS audit_{table}_trigger ON {table}")
    op.execute("DROP TRIGGER IF EXISTS update_inventory_quantity_trigger "
               "ON inventory_movements")
    op.execute("DROP FUNCTION IF EXISTS public.update_inventory_quantity()")
    for table in ("audit_logs", "commission_rules", "payroll_records",
                  "employee_info", "booking_inventory_usage", "inventory_movements",
                  "inventory_items"):
        op.drop_table(table)
