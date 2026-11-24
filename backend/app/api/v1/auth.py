"""Authentication and tenant identity endpoints."""
import os
import uuid
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.core.security import get_current_user, require_role, AuthUser, UserRole, create_access_token
from app.models.organization import (
    OrganizationProfileUpdate,
    InvitationCheckResponse,
    AccountActivateRequest,
    OwnerBootstrapRequest,
)
from app.services.storage.sqlite_repository import repo
from app.services.storage.avatar_storage import avatar_storage

router = APIRouter()


class CorporateLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def corporate_login(body: CorporateLoginRequest):
    """
    Direct corporate authentication endpoint.
    Verifies corporate email and password, returning a signed JWT corporate session.
    """
    email_clean = body.email.strip().lower()
    member = repo.get_member_by_email(email_clean)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Corporate credentials not recognized. Please check your official email address.",
        )

    if getattr(member, "activation_status", "active") == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Please contact organization administration.",
        )

    is_valid = repo.verify_member_password(member.id, body.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password for corporate account.",
        )

    auth_uid = getattr(member, "auth_user_id", None) or member.user_id or f"usr-{member.id}"
    if not getattr(member, "auth_user_id", None):
        repo.link_member_auth_id(member.id, auth_uid)

    session_token = create_access_token({
        "sub": auth_uid,
        "member_id": member.id,
        "user_id": member.user_id,
        "email": member.email,
        "role": member.role.value,
        "name": member.name,
    })

    return {
        "success": True,
        "message": f"Welcome back, {member.name}.",
        "accessToken": session_token,
        "user": {
            "id": member.id,
            "userId": member.user_id,
            "email": member.email,
            "fullName": member.name,
            "role": member.role.value,
            "title": member.title,
            "department": member.department,
            "avatarUrl": getattr(member, "avatar_url", None),
        },
    }


@router.get("/invitation/{token}", response_model=InvitationCheckResponse)
async def check_invitation(token: str):
    """
    Validates a cryptographic invitation or owner bootstrap token.
    Returns sanitized public onboarding profile for user verification.
    """
    if not token or len(token.strip()) < 8:
        return InvitationCheckResponse(valid=False, error="Invalid invitation token.")

    member = repo.get_member_by_invitation_token(token.strip())
    if not member:
        return InvitationCheckResponse(valid=False, error="Invitation token not found or has expired.")

    if getattr(member, "status", None) == "suspended" or getattr(member, "activation_status", None) == "suspended":
        return InvitationCheckResponse(valid=False, error="This account has been suspended by company administration.")

    return InvitationCheckResponse(
        valid=True,
        member_id=member.id,
        name=member.name,
        email=member.email,
        role=member.role.value,
        title=member.title,
        department=member.department,
        organization="Solian Enterprise Group",
        is_owner_bootstrap=member.role == UserRole.OWNER,
    )


@router.post("/activate")
async def activate_account(body: AccountActivateRequest):
    """
    Activates an employee account using a cryptographic invitation token.
    Binds the stable Auth UID to the personnel record and transitions status to active.
    Returns authenticated session credentials with full corporate clearance.
    """
    member = repo.get_member_by_invitation_token(body.token.strip())
    if not member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation token.",
        )

    if getattr(member, "status", None) == "suspended" or getattr(member, "activation_status", None) == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended by company administration.",
        )

    # Determine Auth UID
    auth_uid = body.auth_user_id
    if not auth_uid and body.access_token:
        try:
            from app.core.security import verify_jwt_token
            payload = verify_jwt_token(body.access_token)
            auth_uid = payload.get("sub")
        except Exception:
            pass

    if not auth_uid:
        auth_uid = f"usr-auth-{uuid.uuid4().hex[:12]}"

    activated_member = repo.activate_member_account(body.token.strip(), auth_uid, password=body.password)
    if not activated_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to activate account. Token may have already been consumed.",
        )

    session_token = create_access_token({
        "sub": auth_uid,
        "email": activated_member.email or "unassigned@solianwolves.co",
        "role": activated_member.role.value,
        "name": activated_member.name,
    })

    return {
        "success": True,
        "message": f"Account activated successfully. Welcome to AUREN SOLIAN, {activated_member.name}.",
        "accessToken": session_token,
        "user": {
            "id": activated_member.id,
            "userId": activated_member.user_id,
            "email": activated_member.email,
            "fullName": activated_member.name,
            "role": activated_member.role.value,
            "title": activated_member.title,
            "department": activated_member.department,
            "avatarUrl": getattr(activated_member, "avatar_url", None),
        },
    }


