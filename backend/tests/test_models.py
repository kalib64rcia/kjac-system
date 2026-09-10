"""Model-metadata tests — no DB required (checks registry, not rows)."""

import app.models  # noqa: F401  (registers all tables)
from app.core.database import Base

EXPECTED_TABLES = {
    "users", "admin_two_fa_codes", "user_sessions",
    "psgc_regions", "psgc_provinces", "psgc_cities_municipalities", "psgc_barangays",
    "services", "service_images", "aircon_brands", "brand_images",
    "system_settings", "bookings", "booking_status_history", "reschedule_requests",
    "payments", "refunds", "ratings", "message_threads", "messages",
    "notifications", "inventory_items", "inventory_movements",
    "booking_inventory_usage", "employee_info", "payroll_records",
    "commission_rules", "audit_logs", "technician_invites",
}


def test_all_tables_registered() -> None:
    assert set(Base.metadata.tables) == EXPECTED_TABLES


def test_contract_deviations_present() -> None:
    users = Base.metadata.tables["users"]
    assert "password_hash" not in users.c  # C1: Supabase Auth only
    assert "remember_token" not in users.c
    assert "two_factor_secret" not in users.c
    assert users.c["phone"].type.length == 25

    bookings = Base.metadata.tables["bookings"]
    assert bookings.c["customer_id"].nullable is True  # U1: guest walk-ins

    movements = Base.metadata.tables["inventory_movements"]
    assert movements.c["user_id"].nullable is True  # R3 fix

    payments = Base.metadata.tables["payments"]
    assert payments.c["customer_id"].nullable is True  # guest uploads via booking
