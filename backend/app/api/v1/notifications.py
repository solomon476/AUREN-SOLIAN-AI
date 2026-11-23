"""Enterprise Notifications and Dispatch API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_role, UserRole, AuthUser
from app.models.notifications import NotificationCreate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
@router.get("/")
async def list_notifications(
    unread_only: bool = False,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    notifications = repo.list_notifications(user_id=user.id, unread_only=unread_only)
    return [
        {
            "id": n.id,
            "userId": n.user_id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "linkModule": n.link_module,
            "linkId": n.link_id,
            "isRead": n.is_read,
            "priority": n.priority,
            "createdAt": n.created_at,
        }
        for n in notifications
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_notification(
    body: NotificationCreate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    created = repo.create_notification(body)
    return {
        "id": created.id,
        "title": created.title,
        "userId": created.user_id,
        "message": "Notification dispatched successfully.",
    }


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    success = repo.mark_notification_read(notification_id, user_id=user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"id": notification_id, "isRead": True, "message": "Notification marked as read."}


@router.post("/read-all")
async def mark_all_read(
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    count = repo.mark_all_notifications_read(user_id=user.id)
    return {"markedCount": count, "message": f"Marked {count} notifications as read."}

