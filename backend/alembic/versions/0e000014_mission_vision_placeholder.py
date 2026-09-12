"""Mission/vision placeholder copy (lorem ipsum — replace before launch).

TRACKED PLACEHOLDER: real business wording replaces these values via Admin
Settings; no code change needed.
"""

revision = "0e000014"
down_revision = "0d000013"
branch_labels = None
depends_on = None

from alembic import op

_MISSION = (
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin tincidunt "
    "arcu vitae nisl faucibus, at placerat nunc interdum. Cras vitae lorem "
    "quis justo fermentum ultricies."
)
_VISION = (
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod "
    "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim "
    "veniam, quis nostrud exercitation."
)


def upgrade() -> None:
    op.execute(
        "UPDATE system_settings SET setting_value = "
        f"{_q(_MISSION)} WHERE setting_key = 'mission_text'"
    )
    op.execute(
        "UPDATE system_settings SET setting_value = "
        f"{_q(_VISION)} WHERE setting_key = 'vision_text'"
    )


def downgrade() -> None:
    op.execute("UPDATE system_settings SET setting_value = '' "
               "WHERE setting_key IN ('mission_text', 'vision_text')")


def _q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"
