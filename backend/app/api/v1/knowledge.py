"""Knowledge Vault and Semantic Search API."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.security import require_role, UserRole, AuthUser
from app.services.knowledge.knowledge_service import knowledge_service

router = APIRouter()


@router.get("/items")
async def get_items(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    items = knowledge_service.search(query=q, category=category)
    return [
        {
            "id": item.id,
            "title": item.title,
            "category": item.category,
            "snippet": item.snippet,
            "content": item.content,
            "updatedAt": item.updated_at,
            "author": item.author,
            "tags": item.tags,
        }
        for item in items
    ]

