"""v1 router — router-level prefix/tags live here (fastapi skill)."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin_bookings,
    admin_users,
    analytics,
    audit,
    auth,
    bookings,
    catalog,
    content,
    health,
    inventory,
    notifications,
    payments,
    payroll,
    psgc,
    ratings,
    refunds,
    reminders,
    reports,
    roster,
    settings,
    slots,
    staff_invites,
    tech_invites,
    technician,
    users,
    waitlist,
)

router = APIRouter(prefix="/v1", tags=["v1"])
router.include_router(health.router)
router.include_router(audit.router)
router.include_router(auth.router)
router.include_router(bookings.router)
router.include_router(payments.router)
router.include_router(psgc.router)
router.include_router(technician.router)
router.include_router(ratings.router)
router.include_router(refunds.router)
router.include_router(notifications.router)
router.include_router(inventory.router)
router.include_router(payroll.router)
router.include_router(admin_bookings.router)
router.include_router(admin_users.router)
router.include_router(reports.router)
router.include_router(tech_invites.router)
router.include_router(staff_invites.router)
router.include_router(users.router)
router.include_router(catalog.router)
router.include_router(content.router)
router.include_router(settings.router)
router.include_router(slots.router)
router.include_router(slots.admin_router)
router.include_router(waitlist.router)
router.include_router(waitlist.admin_router)
router.include_router(reminders.router)
router.include_router(roster.router)
router.include_router(analytics.router)
