"""Landing content keys (category 'landing'): admin-editable public site copy.

Curated set only (hero/about/mission/vision/contact/announcement/FAQs/
section flags). Services/brands stay catalog-driven; testimonials go live
from customer ratings later. Served publicly via GET /v1/content/landing.
"""

revision = "0d000013"
down_revision = "0c000012"
branch_labels = None
depends_on = None

from alembic import op

_SETTINGS = [
    ("hero_title", "KLEIN & JUSTIN AIRCONDITIONING", "string", "landing",
     "Landing hero business name (H1)"),
    ("hero_description", ("Laguna's authorized Daikin partner for aircon "
     "installation, repair, and maintenance — certified technicians, "
     "genuine parts."), "string", "landing",
     "Landing hero short business description"),
    ("about_text", ("Klein & Justin Airconditioning has been serving Laguna "
     "with professional aircon installation, repair, and maintenance "
     "services for homes and businesses."), "string", "landing",
     "About section body text"),
    ("mission_text", "", "string", "landing",
     "Mission section text (empty = hidden until filled)"),
    ("vision_text", "", "string", "landing",
     "Vision section text (empty = hidden until filled)"),
    ("contact_phone_secondary", "", "string", "landing",
     "Second contact number (empty = hidden)"),
    ("business_hours", "Monday–Saturday, 8:00 AM – 5:00 PM", "string",
     "landing", "Business hours line"),
    ("facebook_url", "https://facebook.com/abadeciomar", "string",
     "landing", "Facebook page URL"),
    ("announcement_text", "", "string", "landing",
     "Promo band text (empty = hidden)"),
    ("announcement_enabled", "false", "boolean", "landing",
     "Show the announcement band"),
    ("faq_items", "[]", "json", "landing",
     "FAQ entries as [{\"q\": ..., \"a\": ...}]"),
    ("show_testimonials", "true", "boolean", "landing",
     "Show the testimonials section"),
    ("show_gallery", "true", "boolean", "landing",
     "Show the gallery section"),
    ("show_faq", "true", "boolean", "landing",
     "Show the FAQ section"),
]


def upgrade() -> None:
    for key, value, dtype, category, desc in _SETTINGS:
        op.execute(
            "INSERT INTO system_settings "
            "(setting_key, setting_value, data_type, category, description) "
            f"VALUES ({_q(key)}, {_q(value)}, {_q(dtype)}, {_q(category)}, {_q(desc)}) "
            "ON CONFLICT (setting_key) DO NOTHING"
        )


def downgrade() -> None:
    op.execute("DELETE FROM system_settings WHERE category = 'landing'")


def _q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"
