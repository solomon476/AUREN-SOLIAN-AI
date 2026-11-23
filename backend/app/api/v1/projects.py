"""Projects & Initiatives API."""
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_role, UserRole, AuthUser
from app.models.operations import ProjectCreate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    lead: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None


@router.get("")
async def list_projects(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    projects = repo.list_projects()
    return [
        {
            "id": p.id,
            "name": p.name,
            "client": p.client,
            "status": p.status,
            "progress": p.progress,
            "lead": p.lead,
            "dueDate": p.due_date,
            "priority": p.priority,
            "department": p.department,
            "description": p.description,
            "isDemo": p.is_demo,
        }
        for p in projects
    ]


@router.post("")
async def create_project(
    project: ProjectCreate,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Create a new strategic initiative. Restricted to MANAGER and above."""
    created = repo.create_project(project)
    return {
        "id": created.id,
        "name": created.name,
        "client": created.client,
        "status": created.status,
        "progress": created.progress,
        "lead": created.lead,
        "dueDate": created.due_date,
        "priority": created.priority,
        "department": created.department,
        "description": created.description,
        "isDemo": created.is_demo,
    }


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    update: ProjectUpdate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """Update an existing strategic initiative progress or status."""
    updated = repo.update_project(project_id, update.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Project initiative not found.")
    return {
        "id": updated.id,
        "name": updated.name,
        "client": updated.client,
        "status": updated.status,
        "progress": updated.progress,
        "lead": updated.lead,
        "dueDate": updated.due_date,
        "priority": updated.priority,
        "department": updated.department,
        "description": updated.description,
        "isDemo": updated.is_demo,
    }
