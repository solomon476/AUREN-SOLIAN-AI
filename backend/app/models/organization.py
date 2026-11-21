"""Organization models and schemas."""
from typing import Optional
from pydantic import BaseModel
from app.core.security import UserRole


class Organization(BaseModel):
    id: str
    name: str
    code: str
    tagline: str
    tier: str = "enterprise"
    total_members: int = 28


class OrganizationMember(BaseModel):
    id: str
    user_id: str
    organization_id: str
    name: str
    email: str
    role: UserRole
    department: str
    status: str = "active"
    assigned_projects: int = 0

