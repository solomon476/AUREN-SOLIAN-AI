"""Authentication and tenant identity endpoints."""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user, AuthUser
from app.core.config import settings

router = APIRouter()


@router.get("/me")
async def get_me(user: AuthUser = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "organization_id": user.organization_id,
        "title": "Managing Director & Enterprise Architect",
        "department": "Executive Operations",
    }


@router.get("/org")
async def get_org(user: AuthUser = Depends(get_current_user)):
    return {
        "id": settings.ORGANIZATION_ID,
        "name": settings.ORGANIZATION_NAME,
        "code": settings.ORGANIZATION_CODE,
        "tier": "enterprise",
        "total_members": 28,
    }
