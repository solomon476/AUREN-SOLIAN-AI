"""Unified Global Search (Command Palette) API endpoints."""
from fastapi import APIRouter, Depends, Query
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/unified")
async def search_unified(
    q: str = Query(..., min_length=1, description="Search term across enterprise entities"),
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    results = repo.search_unified(query=q)
    return results

