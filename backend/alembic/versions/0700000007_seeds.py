"""Seed data: brands, settings, baseline services, default commission.

R4: GCash account values are PLACEHOLDERS — the real account number/name must
be entered via Admin Settings from the environment, never committed here.
Service prices are DEV SEEDS for FK wiring; admin must confirm pricing.
"""

revision = "0700000007"
down_revision = "f600000006"
branch_labels = None
depends_on = None

from alembic import op

_BRANDS = [
    ("Daikin", "daikin", True, "Official Partner", "#0066CC", 1),
    ("Carrier", "carrier", False, None, None, 2),
    ("Panasonic", "panasonic", False, None, None, 3),
    ("LG", "lg", False, None, None, 4),
    ("Samsung", "samsung", False, None, None, 5),
    ("Hitachi", "hitachi", False, None, None, 6),
    ("Midea", "midea", False, None, None, 7),
    ("TCL", "tcl", False, None, None, 8),
    ("Sharp", "sharp", False, None, None, 9),
    ("Toshiba", "toshiba", False, None, None, 10),
]

_SETTINGS = [
    ("booking_expiration_hours", "3", "integer", "booking",
     "Hours until booking expires without payment"),
    ("login_max_attempts", "5", "integer", "rate_limiting",
     "Maximum failed login attempts before lockout"),
    ("login_lockout_minutes", "15", "integer", "rate_limiting",
     "Minutes account is locked after max failed attempts"),
    ("booking_rate_limit_count", "3", "integer", "rate_limiting",
     "Maximum bookings per time window"),
    ("booking_rate_limit_minutes", "30", "integer", "rate_limiting",
     "Time window for booking rate limit (minutes)"),
    ("archive_auto_delete_days", "30", "integer", "system",
     "Days before archived records are permanently deleted"),
    ("business_email", "abadeciomar@yahoo.com", "string", "business",
     "Business contact email (public)"),
    ("business_phone", "0926-633-3129", "string", "business",
     "Business contact phone (public)"),
    ("session_timeout_minutes", "30", "integer", "auth",
     "Web admin session timeout (minutes)"),
    ("api_rate_limit_public", "100", "integer", "rate_limiting",
     "Public API requests per minute"),
    ("api_rate_limit_authenticated", "300", "integer", "rate_limiting",
     "Authenticated API requests per minute"),
    ("api_rate_limit_admin", "500", "integer", "rate_limiting",
     "Admin API requests per minute"),
    ("gcash_account_number", "0000-000-0000", "string", "payment",
     "PLACEHOLDER — set real GCash number in Admin Settings"),
    ("gcash_account_name", "CHANGE-ME", "string", "payment",
     "PLACEHOLDER — set real GCash account name in Admin Settings"),
    ("allow_sunday_bookings", "false", "boolean", "booking",
     "Allow customers to book appointments on Sunday"),
]

# DEV SEEDS — admin must confirm pricing before launch
_SERVICES = [
    ("General Cleaning", "general-cleaning", "Standard aircon general cleaning service.",
     1500.00, 500.00, "fixed", 90, 1),
    ("Repair", "repair", "Aircon diagnostic and repair service.",
     2500.00, 800.00, "fixed", 150, 2),
    ("Installation", "installation", "Split/window-type aircon installation service.",
     8000.00, 1000.00, "fixed", 240, 3),
    ("Preventive Maintenance", "preventive-maintenance",
     "Scheduled preventive maintenance visit.", 1200.00, 400.00, "fixed", 60, 4),
]


def upgrade() -> None:
    for name, slug, partner, badge, color, order in _BRANDS:
        op.execute(
            "INSERT INTO aircon_brands "
            "(name, slug, is_partner, badge_text, badge_color, display_order) "
            f"VALUES ({_q(name)}, {_q(slug)}, {str(partner).upper()}, "
            f"{_q(badge)}, {_q(color)}, {order}) "
            "ON CONFLICT (slug) DO NOTHING"
        )
    for key, value, dtype, category, desc in _SETTINGS:
        op.execute(
            "INSERT INTO system_settings "
            "(setting_key, setting_value, data_type, category, description) "
            f"VALUES ({_q(key)}, {_q(value)}, {_q(dtype)}, {_q(category)}, {_q(desc)}) "
            "ON CONFLICT (setting_key) DO NOTHING"
        )
    for name, slug, desc, base, down, dtype, mins, order in _SERVICES:
        op.execute(
            "INSERT INTO services "
            "(name, slug, description, base_price, down_payment_amount, "
            "down_payment_type, estimated_duration_minutes, display_order) "
            f"VALUES ({_q(name)}, {_q(slug)}, {_q(desc)}, {base}, {down}, "
            f"{_q(dtype)}, {mins}, {order}) "
            "ON CONFLICT (slug) DO NOTHING"
        )
    op.execute(
        "INSERT INTO commission_rules "
        "(commission_type, commission_value, applies_to_all_services, "
        "effective_from, is_active) "
        "VALUES ('percentage', 10.00, TRUE, DATE '2026-01-01', TRUE)"
    )


def downgrade() -> None:
    op.execute("DELETE FROM commission_rules WHERE applies_to_all_services = TRUE "
               "AND commission_value = 10.00")
    op.execute("DELETE FROM services WHERE slug IN ('general-cleaning', 'repair', "
               "'installation', 'preventive-maintenance')")
    op.execute("DELETE FROM system_settings WHERE setting_key IN "
               "('booking_expiration_hours', 'login_max_attempts', 'login_lockout_minutes', "
               "'booking_rate_limit_count', 'booking_rate_limit_minutes', "
               "'archive_auto_delete_days', 'business_email', 'business_phone', "
               "'session_timeout_minutes', 'api_rate_limit_public', "
               "'api_rate_limit_authenticated', 'api_rate_limit_admin', "
               "'gcash_account_number', 'gcash_account_name', 'allow_sunday_bookings')")
    op.execute("DELETE FROM aircon_brands WHERE slug IN "
               "('daikin', 'carrier', 'panasonic', 'lg', 'samsung', 'hitachi', "
               "'midea', 'tcl', 'sharp', 'toshiba')")


def _q(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"
