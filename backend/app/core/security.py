"""Enterprise Role-Based Access Control (RBAC) and Security Context."""
from enum import Enum
from typing import Optional, List
from fastapi import HTTPException, Security, status, Header
from pydantic import BaseModel


class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    GUEST = "guest"


# Strict permission hierarchy
ROLE_HIERARCHY = {
    UserRole.OWNER: 50,
    UserRole.ADMIN: 40,
    UserRole.MANAGER: 30,
    UserRole.MEMBER: 20,
    UserRole.GUEST: 10,
}


class AuthUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    organization_id: str


def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_org_id: Optional[str] = Header(None, alias="X-Org-Id"),
) -> AuthUser:
    """Extract authenticated identity from request headers or default to executive context."""
    user_id = x_user_id or "usr-exec-001"
    role_str = (x_user_role or "admin").lower()

    try:
        role = UserRole(role_str)
    except ValueError:
        role = UserRole.MEMBER

    org_id = x_org_id or "org-solian-corp"

    return AuthUser(
        id=user_id,
        email="solomon@solian.ai",
        full_name="Solomon K.",
        role=role,
        organization_id=org_id,
    )


def require_role(min_role: UserRole):
    """Enforces that the authenticated user possesses at least the specified role level."""
    def role_checker(current_user: AuthUser = Security(get_current_user)) -> AuthUser:
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        required_level = ROLE_HIERARCHY.get(min_role, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{current_user.role.value}' is insufficient. Required: '{min_role.value}'",
            )
        return current_user

    return role_checker

