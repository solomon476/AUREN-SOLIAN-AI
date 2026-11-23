"""Institutional knowledge repository and semantic search service."""
from typing import List, Optional
from app.models.knowledge import KnowledgeItem, KnowledgeItemCreate
from app.services.storage.sqlite_repository import repo
from app.core.security import get_allowed_classifications, UserRole


class KnowledgeService:
    def search(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        role: Optional[UserRole] = None,
    ) -> List[KnowledgeItem]:
        allowed = get_allowed_classifications(role) if role else None
        return repo.list_knowledge(
            query=query,
            category=category,
            allowed_classifications=allowed,
        )

    def get_by_id(self, item_id: str, role: Optional[UserRole] = None) -> Optional[KnowledgeItem]:
        item = repo.get_knowledge_item(item_id)
        if not item:
            return None
        if role:
            allowed = get_allowed_classifications(role)
            if item.classification not in allowed:
                return None
        return item

    def add_item(self, item: KnowledgeItemCreate, author: str) -> KnowledgeItem:
        return repo.add_knowledge_item(item, author=author)


knowledge_service = KnowledgeService()
