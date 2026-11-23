"""Pydantic schemas and models for Company Email and Communications."""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone


class EmailAttachmentMeta(BaseModel):
    id: str
    filename: str
    size_bytes: int
    content_type: str
    url: Optional[str] = None


class EmailMessage(BaseModel):
    id: str
    organization_id: str
    user_id: Optional[str] = None
    folder: Literal["inbox", "sent", "archive", "trash"] = "inbox"
    from_address: str
    to_addresses: List[str]
    cc_addresses: List[str] = Field(default_factory=list)
    bcc_addresses: List[str] = Field(default_factory=list)
    subject: str
    body_text: str
    body_html: Optional[str] = None
    is_read: bool = True
    created_at: str
    attachments: List[EmailAttachmentMeta] = Field(default_factory=list)
    reply_to_id: Optional[str] = None


class EmailDraft(BaseModel):
    id: str
    user_id: str
    organization_id: str
    to_addresses: List[str] = Field(default_factory=list)
    cc_addresses: List[str] = Field(default_factory=list)
    bcc_addresses: List[str] = Field(default_factory=list)
    subject: str = ""
    body: str = ""
    created_at: str
    updated_at: str
    attachments: List[EmailAttachmentMeta] = Field(default_factory=list)


class EmailDraftCreate(BaseModel):
    to_addresses: List[str] = Field(default_factory=list)
    cc_addresses: List[str] = Field(default_factory=list)
    bcc_addresses: List[str] = Field(default_factory=list)
    subject: str = Field(default="", max_length=255)
    body: str = Field(default="", max_length=50000)
    attachments: List[EmailAttachmentMeta] = Field(default_factory=list)


class EmailDraftUpdate(BaseModel):
    to_addresses: Optional[List[str]] = None
    cc_addresses: Optional[List[str]] = None
    bcc_addresses: Optional[List[str]] = None
    subject: Optional[str] = Field(None, max_length=255)
    body: Optional[str] = Field(None, max_length=50000)
    attachments: Optional[List[EmailAttachmentMeta]] = None


class EmailSendRequest(BaseModel):
    to_addresses: List[str] = Field(min_length=1)
    cc_addresses: List[str] = Field(default_factory=list)
    bcc_addresses: List[str] = Field(default_factory=list)
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=50000)
    draft_id: Optional[str] = None
    reply_to_id: Optional[str] = None
    attachments: List[EmailAttachmentMeta] = Field(default_factory=list)


class EmailSendResult(BaseModel):
    success: bool
    message_id: Optional[str] = None
    status: str
    error: Optional[str] = None
    sent_at: Optional[str] = None


class EmailProviderStatus(BaseModel):
    provider_type: Literal["none", "smtp", "google_workspace", "microsoft_365"] = "none"
    is_connected: bool = False
    account_email: Optional[str] = None
    sender_name: Optional[str] = None
    status_message: str
    supported_features: List[str] = Field(default_factory=list)
    required_configs: List[str] = Field(default_factory=list)


class EmailAIAssistRequest(BaseModel):
    action: Literal["draft", "improve", "summarize", "reply", "extract_action_items", "extract_key_info"]
    prompt: Optional[str] = None
    tone: Optional[Literal["executive", "concise", "diplomatic", "assertive", "formal"]] = "executive"
    email_text: Optional[str] = None
    recipient_role: Optional[str] = None
    subject: Optional[str] = None


class EmailAIAssistResponse(BaseModel):
    action: str
    content: str
    subject_suggestion: Optional[str] = None
    action_items: List[str] = Field(default_factory=list)
    key_info: List[Dict[str, str]] = Field(default_factory=list)
    confidence: float = 0.95

