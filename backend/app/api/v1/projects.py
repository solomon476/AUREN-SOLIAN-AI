"""Projects & Initiatives API."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_projects(user: AuthUser = Depends(require_role(UserRole.GUEST))):
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
        }
        for p in repo.projects
    ]
