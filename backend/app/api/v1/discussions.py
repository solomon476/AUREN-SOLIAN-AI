"""Enterprise Discussions and Communication Threads API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_role, UserRole, AuthUser
from app.models.discussions import DiscussionMessageCreate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/channels")
async def list_channels(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    channels = repo.list_discussion_channels()
    return [
        {
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "description": c.description,
            "messageCount": c.message_count,
        }
        for c in channels
    ]


@router.get("/messages")
async def list_messages(
    channel_id: Optional[str] = None,
    channel_type: Optional[str] = None,
    parent_id: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    messages = repo.list_discussions(channel_id=channel_id, channel_type=channel_type, parent_id=parent_id)
    return [
        {
            "id": m.id,
            "organizationId": m.organization_id,
            "channelType": m.channel_type,
            "channelId": m.channel_id,
            "channelName": m.channel_name,
            "authorId": m.author_id,
            "authorName": m.author_name,
            "authorRole": m.author_role,
            "title": m.title,
            "content": m.content,
            "parentId": m.parent_id,
            "isPinned": m.is_pinned,
            "createdAt": m.created_at,
            "isDemo": m.is_demo,
        }
        for m in messages
    ]


@router.post("/messages", status_code=status.HTTP_201_CREATED)
async def create_message(
    body: DiscussionMessageCreate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    msg = repo.create_discussion(
        body,
        author_id=user.id,
        author_name=user.full_name,
        author_role=user.role.value,
    )
    return {
        "id": msg.id,
        "channelId": msg.channel_id,
        "authorName": msg.author_name,
        "content": msg.content,
        "createdAt": msg.created_at,
        "message": "Message posted successfully.",
    }

