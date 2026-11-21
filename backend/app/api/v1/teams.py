"""Team and Staff management endpoints with RBAC."""
from typing import List
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/members")
async def list_members(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    return [
        {
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "role": m.role.value,
            "department": m.department,
            "status": m.status,
            "assignedProjects": m.assigned_projects,
        }
        for m in repo.members
    ]
