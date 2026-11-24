"""Corporate Document Repository API with RBAC security and classification filtering."""
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_role, UserRole, AuthUser, get_allowed_classifications
from app.models.operations import CorporateDocumentCreate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_documents(user: AuthUser = Depends(require_role(UserRole.MEMBER))):
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


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """Retrieve document metadata by ID, enforcing classification clearance."""
    doc = repo.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    allowed = get_allowed_classifications(user.role)
    if doc.classification not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Document '{doc.name}' is classified as {doc.classification}.",
        )
    return {
        "id": doc.id,
        "name": doc.name,
        "type": doc.type,
        "size": doc.size,
        "classification": doc.classification,
        "updatedAt": doc.updated_at,
        "owner": doc.owner,
        "department": doc.department,
        "isDemo": doc.is_demo,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_document(
    body: CorporateDocumentCreate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """Register/Upload a corporate document. Restricted to MEMBER and above."""
    doc = repo.create_document(body, owner=user.full_name)
    return {
        "id": doc.id,
        "name": doc.name,
        "type": doc.type,
        "size": doc.size,
        "classification": doc.classification,
        "updatedAt": doc.updated_at,
        "owner": doc.owner,
        "department": doc.department,
        "isDemo": doc.is_demo,
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Delete a corporate document. Restricted to MANAGER and above."""
    deleted = repo.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    repo.log_activity(
        actor_name=user.full_name,
        action_type="doc_deleted",
        title=f"Document Deleted: {document_id}",
        description=f"Document {document_id} deleted by {user.full_name}.",
        module="documents",
    )
    return {"id": document_id, "message": f"Successfully deleted document {document_id}."}
