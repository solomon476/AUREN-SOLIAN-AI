"""Tasks & Operations API."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_tasks(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "priority": t.priority,
            "assignee": t.assignee,
            "dueDate": t.due_date,
        }
        for t in repo.tasks
    ]