@router.get("/owner-bootstrap-status")
async def get_owner_bootstrap_status():
    """Returns statutory owner initialization status."""
    return repo.get_owner_bootstrap_status()


@router.post("/bootstrap-owner")
async def bootstrap_owner(body: OwnerBootstrapRequest):
    """
    Initializes and claims the statutory Company Owner account using a secure bootstrap token.
    Binds the owner Auth UID, transitions status to active, and returns verified Owner credentials.
    """
    status_info = repo.get_owner_bootstrap_status()
    if status_info["is_bootstrapped"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: The statutory company Owner account has already been bootstrapped and activated.",
        )

    auth_uid = body.auth_user_id
    if not auth_uid and body.access_token:
        try:
            from app.core.security import verify_jwt_token
            payload = verify_jwt_token(body.access_token)
            auth_uid = payload.get("sub")
        except Exception:
            pass

    if not auth_uid:
        auth_uid = f"usr-owner-{uuid.uuid4().hex[:12]}"

    try:
        owner = repo.bootstrap_owner(body.bootstrap_token.strip(), auth_uid, password=body.password)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )

    session_token = create_access_token({
        "sub": auth_uid,
        "email": owner.email,
        "role": owner.role.value,
        "name": owner.name,
    })

    return {
        "success": True,
        "message": f"Owner account successfully bootstrapped. Welcome, {owner.name} ({owner.title}).",
        "accessToken": session_token,
        "user": {
            "id": owner.id,
            "userId": owner.user_id,
            "email": owner.email,
            "fullName": owner.name,
            "role": owner.role.value,
            "title": owner.title,
            "department": owner.department,
            "avatarUrl": getattr(owner, "avatar_url", None),
        },
    }


@router.get("/me")
async def get_me(user: AuthUser = Depends(get_current_user)):
    is_guest = user.role == UserRole.GUEST
    member = (repo.get_member_by_user_id(user.user_id) or repo.get_member_by_id(user.id)) if not is_guest else None
    return {
        "id": user.id,
        "userId": user.user_id,
        "email": "" if is_guest else user.email,
        "fullName": "Visitor" if is_guest else user.full_name,
        "role": user.role.value,
        "organizationId": user.organization_id,
        "title": "Public Visitor" if is_guest else user.title,
        "department": "" if is_guest else user.department,
        "avatarUrl": member.avatar_url if member and getattr(member, "avatar_url", None) else None,
        "responsibilities": member.responsibilities if member else [],
        "reportsTo": member.reports_to_name if member else None,
        "authMode": user.auth_mode,
        "isDemoUser": False if is_guest else user.is_demo_user,
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
async def get_operating_info(user: AuthUser = Depends(require_role(UserRole.MEMBER))):
    return repo.get_company_operating_info().model_dump()


@router.get("/users")
async def list_available_users(user: AuthUser = Depends(require_role(UserRole.MEMBER))):
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
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """
    Uploads a personal profile picture.
    Enforces format validation (JPEG, PNG, WebP), 5MB size limit, Pillow sanitization,
    metadata stripping, dimension normalization, and path traversal defense.
    Requires authenticated corporate member account.
    """
    if user.role == UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Profile picture upload requires an authenticated corporate account.",
        )
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
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
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
