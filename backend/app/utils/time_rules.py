"""Timezone helpers — Asia/Manila is the business timezone (BUSINESS_RULES.md).

Display formatters live here too (single home for every human date/time
string): date-only values never grow a phantom midnight, time-only values
render 12-hour, empties read "empty", booleans read Yes/No.
"""

import calendar
from datetime import date, datetime, time
from typing import Any
from zoneinfo import ZoneInfo

MANILA_TZ = ZoneInfo("Asia/Manila")


def now_manila() -> datetime:
    return datetime.now(MANILA_TZ)


def _manila(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=MANILA_TZ)
    return value.astimezone(MANILA_TZ)


def _clock(hour: int, minute: int) -> str:
    return f"{hour % 12 or 12}:{minute:02d} {'AM' if hour < 12 else 'PM'}"


def format_manila_date(value: date | datetime | str | None) -> str:
    """'Sep 12, 2026' ('' when empty). Date-only input stays date-only."""
    day = _as_date(value)
    if day is None:
        return ""
    return f"{calendar.month_abbr[day.month]} {day.day}, {day.year}"


def format_manila_time(value: time | datetime | str | None) -> str:
    """'8:00 AM' ('' when empty)."""
    moment = _as_time(value)
    if moment is None:
        return ""
    return _clock(moment[0], moment[1])


def format_manila_datetime(value: datetime | str | None) -> str:
    """'Sep 12, 2026, 8:00 AM' ('' when empty)."""
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value)
        except ValueError:
            return value
    if not isinstance(value, datetime):
        return ""
    local = _manila(value)
    return (
        f"{calendar.month_abbr[local.month]} {local.day}, {local.year}, "
        f"{_clock(local.hour, local.minute)}"
    )


def plain_value(value: Any) -> str:
    """Owner-words scalar: dates/times formatted, bools Yes/No, None empty."""
    if value is None:
        return "empty"
    if value is True:
        return "Yes"
    if value is False:
        return "No"
    if isinstance(value, datetime):
        return format_manila_datetime(value)
    if isinstance(value, date):
        return format_manila_date(value)
    if isinstance(value, time):
        return format_manila_time(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return "empty"
        day = _as_date(text)
        if day is not None and len(text) == 10:
            return format_manila_date(day)
        moment = _as_time(text)
        if moment is not None and len(text) <= 8:
            return _clock(*moment)
        return text
    return str(value)


def _as_date(value: Any) -> date | None:
    if isinstance(value, datetime):
        return _manila(value).date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value.strip()[:10])
        except ValueError:
            return None
    return None


def _as_time(value: Any) -> tuple[int, int] | None:
    if isinstance(value, datetime):
        local = _manila(value)
        return local.hour, local.minute
    if isinstance(value, time):
        return value.hour, value.minute
    if isinstance(value, str):
        try:
            parsed = time.fromisoformat(value.strip())
            return parsed.hour, parsed.minute
        except ValueError:
            return None
    return None
