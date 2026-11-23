"""Company Email and Communications Endpoints for AUREN SOLIAN."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user, AuthUser
from app.models.email import (
    EmailMessage,
    EmailDraft,
    EmailDraftCreate,
    EmailDraftUpdate,
    EmailSendRequest,
    EmailSendResult,
    EmailProviderStatus,
    EmailAIAssistRequest,
    EmailAIAssistResponse,
)
from app.services.email.service import email_service

router = APIRouter()


@router.get("/status", response_model=EmailProviderStatus)
async def get_email_provider_status(user: AuthUser = Depends(get_current_user)):
    """Returns the honest integration status of company email providers."""
    return email_service.get_status()


@router.get("/messages")
async def list_messages(
    folder: str = Query("inbox", pattern="^(inbox|sent|archive|trash)$"),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
):
    """Retrieves paginated messages for the specified folder."""
    messages, total = email_service.list_messages(
        folder=folder,
        search=search,
        page=page,
        page_size=page_size,
    )
    provider_status = email_service.get_status()
    return {
        "folder": folder,
        "messages": [m.model_dump() for m in messages],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "providerStatus": provider_status.model_dump(),
    }


@router.get("/messages/{message_id}", response_model=EmailMessage)
async def get_message(message_id: str, user: AuthUser = Depends(get_current_user)):
    """Retrieves a single message by ID."""
    msg = email_service.get_message(message_id)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email message with ID '{message_id}' not found.",
        )
    return msg


@router.post("/send", response_model=EmailSendResult)
async def send_email(request: EmailSendRequest, user: AuthUser = Depends(get_current_user)):
    """
    Sends an outbound company email.
    Explicit user action required. Rejects if provider is disconnected.
    """
    if not request.to_addresses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one recipient ('to_addresses') is required.",
        )
    if not request.subject.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email subject cannot be empty.",
        )

    result = await email_service.send_email(
        request=request,
        sender_email=user.email,
        sender_name=user.full_name,
        user_id=user.user_id,
    )
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error or "Failed to send email through provider.",
        )
    return result


# --- DRAFTS ---

@router.get("/drafts", response_model=List[EmailDraft])
async def list_drafts(user: AuthUser = Depends(get_current_user)):
    """Retrieves saved email drafts for the authenticated user."""
    return email_service.list_drafts(user.user_id)


@router.post("/drafts", response_model=EmailDraft, status_code=status.HTTP_201_CREATED)
async def create_draft(draft: EmailDraftCreate, user: AuthUser = Depends(get_current_user)):
    """Saves a new draft."""
    return email_service.save_draft(user.user_id, draft)


@router.get("/drafts/{draft_id}", response_model=EmailDraft)
async def get_draft(draft_id: str, user: AuthUser = Depends(get_current_user)):
    """Retrieves a specific draft."""
    d = email_service.get_draft(draft_id, user.user_id)
    if not d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email draft '{draft_id}' not found or belongs to another user.",
        )
    return d


@router.put("/drafts/{draft_id}", response_model=EmailDraft)
async def update_draft(
    draft_id: str,
    update: EmailDraftUpdate,
    user: AuthUser = Depends(get_current_user),
):
    """Updates an existing draft."""
    updated = email_service.update_draft(draft_id, user.user_id, update)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email draft '{draft_id}' not found or belongs to another user.",
        )
    return updated


@router.delete("/drafts/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_draft(draft_id: str, user: AuthUser = Depends(get_current_user)):
    """Deletes an email draft."""
    deleted = email_service.delete_draft(draft_id, user.user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email draft '{draft_id}' not found or already deleted.",
        )
    return None


# --- AI EMAIL ASSISTANCE ---

@router.post("/ai/assist", response_model=EmailAIAssistResponse)
async def ai_email_assist(
    request: EmailAIAssistRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Provides intelligent email assistance (drafting, tone improvement, summarization, reply drafting).
    All AI output is returned to client for explicit human editing and review before transmission.
    """
    return await email_service.assist(
        request=request,
        user_name=user.full_name,
        user_role=user.role.value,
    )
