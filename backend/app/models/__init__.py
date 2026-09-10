"""Import all models so Alembic metadata + tests see every table."""

from app.models.bookings import Booking, BookingStatusHistory, RescheduleRequest  # noqa: F401
from app.models.catalog import AirconBrand, BrandImage, Service, ServiceImage  # noqa: F401
from app.models.comms import Message, MessageThread, Notification  # noqa: F401
from app.models.financial import Payment, Rating, Refund  # noqa: F401
from app.models.hr import CommissionRule, EmployeeInfo, PayrollRecord  # noqa: F401
from app.models.inventory import (  # noqa: F401
    BookingInventoryUsage,
    InventoryItem,
    InventoryMovement,
)
from app.models.psgc import (  # noqa: F401
    PsgcBarangay,
    PsgcCityMunicipality,
    PsgcProvince,
    PsgcRegion,
)
from app.models.system import AuditLog, SystemSetting  # noqa: F401
from app.models.tech_invite import TechnicianInvite  # noqa: F401
from app.models.users import AdminTwoFaCode, User, UserSession  # noqa: F401
