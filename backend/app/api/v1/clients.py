"""Clients & CRM Accounts API."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
async def list_clients(user: AuthUser = Depends(require_role(UserRole.MEMBER))):
    return [
        {
            "id": c.id,
            "companyName": c.company_name,
            "contactPerson": c.contact_person,
            "email": c.email,
            "status": c.status,
            "contractValue": c.contract_value,
            "leadAccountManager": c.lead_account_manager,
        }
        for c in repo.clients
    ]

