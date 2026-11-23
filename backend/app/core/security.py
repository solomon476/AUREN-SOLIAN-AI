"""Enterprise Role-Based Access Control (RBAC) and Security Context for Solian Wolves.

SECURITY ARCHITECTURE:
- Production Mode: Enforces strict cryptographic JWT verification (Supabase Auth / HMAC-SHA256 / JWKS).
  Endpoints reject unauthenticated requests and ignore simulation headers (X-User-Id).
- Development / Test Mode: Provides dual-mode operation:
  1. Accepts cryptographic JWT Bearer tokens when provided.
  2. Falls back to development identity simulation via X-User-Id when running in local dev.
- Anti-Privilege Escalation:
  All user roles are strictly resolved server-side from the verified corporate members repository.
  Client-supplied role parameters cannot override database-backed authority.
"""
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, Security, status, Header
from pydantic import BaseModel
import jwt

from app.core.config import settings


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


def get_allowed_classifications(role: UserRole) -> List[str]:
    """Returns the document/knowledge classification tiers accessible to the given role."""
    level = ROLE_HIERARCHY.get(role, 10)
    if level >= 40:  # Admin / Owner
        return ["Public", "Internal", "Confidential", "Restricted"]
    if level >= 30:  # Manager
        return ["Public", "Internal", "Confidential"]
    if level >= 20:  # Member
        return ["Public", "Internal"]
    return ["Public"]  # Guest


