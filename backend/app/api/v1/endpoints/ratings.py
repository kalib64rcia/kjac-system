"""Rating endpoints: submit (owner), technician wall (public), admin delete."""

from fastapi import APIRouter, Query, Request, status

from app.api.deps import AdminTwoFaUser, DbDep, OptionalUser
from app.core.rate_limit import limiter
from app.schemas.rating import RatingCreate, RatingResponse, TechnicianRatingsResponse
from app.services import rating_service as ratings

router = APIRouter(tags=["ratings"])


@router.post("/bookings/{booking_id}/rating", response_model=RatingResponse,
             status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def submit_rating(
    request: Request, booking_id: int, payload: RatingCreate, db: DbDep,
    user: OptionalUser,
) -> RatingResponse:
    row = await ratings.create_rating(
        db, booking_id, user, payload.email,
        payload.rating, payload.review_text,
    )
    return RatingResponse.model_validate(row)


@router.get("/technicians/{technician_id}/ratings",
            response_model=TechnicianRatingsResponse)
@limiter.limit("100/minute")
async def get_technician_ratings(
    request: Request, technician_id: int, db: DbDep,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> TechnicianRatingsResponse:
    average, total, rows = await ratings.technician_ratings(db, technician_id, page, limit)
    return TechnicianRatingsResponse(
        technician_id=technician_id, average_rating=average, total=total,
        items=[RatingResponse.model_validate(r) for r in rows],
    )


@router.delete("/admin/ratings/{rating_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def remove_rating(request: Request, rating_id: int, db: DbDep,
                        admin: AdminTwoFaUser) -> None:
    await ratings.delete_rating(db, rating_id)
