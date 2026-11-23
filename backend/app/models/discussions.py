"""Enterprise Internal Discussion and Thread models for Solian Wolves."""
from typing import Optional
from pydantic import BaseModel, Field


class DiscussionMessage(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    channel_type: str  # company | department | project | task | client | meeting
    channel_id: str  # 'general' | 'dept-eng' | 'prj-101' | 'tsk-101' | 'cli-101' | 'mtg-101'
    channel_name: str
    author_id: str
    author_name: str
    author_role: str
    title: Optional[str] = None
    content: str
    parent_id: Optional[str] = None  # thread reply
    is_pinned: bool = False
    created_at: str
    is_demo: bool = False


class DiscussionMessageCreate(BaseModel):
    channel_type: str = Field(default="company")
    channel_id: str = Field(min_length=1, max_length=100)
    channel_name: str = Field(min_length=1, max_length=100)
    title: Optional[str] = None
    content: str = Field(min_length=1, max_length=5000)
    parent_id: Optional[str] = None
    is_pinned: bool = False


class DiscussionChannel(BaseModel):
    id: str
    name: str
    type: str  # company | department | project | task | client | meeting
    description: str
    message_count: int = 0

