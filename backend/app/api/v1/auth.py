"""Authentication and tenant identity endpoints."""
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.core.security import get_current_user, require_role, AuthUser, UserRole
from app.models.organization import OrganizationProfileUpdate
from app.services.storage.sqlite_repository import repo
from app.services.storage.avatar_storage import avatar_storage

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
        "avatarUrl": member.avatar_url if member and getattr(member, "avatar_url", None) else None,
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
            "avatarUrl": m.avatar_url if getattr(m, "avatar_url", None) else None,
            "reportsTo": m.reports_to_name,
            "isDemo": m.is_demo,
        }
        for m in members
    ]


# --- PROFILE AVATAR MANAGEMENT ---

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    target_user_id: Optional[str] = Form(None),
    user: AuthUser = Depends(get_current_user),
):
    """
    Uploads a personal profile picture.
    Enforces format validation (JPEG, PNG, WebP), 5MB size limit, Pillow sanitization,
    metadata stripping, dimension normalization, and path traversal defense.
    """
    effective_user_id = user.user_id
    if target_user_id and target_user_id != user.user_id:
        if user.role not in (UserRole.ADMIN, UserRole.OWNER):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrative permissions required to change another member's avatar.",
            )
        effective_user_id = target_user_id

    file_bytes = await file.read()
    valid, err_msg = avatar_storage.validate_file(file.content_type, len(file_bytes))
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )

    # Clean up prior avatar file if one was configured
    member = repo.get_member_by_user_id(effective_user_id)
    if member and getattr(member, "avatar_url", None):
        old_filename = os.path.basename(member.avatar_url)
        avatar_storage.delete_avatar(old_filename)

    try:
        filename, relative_url = avatar_storage.process_and_save_image(file_bytes, effective_user_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image processing failed: {str(e)}",
        )

    updated_member = repo.update_member_avatar(effective_user_id, relative_url)

    repo.log_activity(
        actor_name=user.full_name,
        action_type="avatar_updated",
        title="Profile Picture Updated",
        description=f"Updated profile photo for {updated_member.name if updated_member else effective_user_id}.",
        module="profile",
    )

    return {
        "success": True,
        "avatarUrl": relative_url,
        "userId": effective_user_id,
        "message": "Profile picture uploaded and processed successfully.",
    }


@router.delete("/avatar")
async def delete_avatar(
    target_user_id: Optional[str] = None,
    user: AuthUser = Depends(get_current_user),
):
    """Removes a user's profile picture and resets to default avatar."""
    effective_user_id = user.user_id
    if target_user_id and target_user_id != user.user_id:
        if user.role not in (UserRole.ADMIN, UserRole.OWNER):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrative permissions required to delete another member's avatar.",
            )
        effective_user_id = target_user_id

    member = repo.get_member_by_user_id(effective_user_id)
    if member and getattr(member, "avatar_url", None):
        old_filename = os.path.basename(member.avatar_url)
        avatar_storage.delete_avatar(old_filename)

    repo.update_member_avatar(effective_user_id, None)

    repo.log_activity(
        actor_name=user.full_name,
        action_type="avatar_removed",
        title="Profile Picture Removed",
        description=f"Removed profile photo for {member.name if member else effective_user_id}.",
        module="profile",
    )

    return {
        "success": True,
        "avatarUrl": None,
        "userId": effective_user_id,
        "message": "Profile picture removed successfully.",
    }


@router.get("/avatar/{filename}")
async def serve_avatar(filename: str):
    """Serves a stored profile picture with security headers and caching."""
    file_path = avatar_storage.get_avatar_path(filename)
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar image not found or invalid filename.",
        )
    return FileResponse(
        path=str(file_path),
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=86400"},
    )
