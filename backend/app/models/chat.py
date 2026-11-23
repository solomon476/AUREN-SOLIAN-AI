"""Chat and AI communication schemas."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ActionProposal(BaseModel):
    id: str
    title: str
    type: str  # create_task | complete_task | index_sop | brief_team | schedule_review
    payload: Dict[str, Any] = Field(default_factory=dict)
    status: str = "pending"  # pending | accepted | executed | dismissed


class ChatMessage(BaseModel):
    id: str
    role: str  # user | assistant | system
    content: str
    timestamp: str
    context_sources: Optional[List[str]] = None
    action_proposals: Optional[List[ActionProposal]] = None
    attachments: Optional[List[Dict[str, Any]]] = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    include_knowledge: bool = True
    history: Optional[List[Dict[str, Any]]] = None
    workspace_context: Optional[str] = None


class ExecuteActionRequest(BaseModel):
    proposal_id: str = Field(min_length=1)
    action_type: str  # create_task | complete_task | index_sop | brief_team | schedule_review
    payload: Dict[str, Any] = Field(default_factory=dict)


class ExecuteActionResult(BaseModel):
    success: bool
    message: str
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    already_executed: bool = False
