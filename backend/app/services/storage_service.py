"""Receipt/image storage: local dir (dev default) or Supabase Storage (prod).

Keys look like `receipts/{booking_id}/{uuid}.webp`. Virus scanning is a stub
interface (scan_upload) — wire ClamAV/attachment-av before handling real PII.
"""

import io
import logging
import uuid
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)

ALLOWED_MAGIC = {
    "jpeg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "webp": (b"RIFF",),
    "heic": (b"ftypheic", b"ftypheix", b"ftyphevc", b"ftyphevx", b"ftypmif1", b"ftypmsf1"),
}

WEBP_QUALITY = 85
MAX_DIMENSION = 2048


def detect_kind(data: bytes) -> str | None:
    head = data[:12]
    if head.startswith(ALLOWED_MAGIC["jpeg"]):
        return "jpeg"
    if head.startswith(ALLOWED_MAGIC["png"]):
        return "png"
    if head.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "webp"
    if b"ftyp" in data[4:12]:
        for magic in ALLOWED_MAGIC["heic"]:
            if magic in data[4:12]:
                return "heic"
    return None


def scan_upload(data: bytes) -> None:
    """Virus/malware scan hook. MVP: size sanity only — plug in ClamAV here."""
    if not data:
        raise AppError("PAYMENT_001", "Empty file.", 400)


def to_webp(data: bytes, kind: str) -> bytes:
    """Convert raster uploads to WebP; HEIC passes through (needs pillow-heif)."""
    if kind == "heic":
        logger.info("heic upload stored without conversion (pillow-heif not installed)")
        return data
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise AppError("PAYMENT_001", "Unreadable image file.", 400) from exc
    if image.mode in ("RGBA", "LA", "PA"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[-1])
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")
    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION))
    output = io.BytesIO()
    image.save(output, format="WEBP", quality=WEBP_QUALITY, method=6)
    return output.getvalue()


class StorageService:
    def __init__(self) -> None:
        self.backend = settings.storage_backend
        self.root = Path(settings.storage_dir)

    def save_receipt(self, booking_id: int, filename: str, data: bytes) -> str:
        """Validate, convert, store. Returns the storage key."""
        if len(data) > settings.max_upload_mb * 1024 * 1024:
            raise AppError(
                "PAYMENT_001",
                f"File exceeds {settings.max_upload_mb}MB.",
                400,
            )
        kind = detect_kind(data)
        if kind is None:
            raise AppError("PAYMENT_001", "Only JPG, PNG, WebP, HEIC images.", 400)
        scan_upload(data)
        payload = to_webp(data, kind)
        extension = "webp" if kind != "heic" else "heic"
        key = f"receipts/{booking_id}/{uuid.uuid4().hex}.{extension}"
        if self.backend == "supabase":
            return self._save_supabase(key, payload)
        target = self.root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        return key

    def _save_supabase(self, key: str, payload: bytes) -> str:
        from supabase import create_client

        if not settings.supabase_service_key:
            raise AppError("PAYMENT_002", "Supabase storage not configured.", 500)
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        client.storage.from_("receipts").upload(
            key.split("receipts/", 1)[1],
            payload,
            {"content-type": "image/webp"},
        )
        return key

    def read(self, key: str) -> tuple[bytes, str]:
        """Return (bytes, content_type). Local backend only for now."""
        if self.backend == "supabase":
            raise AppError("PAYMENT_002", "Serve receipts from Supabase URLs.", 500)
        target = (self.root / key).resolve()
        if self.root.resolve() not in target.parents:
            raise AppError("PERM_001", "Invalid file path.", 403)
        if not target.is_file():
            raise AppError("BOOKING_001", "Receipt not found.", 404)
        content_type = "image/webp" if target.suffix == ".webp" else "image/heic"
        return target.read_bytes(), content_type


def get_storage_service() -> StorageService:
    return StorageService()