class AuthUser(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    role: UserRole
    organization_id: str
    title: str = "Staff Member"
    department: str = "Operations"
    auth_mode: str = "DEVELOPMENT_SIMULATION"
    is_demo_user: bool = False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a cryptographically signed JWT token for session and API access.
    Signed using the centralized JWT secret.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta if expires_delta else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": now,
        "iss": "auren-solian-auth",
        "aud": settings.SUPABASE_JWT_AUDIENCE,
    })
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.SUPABASE_JWT_ALGORITHM,
    )
    return encoded_jwt


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    Cryptographically verifies an incoming JWT token against the configured secret.
    Validates signature, expiration, audience, subject ('sub'), and issuer ('iss').
    """
    try:
        # Decode and verify token with required claims
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.SUPABASE_JWT_ALGORITHM],
            audience=settings.SUPABASE_JWT_AUDIENCE,
            options={"require": ["exp", "sub", "iss"]},
        )

        sub = payload.get("sub")
        if not sub or not isinstance(sub, str) or not sub.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token: subject claim ('sub') is empty or invalid.",
                headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
            )

        iss = payload.get("iss")
        if not iss or not isinstance(iss, str) or not iss.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token: issuer claim ('iss') is empty or invalid.",
                headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
            )

        if settings.SUPABASE_URL:
            expected_prefix = settings.SUPABASE_URL.rstrip("/")
            if not iss.startswith(expected_prefix) and iss != "auren-solian-auth":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid authentication token: unexpected issuer '{iss}'.",
                    headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
                )

        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="The token has expired"'},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_org_id: Optional[str] = Header(None, alias="X-Org-Id"),
) -> AuthUser:
    """
    Authenticates the incoming request context.
    
    1. If 'Authorization: Bearer <token>' is present:
       - Cryptographically validates the JWT (signature, exp, sub, iss, aud).
       - Resolves user identity strictly from verified stable Supabase Auth UID ('sub').
       - Server-side role resolution: extracts authority strictly from verified database records.
       - Disallows client role tampering.
       - Email is NOT used as authority for role assignment.
       
    2. If NO Bearer token is provided:
       - In PRODUCTION: Rejects request with HTTP 401 Unauthorized immediately.
         Simulation headers (X-User-Id) are strictly ignored in production.
       - In DEVELOPMENT/TEST: Falls back to identity simulation for local testing,
         still resolving authentic roles server-side from the database.
    """
    from app.services.storage.sqlite_repository import repo

    # -------------------------------------------------------------------------
    # Path 1: Cryptographic JWT Authentication
    # -------------------------------------------------------------------------
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        payload = verify_jwt_token(token)

        token_user_id = payload.get("sub")
        token_email = payload.get("email")

        # Stable Auth user ID (sub) is the PRIMARY authority for company membership.
        # Email is NOT used as an authority for role elevation, preventing email spoofing or
        # unlinked account privilege escalation.
        member = None
        if token_user_id:
            member = (
                repo.get_member_by_auth_id(token_user_id)
                or repo.get_member_by_user_id(token_user_id)
                or repo.get_member_by_id(token_user_id)
            )

        if member:
            # Server-side authority resolution: Role strictly sourced from verified database member record
            return AuthUser(
                id=member.id,
                user_id=member.user_id,
                email=member.email,
                full_name=member.name,
                role=member.role,
                organization_id=member.organization_id,
                title=member.title,
                department=member.department,
                auth_mode="SUPABASE_JWT",
                is_demo_user=member.is_demo,
            )

        # Authenticated user exists in auth provider but their stable UID (sub) is not bound
        # to a corporate staff directory member:
        # Strictly contained to Guest clearance with verified identity claims.
        user_metadata = payload.get("user_metadata", {})
        full_name = user_metadata.get("full_name") or payload.get("name") or "External User"
        return AuthUser(
            id=token_user_id or "usr-ext",
            user_id=token_user_id or "usr-ext",
            email=token_email or "user@solian.ai",
            full_name=full_name,
            role=UserRole.GUEST,
            organization_id=payload.get("organization_id", settings.ORGANIZATION_ID),
            title="External User",
            department="External",
            auth_mode="SUPABASE_JWT",
            is_demo_user=False,
        )

    # -------------------------------------------------------------------------
    # Path 2: Production Enforcement Boundary
    # -------------------------------------------------------------------------
    if settings.is_production:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Production requests must provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # In non-production, check if strict JWT mode is explicitly requested
    if settings.AUTH_MODE.lower() == "jwt":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Server is configured in strict JWT mode. Please provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # -------------------------------------------------------------------------
    # Path 3: Development Identity Simulation (Local / Non-Production Only)
    # -------------------------------------------------------------------------
    if x_user_id:
        member = repo.get_member_by_user_id(x_user_id) or repo.get_member_by_id(x_user_id)
        if member:
            return AuthUser(
                id=member.id,
                user_id=member.user_id,
                email=member.email,
                full_name=member.name,
                role=member.role,
                organization_id=member.organization_id,
                title=member.title,
                department=member.department,
                auth_mode="DEVELOPMENT_SIMULATION",
                is_demo_user=member.is_demo,
            )

    if x_user_role:
        role_map = {
            "owner": "usr-1",
            "admin": "usr-2",
            "manager": "usr-3",
            "member": "usr-5",
            "guest": "usr-6",
        }
        mapped_user_id = role_map.get(x_user_role.lower(), "usr-6")
        member = repo.get_member_by_user_id(mapped_user_id)
        if member:
            return AuthUser(
                id=member.id,
                user_id=member.user_id,
                email=member.email,
                full_name=member.name,
                role=member.role,
                organization_id=member.organization_id,
                title=member.title,
                department=member.department,
                auth_mode="DEVELOPMENT_SIMULATION",
                is_demo_user=member.is_demo,
            )

    # Default to executive owner Solomon K. in local development
    default_member = repo.get_member_by_user_id("usr-1")
    if default_member:
        return AuthUser(
            id=default_member.id,
            user_id=default_member.user_id,
            email=default_member.email,
            full_name=default_member.name,
            role=default_member.role,
            organization_id=default_member.organization_id,
            title=default_member.title,
            department=default_member.department,
            auth_mode="DEVELOPMENT_SIMULATION",
            is_demo_user=default_member.is_demo,
        )

    return AuthUser(
        id="usr-guest",
        user_id="usr-guest",
        email="guest@solian.ai",
        full_name="Guest User",
        role=UserRole.GUEST,
        organization_id=x_org_id or settings.ORGANIZATION_ID,
        title="External Observer",
        department="External Advisory",
        auth_mode="DEVELOPMENT_SIMULATION",
        is_demo_user=True,
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
