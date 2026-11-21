"""Corporate Document Repository API with RBAC security."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_documents(user: AuthUser = Depends(require_role(UserRole.MEMBER))):
    return [
        {
            "id": d.id,
            "name": d.name,
            "type": d.type,
            "size": d.size,
            "classification": d.classification,
            "updatedAt": d.updated_at,
            "owner": d.owner,
        }
        for d in repo.documents
    ]

