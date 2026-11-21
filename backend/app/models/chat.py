"""Chat and AI communication schemas."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ActionProposal(BaseModel):
    id: str
    title: str
    type: str  # create_task | draft_sop | brief_team | schedule_review
    payload: Dict[str, Any] = Field(default_factory=dict)
    status: str = "pending"


class ChatMessage(BaseModel):
    id: str
    role: str  # user | assistant | system
    content: str
    timestamp: str
    context_sources: Optional[List[str]] = None
    action_proposals: Optional[List[ActionProposal]] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    user_role: Optional[str] = "admin"
    include_knowledge: bool = True

