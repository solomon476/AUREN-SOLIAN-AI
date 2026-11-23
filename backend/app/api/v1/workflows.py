"""Business Workflows and Automations API."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import require_role, UserRole, AuthUser
from app.models.operations import WorkflowRuleCreate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


class WorkflowStatusUpdate(BaseModel):
    status: str  # active | paused


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


@router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Retrieve details of a single workflow."""
    wf = repo.get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")
    return {
        "id": wf.id,
        "title": wf.title,
        "trigger": wf.trigger,
        "action": wf.action,
        "status": wf.status,
        "executionCount": wf.execution_count,
        "department": wf.department,
        "isDemo": wf.is_demo,
    }


@router.patch("/{workflow_id}/status")
async def update_workflow_status(
    workflow_id: str,
    update: WorkflowStatusUpdate,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Pause or activate an automation workflow."""
    if update.status not in ("active", "paused"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'paused'.")
    wf = repo.update_workflow_status(workflow_id, update.status)
    if not wf:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")
    repo.log_activity(
        actor_name=user.full_name,
        action_type="workflow_status_updated",
        title=f"Workflow {update.status.capitalize()}",
        description=f"Automation rule '{wf.title}' marked as {update.status} by {user.full_name}.",
        module="workflows",
    )
    return {
        "id": wf.id,
        "title": wf.title,
        "trigger": wf.trigger,
        "action": wf.action,
        "status": wf.status,
        "executionCount": wf.execution_count,
        "department": wf.department,
        "isDemo": wf.is_demo,
    }


@router.post("/{workflow_id}/trigger")
async def trigger_workflow(
    workflow_id: str,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Trigger manual execution of a workflow, incrementing its execution counter."""
    wf = repo.trigger_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")
    repo.log_activity(
        actor_name=user.full_name,
        action_type="workflow_triggered",
        title="Workflow Trigger Executed",
        description=f"Rule '{wf.title}' executed by {user.full_name}. Execution count: {wf.execution_count}.",
        module="workflows",
    )
    return {
        "id": wf.id,
        "title": wf.title,
        "trigger": wf.trigger,
        "action": wf.action,
        "status": wf.status,
        "executionCount": wf.execution_count,
        "department": wf.department,
        "isDemo": wf.is_demo,
    }


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    """Delete a workflow automation rule. Restricted to ADMIN and above."""
    wf = repo.get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")
    repo.delete_workflow(workflow_id)
    repo.log_activity(
        actor_name=user.full_name,
        action_type="workflow_deleted",
        title="Workflow Deleted",
        description=f"Automation rule '{wf.title}' deleted by {user.full_name}.",
        module="workflows",
    )
    return {"status": "success", "deleted_id": workflow_id}
