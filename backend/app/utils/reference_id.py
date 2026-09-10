"""Canonical booking reference IDs (CONTRACTS.md C4).

Format: KJAC-YYYY-XXXXXX — 6 uppercase alphanumerics, non-sequential.
Server-side generation only; DB CHECK constraint enforces the same pattern.
"""

import random
import re
import string
from datetime import UTC, datetime

REFERENCE_ID_PATTERN = re.compile(r"^KJAC-\d{4}-[A-Z0-9]{6}$")
_REFERENCE_ALPHABET = string.ascii_uppercase + string.digits


def generate_reference_id(now: datetime | None = None) -> str:
    moment = now or datetime.now(UTC)
    random_part = "".join(random.choices(_REFERENCE_ALPHABET, k=6))
    return f"KJAC-{moment.year}-{random_part}"


def is_valid_reference_id(value: str) -> bool:
    return bool(REFERENCE_ID_PATTERN.match(value))
