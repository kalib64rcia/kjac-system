"""Payment upload (owner/guest) + receipt streaming + admin verification."""

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import Response

from app.api.deps import AdminTwoFaUser, DbDep, OptionalUser
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.schemas.booking import (
    AssignResponse,
    AssignTechnicianRequest,
    ExpireResponse,
    RescheduleReview,
    ReviewResponse,
)
from app.schemas.payment import PaymentResponse, PaymentVerifyRequest
from app.services import booking_service as bookings
from app.services import payment_service as payments
from app.services.storage_service import get_storage_service

router = APIRouter(tags=["payments"])

PAYMENT_METHODS = ("gcash", "cash", "bank_transfer", "online")


@router.post("/bookings/{booking_id}/payment", response_model=PaymentResponse,
             status_code=201)
@limiter.limit("10/minute")
async def upload_payment(
    request: Request,
    booking_id: int,
    db: DbDep,
    user: OptionalUser,
    file: UploadFile = File(...),  # noqa: B008 (required FastAPI idiom)
    gcash_reference_number: str | None = Form(default=None),
    amount: float = Form(...),
    payment_method: str = Form(default="gcash"),
    email: str | None = Form(default=None),
) -> PaymentResponse:
    if payment_method not in PAYMENT_METHODS:
        raise AppError("VAL_001", f"Unknown payment method: {payment_method}.", 422)
    booking = await bookings.get_booking_or_404(db, booking_id)
    bookings.assert_owner(booking, user, email)
    data = await file.read()
    payment = await payments.upload_payment(
        db, get_storage_service(),
        booking_id=booking.id,
        user_id=user.id if user is not None else None,
        guest_email=email,
        filename=file.filename or "receipt",
        data=data,
        gcash_reference_number=gcash_reference_number,
        amount=amount,
        payment_method=payment_method,
    )
    return PaymentResponse.model_validate(payment)


@router.get("/payments/{payment_id}/receipt")
@limiter.limit("60/minute")
async def get_receipt(
    request: Request, payment_id: int, db: DbDep, user: OptionalUser,
    email: str | None = None,
):
    from sqlalchemy import select

    from app.models.financial import Payment

    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if payment is None or not payment.gcash_receipt_url:
        raise AppError("BOOKING_001", "Receipt not found.", 404)
    booking = await bookings.get_booking_or_404(db, payment.booking_id)
    if user is not None and user.role == "admin":
        pass
    else:
        bookings.assert_owner(booking, user, email)
    data, content_type = get_storage_service().read(payment.gcash_receipt_url)
    return Response(content=data, media_type=content_type)


@router.patch("/admin/payments/{payment_id}/verify", response_model=PaymentResponse)
@limiter.limit("60/minute")
async def verify_payment(
    request: Request, payment_id: int, payload: PaymentVerifyRequest,
    db: DbDep, admin: AdminTwoFaUser,
) -> PaymentResponse:
    payment = await payments.verify_payment(
        db, payment_id, admin.id, payload.action == "approve", payload.rejection_reason
    )
    return PaymentResponse.model_validate(payment)


@router.patch("/admin/bookings/{booking_id}/assign", response_model=AssignResponse)
@limiter.limit("60/minute")
async def assign_technician(
    request: Request, booking_id: int, payload: AssignTechnicianRequest,
    db: DbDep, admin: AdminTwoFaUser,
) -> AssignResponse:
    booking = await bookings.get_booking_or_404(db, booking_id)
    updated = await bookings.assign_technician(db, booking, payload.technician_id)
    return AssignResponse(
        booking_id=updated.id, technician_id=updated.technician_id,
        status=updated.status,
    )


@router.patch("/admin/reschedule/{request_id}/review", response_model=ReviewResponse)
@limiter.limit("60/minute")
async def review_reschedule(
    request: Request, request_id: int, payload: RescheduleReview,
    db: DbDep, admin: AdminTwoFaUser,
) -> ReviewResponse:
    row = await bookings.review_reschedule(
        db, request_id, admin, payload.action == "approve", payload.admin_notes
    )
    return ReviewResponse(reschedule_id=row.id, status=row.status)


@router.post("/admin/maintenance/expire-bookings", response_model=ExpireResponse)
@limiter.limit("10/minute")
async def expire_bookings(
    request: Request, db: DbDep, admin: AdminTwoFaUser
) -> ExpireResponse:
    """Cron entrypoint: flip submitted bookings past expires_at to expired."""
    count = await bookings.expire_due_bookings(db)
    return ExpireResponse(expired_count=count)
