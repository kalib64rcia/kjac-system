"""User lookups by Supabase identity (uuid), sync, and profiles."""

import uuid as uuid_lib

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.users import User


class UserNotFoundError(Exception):
    pass


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_uuid(self, subject: str) -> User | None:
        try:
            parsed = uuid_lib.UUID(str(subject))
        except ValueError:
            return None
        result = await self.db.execute(select(User).where(User.uuid == parsed))
        return result.scalar_one_or_none()

    async def require_active(self, subject: str) -> User:
        """Return the row for a Supabase subject or raise if missing/inactive."""
        user = await self.get_by_uuid(subject)
        if user is None or user.deleted_at is not None:
            raise UserNotFoundError
        if user.status != "active":
            raise UserNotFoundError
        return user

    async def sync_profile(
        self, subject: str, email: str, first_name: str, last_name: str, phone: str
    ) -> tuple[User, bool]:
        """First-login upsert (Phase 5): link by uuid, else by verified email
        (invite-created tech rows), else create a fresh customer row."""
        user = await self.get_by_uuid(subject)
        if user is not None:
            return user, False
        try:
            parsed_uuid = uuid_lib.UUID(str(subject))
        except ValueError as exc:
            raise AppError("AUTH_001", "Invalid subject.", 401) from exc
        result = await self.db.execute(
            select(User).where(func.lower(User.email) == email.lower())
        )
        user = result.scalar_one_or_none()
        if user is not None:
            user.uuid = parsed_uuid
            await self.db.commit()
            await self.db.refresh(user)
            return user, False
        user = User(
            uuid=parsed_uuid,
            email=email, first_name=first_name, last_name=last_name, phone=phone,
            role="customer", status="active",
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user, True

    @staticmethod
    def is_profile_complete(user: User) -> bool:
        return all([
            user.region_code, user.province_code, user.city_municipality_code,
            user.barangay_code, user.street_address,
        ])

    async def update_profile(self, user: User, fields: dict) -> User:
        for key, value in fields.items():
            if value is not None:
                setattr(user, key, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user
