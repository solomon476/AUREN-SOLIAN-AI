"""Authentication and tenant identity endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, require_role, AuthUser, UserRole
from app.models.organization import OrganizationProfileUpdate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/me")
async def get_me(user: AuthUser = Depends(get_current_user)):
    member = repo.get_member_by_user_id(user.user_id) or repo.get_member_by_id(user.id)
    return {
        "id": user.id,
        "userId": user.user_id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role.value,
        "organizationId": user.organization_id,
        "title": user.title,
        "department": user.department,
        "responsibilities": member.responsibilities if member else [],
        "reportsTo": member.reports_to_name if member else None,
        "authMode": user.auth_mode,
        "isDemoUser": user.is_demo_user,
    }


@router.get("/org")
async def get_org(user: AuthUser = Depends(get_current_user)):
    profile = repo.get_organization_profile()
    return profile.model_dump()


@router.put("/org/profile")
async def update_org_profile(
    update: OrganizationProfileUpdate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    """Update organization profile. Restricted to ADMIN and OWNER only."""
    updated = repo.update_organization_profile(update)
    repo.log_activity(
        actor_name=user.full_name,
        action_type="org_updated",
        title="Organization Profile Updated",
        description=f"Updated company identity attributes by {user.full_name}.",
        module="settings",
    )
    return updated.model_dump()


@router.get("/operating-info")
async def get_operating_info(user: AuthUser = Depends(get_current_user)):
    return repo.get_company_operating_info().model_dump()


@router.get("/users")
async def list_available_users(user: AuthUser = Depends(get_current_user)):
    """List available member profiles for development session selection."""
    members = repo.list_members()
    return [
        {
            "id": m.id,
            "userId": m.user_id,
            "name": m.name,
            "email": m.email,
            "role": m.role.value,
            "title": m.title,
            "department": m.department,
            "reportsTo": m.reports_to_name,
            "isDemo": m.is_demo,
        }
        for m in members
    ]
