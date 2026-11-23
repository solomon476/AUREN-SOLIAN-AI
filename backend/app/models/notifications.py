"""Enterprise Notification models for Solian Wolves."""
from typing import Optional
from pydantic import BaseModel, Field


class NotificationItem(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    user_id: str
    title: str
    message: str
    type: str  # task_assigned | deadline | meeting_invite | approval_request | mention | announcement | system
    link_module: Optional[str] = None  # tasks | projects | meetings | knowledge | documents
    link_id: Optional[str] = None
    is_read: bool = False
    priority: str = "normal"  # normal | high | urgent
    created_at: str


class NotificationCreate(BaseModel):
    user_id: str
    title: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=2, max_length=1000)
    type: str = Field(default="system")
    link_module: Optional[str] = None
    link_id: Optional[str] = None
    priority: str = "normal"

