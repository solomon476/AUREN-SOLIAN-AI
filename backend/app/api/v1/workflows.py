"""Business Workflows and Automations API."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_workflows(user: AuthUser = Depends(require_role(UserRole.MANAGER))):
    return [
        {
            "id": wf.id,
            "title": wf.title,
            "trigger": wf.trigger,
            "action": wf.action,
            "status": wf.status,
            "executionCount": wf.execution_count,
        }
        for wf in repo.workflows
    ]

