"""Tasks & Operations API."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_role, UserRole, AuthUser
from app.models.operations import TaskCreate, TaskUpdate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_tasks(
    status: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    tasks = repo.list_tasks(status=status)
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "projectId": t.project_id,
            "projectName": t.project_name,
            "status": t.status,
            "priority": t.priority,
            "assignee": t.assignee,
            "dueDate": t.due_date,
            "department": t.department,
            "createdAt": t.created_at,
            "isDemo": t.is_demo,
        }
        for t in tasks
    ]


@router.post("")
async def create_task(
    task: TaskCreate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """Create a new operational task. Restricted to MEMBER and above."""
    created = repo.create_task(task, creator_name=user.full_name)
    return {
        "id": created.id,
        "title": created.title,
        "description": created.description,
        "projectId": created.project_id,
        "projectName": created.project_name,
        "status": created.status,
        "priority": created.priority,
        "assignee": created.assignee,
        "dueDate": created.due_date,
        "department": created.department,
        "createdAt": created.created_at,
        "isDemo": created.is_demo,
    }


@router.get("/{task_id}")
async def get_task(
    task_id: str,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    """Retrieve a task by ID."""
    task = repo.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "projectId": task.project_id,
        "projectName": task.project_name,
        "status": task.status,
        "priority": task.priority,
        "assignee": task.assignee,
        "dueDate": task.due_date,
        "department": task.department,
        "createdAt": task.created_at,
        "isDemo": task.is_demo,
    }


@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    update: TaskUpdate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """Update task status, priority, or assignee. Restricted to MEMBER and above."""
    updated = repo.update_task(task_id, update, actor_name=user.full_name)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found.")
    return {
        "id": updated.id,
        "title": updated.title,
        "description": updated.description,
        "projectId": updated.project_id,
        "projectName": updated.project_name,
        "status": updated.status,
        "priority": updated.priority,
        "assignee": updated.assignee,
        "dueDate": updated.due_date,
        "department": updated.department,
        "createdAt": updated.created_at,
        "isDemo": updated.is_demo,
    }


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """Delete an operational task. Restricted to MEMBER and above."""
    deleted = repo.delete_task(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found.")
    repo.log_activity(
        actor_name=user.full_name,
        action_type="task_deleted",
        title=f"Task Deleted: {task_id}",
        description=f"Task {task_id} deleted by {user.full_name}.",
        module="tasks",
    )
    return {"id": task_id, "message": f"Successfully deleted task {task_id}."}
