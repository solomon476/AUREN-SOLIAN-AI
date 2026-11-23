"""Clients & CRM Accounts API."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.models.operations import ClientAccountCreate
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
