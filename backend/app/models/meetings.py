"""Enterprise Meeting and Minutes models for Solian Wolves."""
from typing import List, Optional
from pydantic import BaseModel, Field


class MeetingActionItem(BaseModel):
    id: str
    title: str
    assignee: str
    due_date: str
    status: str = "pending"  # pending | in_progress | completed
    task_id: Optional[str] = None


class MeetingDecision(BaseModel):
    id: str
    decision: str
    impact: str
    status: str = "approved"  # proposed | approved | archived
    knowledge_item_id: Optional[str] = None


class Meeting(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    title: str
    meeting_type: str  # board | executive | management | department | project | client | general
    organizer_name: str
    organizer_id: Optional[str] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    duration_minutes: int = 60
    location: Optional[str] = None
    virtual_link: Optional[str] = None
    related_project_id: Optional[str] = None
    related_client_id: Optional[str] = None
    agenda: List[str] = Field(default_factory=list)
    discussion_notes: str = ""
    decisions: List[MeetingDecision] = Field(default_factory=list)
    attendees: List[str] = Field(default_factory=list)
    action_items: List[MeetingActionItem] = Field(default_factory=list)
    status: str = "scheduled"  # scheduled | in_progress | review | approved | archived
    created_at: str = ""
    is_demo: bool = False


class MeetingCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    meeting_type: str = Field(default="department")
    date: str = Field(min_length=10, max_length=10)  # YYYY-MM-DD
    time: str = Field(min_length=4, max_length=10)  # HH:MM
    duration_minutes: int = Field(default=60, ge=15, le=480)
    location: Optional[str] = None
    virtual_link: Optional[str] = None
    related_project_id: Optional[str] = None
    related_client_id: Optional[str] = None
    agenda: List[str] = Field(default_factory=list)
    attendees: List[str] = Field(default_factory=list)


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None  # scheduled | in_progress | review | approved | archived
    discussion_notes: Optional[str] = None
    agenda: Optional[List[str]] = None
    attendees: Optional[List[str]] = None
    decisions: Optional[List[MeetingDecision]] = None
    action_items: Optional[List[MeetingActionItem]] = None

