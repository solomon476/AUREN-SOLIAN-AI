"""Corporate Document Repository API with RBAC security and classification filtering."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser, get_allowed_classifications
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_documents(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    allowed = get_allowed_classifications(user.role)
    docs = repo.list_documents(allowed_classifications=allowed)
    return [
        {
            "id": d.id,
            "name": d.name,
            "type": d.type,
            "size": d.size,
            "classification": d.classification,
            "updatedAt": d.updated_at,
            "owner": d.owner,
            "department": d.department,
            "isDemo": d.is_demo,
        }
        for d in docs
    ]
