"""Institutional knowledge models and schemas."""
from typing import List, Optional
from pydantic import BaseModel


class KnowledgeItem(BaseModel):
    id: str
    title: str
    category: str  # SOP | Policy | Playbook | Architecture | Compliance
    snippet: str
    content: str
    updated_at: str
    author: str
    tags: List[str] = []


class KnowledgeQuery(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 10
