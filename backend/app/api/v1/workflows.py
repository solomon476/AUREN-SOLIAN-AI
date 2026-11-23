"""Business Workflows and Automations API."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.models.operations import WorkflowRuleCreate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_workflows(user: AuthUser = Depends(require_role(UserRole.MANAGER))):
    workflows = repo.list_workflows()
    return [
        {
            "id": wf.id,
            "title": wf.title,
            "trigger": wf.trigger,
            "action": wf.action,
            "status": wf.status,
            "executionCount": wf.execution_count,
            "department": wf.department,
            "isDemo": wf.is_demo,
        }
        for wf in workflows
    ]


@router.post("")
async def create_workflow(
    wf: WorkflowRuleCreate,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Create a new automation workflow. Restricted to MANAGER and above."""
    created = repo.create_workflow(wf)
    repo.log_activity(
        actor_name=user.full_name,
        action_type="workflow_created",
        title="Automation Workflow Configured",
        description=f"Rule '{created.title}' deployed by {user.full_name}.",
        module="workflows",
    )
    return {
        "id": created.id,
        "title": created.title,
        "trigger": created.trigger,
        "action": created.action,
        "status": created.status,
        "executionCount": created.execution_count,
        "department": created.department,
        "isDemo": created.is_demo,
    }
