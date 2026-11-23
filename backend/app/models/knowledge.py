"""Institutional knowledge models and schemas."""
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


ALLOWED_CLASSIFICATIONS = {"Public", "Internal", "Confidential", "Restricted"}


class KnowledgeItem(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    title: str
    category: str  # SOP | Policy | Playbook | Architecture | Compliance | Business Plan | Decision
    snippet: str
    content: str
    classification: str = "Internal"  # Public | Internal | Confidential | Restricted
    is_verified: bool = False  # False for unverified/demo content; True when approved by user/admin
    department: Optional[str] = None
    version: str = "1.0"
    updated_at: str
    author: str
    tags: List[str] = Field(default_factory=list)
    is_demo: bool = False


class KnowledgeItemCreate(BaseModel):
    title: str = Field(min_length=3, max_length=250)
    category: str = Field(min_length=2, max_length=50)
    snippet: str = Field(min_length=5, max_length=1000)
    content: str = Field(min_length=5)
    classification: str = Field(default="Internal")
    department: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    @field_validator("classification")
    @classmethod
    def validate_classification(cls, v: str) -> str:
        if v not in ALLOWED_CLASSIFICATIONS:
            raise ValueError(f"Invalid classification '{v}'. Allowed: {sorted(ALLOWED_CLASSIFICATIONS)}")
        return v


class KnowledgeQuery(BaseModel):
    query: Optional[str] = None
    category: Optional[str] = None
    classification: Optional[str] = None
    limit: int = 20
