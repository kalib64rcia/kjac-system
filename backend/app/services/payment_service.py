"""Payment upload (GCash manual verification, Phase 1) + admin verification.

Upload requires booking in submitted state, amount == down payment, and a
receipt image. Approve moves pending→confirmed; reject reverts to submitted
with a fresh 3h expiry (CONTRACTS.md C6).
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.financial import Payment
from app.services.booking_service import (
    _notify_admins,
    _notify_customer,
    get_booking_or_404,
)
from app.services.storage_service import StorageService


async def upload_payment(
    db: AsyncSession,
    storage: StorageService,
    *,
    booking_id: int,
    user_id: int | None,
    guest_email: str | None,
    filename: str,
    data: bytes,
    gcash_reference_number: str | None,
    amount: float,
    payment_method: str,
) -> Payment:
    booking = await get_booking_or_404(db, booking_id)
    if booking.status != "submitted":
        raise AppError("PAYMENT_001", "Payment can only be uploaded for submitted bookings.", 400)
    if abs(amount - float(booking.down_payment_amount)) > 0.01:
        raise AppError(
            "PAYMENT_001",
            f"Amount must equal the down payment ({booking.down_payment_amount}).", 400,
        )
    if payment_method == "gcash" and not (gcash_reference_number or "").strip():
        raise AppError("PAYMENT_001", "GCash reference number is required.", 400)

    key = storage.save_receipt(booking_id, filename, data)
    payment = Payment(
        booking_id=booking.id,
        customer_id=user_id if user_id is not None else booking.customer_id,
        payment_type="down_payment",
        amount=amount,
        payment_method=payment_method,
        gcash_reference_number=(gcash_reference_number or None),
        gcash_receipt_url=key,
        status="pending",
    )
    db.add(payment)
    booking.status = "pending"
    booking.expires_at = None  # pre-expiry upload clears the countdown
    await db.flush()
    await _notify_admins(
        db, "payment_uploaded", "Payment uploaded",
        f"{booking.reference_id}: {amount:.2f} ({payment_method})", booking.id,
    )
    await db.commit()
    await db.refresh(payment)
    return payment


async def _verified_holder_ref(
    db: AsyncSession, ref: str, payment_id: int
) -> str | None:
    """Reference id of the booking whose verified payment already spent this
    GCash number (None when unspent). Lets a 409 name where to look."""
    spent = await db.execute(
        select(Payment.booking_id).where(
            Payment.gcash_reference_number == ref,
            Payment.status == "verified",
            Payment.id != payment_id,
        )
    )
    holder_id = spent.scalar_one_or_none()
    if holder_id is None:
        return None
    holder = await get_booking_or_404(db, holder_id)
    return holder.reference_id


async def verify_payment(
    db: AsyncSession, payment_id: int, admin_id: int, approve: bool,
    rejection_reason: str | None,
) -> Payment:
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise AppError("PAYMENT_002", "Payment not found.", 404)
    if payment.status != "pending":
        raise AppError("PAYMENT_002", "Payment already reviewed.", 409)
    booking = await get_booking_or_404(db, payment.booking_id)

    now = datetime.now(UTC)
    ref = (payment.gcash_reference_number or "").strip() if approve else ""
    if ref:
        holder_ref = await _verified_holder_ref(db, ref, payment_id)
        if holder_ref is not None:
            raise AppError(
                "PAYMENT_002",
                f"This GCash reference ID was already used to verify {holder_ref}.",
                409,
            )
    if approve:
        values = {
            "status": "verified",
            "verified_by_user_id": admin_id,
            "verified_at": now,
        }
    else:
        if not (rejection_reason or "").strip():
            raise AppError("PAYMENT_002", "Rejection reason is required.", 400)
        values = {
            "status": "rejected",
            "rejection_reason": rejection_reason,
        }
    # Atomic claim: concurrent reviewers serialize here; the loser touches
    # zero rows and gets a clean 409 before any notification goes out.
    # The duplicate-receipt rule is re-checked by the database itself, so a
    # race between the look above and this write still answers 409, never 500.
    try:
        claimed = await db.execute(
            update(Payment)
            .where(Payment.id == payment_id, Payment.status == "pending")
            .values(**values)
        )
    except IntegrityError:
        holder_ref = await _verified_holder_ref(db, ref, payment_id) if ref else None
        raise AppError(
            "PAYMENT_002",
            f"This GCash reference ID was already used to verify {holder_ref}."
            if holder_ref
            else "This GCash reference ID was already used to verify another payment.",
            409,
        ) from None
    if claimed.rowcount == 0:
        raise AppError("PAYMENT_002", "Payment already reviewed.", 409)

    if approve:
        if booking.status == "pending":
            booking.status = "confirmed"
        await _notify_customer(
            booking, "payment_verified", "Payment verified",
            f"{booking.reference_id} is confirmed.", db,
        )
    else:
        booking.status = "submitted"  # C6: back to submitted + fresh 3h
        booking.expires_at = now + timedelta(hours=3)
        await _notify_customer(
            booking, "payment_rejected", "Payment rejected",
            f"{booking.reference_id}: {rejection_reason}", db,
        )
    await db.commit()
    await db.refresh(payment)
    return payment
