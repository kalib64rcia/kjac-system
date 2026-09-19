"""Settings: public-content keys + deprecate capacity leftovers.

Seeds the rows the redesigned Settings page edits (reminder toggles never
had rows — PATCH 404s without them; contact_address was rendered from a
hardcoded fallback; structured business-hours keys are new). Marks the
capacity-display settings (reserve/threshold/hold) deprecated: the booking
flow is date-only since 10000029, so nothing reads them.
"""

revision = "1000002c"
down_revision = "1789669764"
branch_labels = None
depends_on = None

from alembic import op

_NEW_SETTINGS = [
    ("reminder_booking_tomorrow_enabled", "true", "boolean", "booking",
     "Send reminders for tomorrow's bookings"),
    ("reminder_payment_expiring_enabled", "true", "boolean", "booking",
     "Warn about payments expiring within 2 hours"),
    ("business_open_days", "[1,1,1,1,1,1,0]", "json", "landing",
     "Days open, Mon-Sun as 1/0"),
    ("business_open_time", "08:00", "string", "landing",
     "Opening time (24-hour)"),
    ("business_close_time", "17:00", "string", "landing",
     "Closing time (24-hour)"),
    ("contact_address", "060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna",
     "string", "landing", "Shop address (public)"),
]

_DEPRECATED = (
    "slot_house_reserve",
    "slot_low_threshold",
    "slot_hold_minutes",
)


def upgrade() -> None:
    for key, value, dtype, category, desc in _NEW_SETTINGS:
        op.execute(
            "INSERT INTO system_settings "
            "(setting_key, setting_value, data_type, category, description) "
            f"VALUES ({_q(key)}, {_q(value)}, {_q(dtype)}, {_q(category)}, {_q(desc)}) "
            "ON CONFLICT (setting_key) DO NOTHING"
        )
    op.execute(
        "UPDATE system_settings SET description = "
        "'DEPRECATED — capacity display removed; editing has no effect.' "
        f"WHERE setting_key IN {_in(_DEPRECATED)}"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE system_settings SET description = "
        "'Seats per slot hidden from public availability (walk-ins and regulars)' "
        "WHERE setting_key = 'slot_house_reserve'"
    )
    op.execute(
        "UPDATE system_settings SET description = "
        "'Public seats left at or below which a slot reads filling' "
        "WHERE setting_key = 'slot_low_threshold'"
    )
    op.execute(
        "UPDATE system_settings SET description = "
        "'Guest slot-hold lifetime in minutes' "
        "WHERE setting_key = 'slot_hold_minutes'"
    )
    op.execute(
        "DELETE FROM system_settings WHERE setting_key IN "
        "('reminder_booking_tomorrow_enabled', 'reminder_payment_expiring_enabled', "
        "'business_open_days', 'business_open_time', 'business_close_time', "
        "'contact_address')"
    )


def _q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _in(keys: tuple[str, ...]) -> str:
    return "(" + ", ".join(_q(k) for k in keys) + ")"
