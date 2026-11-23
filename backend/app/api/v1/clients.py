"""Clients & CRM Accounts API."""
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_role, UserRole, AuthUser
from app.models.operations import ClientAccountCreate, ClientAccountUpdate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_clients(user: AuthUser = Depends(require_role(UserRole.MEMBER))):
    clients = repo.list_clients()
    return [
        {
            "id": c.id,
            "companyName": c.company_name,
            "contactPerson": c.contact_person,
            "email": c.email,
            "status": c.status,
            "contractValue": c.contract_value,
            "leadAccountManager": c.lead_account_manager,
            "notes": c.notes,
            "isDemo": c.is_demo,
        }
        for c in clients
    ]


@router.post("")
async def create_client(
    client: ClientAccountCreate,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Register a new enterprise client account. Restricted to MANAGER and above."""
    created = repo.create_client(client)
    repo.log_activity(
        actor_name=user.full_name,
        action_type="client_created",
        title="Enterprise Account Registered",
        description=f"Client '{created.company_name}' registered by {user.full_name}.",
        module="clients",
    )
    return {
        "id": created.id,
        "companyName": created.company_name,
        "contactPerson": created.contact_person,
        "email": created.email,
        "status": created.status,
        "contractValue": created.contract_value,
        "leadAccountManager": created.lead_account_manager,
        "notes": created.notes,
        "isDemo": created.is_demo,
    }


@router.get("/{client_id}")
async def get_client(
    client_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """Retrieve an enterprise client account by ID."""
    client = repo.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client account not found.")
    return {
        "id": client.id,
        "companyName": client.company_name,
        "contactPerson": client.contact_person,
        "email": client.email,
        "status": client.status,
        "contractValue": client.contract_value,
        "leadAccountManager": client.lead_account_manager,
        "notes": client.notes,
        "isDemo": client.is_demo,
    }


@router.patch("/{client_id}")
async def update_client(
    client_id: str,
    body: ClientAccountUpdate,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Update client account details. Restricted to MANAGER and above."""
    updated = repo.update_client(client_id, body.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Client account not found.")
    repo.log_activity(
        actor_name=user.full_name,
        action_type="client_updated",
        title=f"Client Updated: {updated.company_name}",
        description=f"Client '{updated.company_name}' updated by {user.full_name}.",
        module="clients",
    )
    return {
        "id": updated.id,
        "companyName": updated.company_name,
        "contactPerson": updated.contact_person,
        "email": updated.email,
        "status": updated.status,
        "contractValue": updated.contract_value,
        "leadAccountManager": updated.lead_account_manager,
        "notes": updated.notes,
        "isDemo": updated.is_demo,
    }


@router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    """Delete client account record. Restricted to ADMIN and above."""
    deleted = repo.delete_client(client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client account not found.")
    repo.log_activity(
        actor_name=user.full_name,
        action_type="client_deleted",
        title=f"Client Record Deleted: {client_id}",
        description=f"Client {client_id} removed by {user.full_name}.",
        module="clients",
    )
    return {"id": client_id, "message": f"Successfully deleted client account {client_id}."}
