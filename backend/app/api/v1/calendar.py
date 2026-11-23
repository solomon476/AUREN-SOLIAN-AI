"""Consolidated Operational Calendar API endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/events")
async def get_calendar_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    events = repo.get_operational_calendar(start_date=start_date, end_date=end_date)
    return events

