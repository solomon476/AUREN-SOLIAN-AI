"""Knowledge Vault and Semantic Search API."""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.core.security import require_role, UserRole, AuthUser, get_allowed_classifications
from app.models.knowledge import KnowledgeItemCreate
from app.services.knowledge.knowledge_service import knowledge_service
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/items")
async def get_items(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    items = knowledge_service.search(query=q, category=category, role=user.role)
    return [
        {
            "id": item.id,
            "title": item.title,
            "category": item.category,
            "snippet": item.snippet,
            "content": item.content,
            "classification": item.classification,
            "isVerified": item.is_verified,
            "isDemo": item.is_demo,
            "department": item.department,
            "version": item.version,
            "updatedAt": item.updated_at,
            "author": item.author,
            "tags": item.tags,
        }
        for item in items
    ]


@router.get("/items/{item_id}")
async def get_item(
    item_id: str,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    item = knowledge_service.get_by_id(item_id, role=user.role)
    if not item:
        # Check if item exists but is restricted
        unfiltered = repo.get_knowledge_item(item_id)
        if unfiltered:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Document '{unfiltered.title}' is classified as {unfiltered.classification}.",
            )
        raise HTTPException(status_code=404, detail="Knowledge item not found.")

    return {
        "id": item.id,
        "title": item.title,
        "category": item.category,
        "snippet": item.snippet,
        "content": item.content,
        "classification": item.classification,
        "isVerified": item.is_verified,
        "isDemo": item.is_demo,
        "department": item.department,
        "version": item.version,
        "updatedAt": item.updated_at,
        "author": item.author,
        "tags": item.tags,
    }


@router.post("/items")
async def create_item(
    item: KnowledgeItemCreate,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Index a new verified SOP or Policy. Restricted to MANAGER and above."""
    created = knowledge_service.add_item(item, author=user.full_name)
    return {
        "id": created.id,
        "title": created.title,
        "category": created.category,
        "snippet": created.snippet,
        "content": created.content,
        "classification": created.classification,
        "isVerified": created.is_verified,
        "isDemo": created.is_demo,
        "department": created.department,
        "version": created.version,
        "updatedAt": created.updated_at,
        "author": created.author,
        "tags": created.tags,
    }


@router.get("/categories")
async def list_categories(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    items = knowledge_service.search(role=user.role)
    category_counts = {}
    for it in items:
        cat = it.category
        category_counts[cat] = category_counts.get(cat, 0) + 1

    return [
        {"category": cat, "count": count}
        for cat, count in sorted(category_counts.items(), key=lambda x: x[0])
    ]
