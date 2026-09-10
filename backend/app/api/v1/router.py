"""v1 router — router-level prefix/tags live here (fastapi skill)."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin_users,
    analytics,
    auth,
    bookings,
    catalog,
    health,
    inventory,
    notifications,
    payments,
    payroll,
    psgc,
    ratings,
    reports,
    settings,
    tech_invites,
    technician,
    users,
)

router = APIRouter(prefix="/v1", tags=["v1"])
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(bookings.router)
router.include_router(payments.router)
router.include_router(psgc.router)
router.include_router(technician.router)
router.include_router(ratings.router)
router.include_router(notifications.router)
router.include_router(inventory.router)
router.include_router(payroll.router)
router.include_router(admin_users.router)
router.include_router(reports.router)
router.include_router(tech_invites.router)
router.include_router(users.router)
router.include_router(catalog.router)
router.include_router(settings.router)
router.include_router(analytics.router)
