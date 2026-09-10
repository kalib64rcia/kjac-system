"""Timezone helpers — Asia/Manila is the business timezone (BUSINESS_RULES.md)."""

from datetime import datetime
from zoneinfo import ZoneInfo

MANILA_TZ = ZoneInfo("Asia/Manila")


def now_manila() -> datetime:
    return datetime.now(MANILA_TZ)
