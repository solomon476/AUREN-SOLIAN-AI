"""Enterprise Meetings and Minutes API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_role, UserRole, AuthUser
from app.models.meetings import Meeting, MeetingCreate, MeetingUpdate
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("")
@router.get("/")
async def list_meetings(
    status: Optional[str] = None,
    meeting_type: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    meetings = repo.list_meetings(status=status, meeting_type=meeting_type)
    return [
        {
            "id": m.id,
            "organizationId": m.organization_id,
            "title": m.title,
            "meetingType": m.meeting_type,
            "organizerName": m.organizer_name,
            "organizerId": m.organizer_id,
            "date": m.date,
            "time": m.time,
            "durationMinutes": m.duration_minutes,
            "location": m.location,
            "virtualLink": m.virtual_link,
            "relatedProjectId": m.related_project_id,
            "relatedClientId": m.related_client_id,
            "agenda": m.agenda,
            "discussionNotes": m.discussion_notes,
            "decisions": [d.model_dump() for d in m.decisions],
            "attendees": m.attendees,
            "actionItems": [a.model_dump() for a in m.action_items],
            "status": m.status,
            "createdAt": m.created_at,
            "isDemo": m.is_demo,
        }
        for m in meetings
    ]


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    meeting = repo.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return {
        "id": meeting.id,
        "organizationId": meeting.organization_id,
        "title": meeting.title,
        "meetingType": meeting.meeting_type,
        "organizerName": meeting.organizer_name,
        "organizerId": meeting.organizer_id,
        "date": meeting.date,
        "time": meeting.time,
        "durationMinutes": meeting.duration_minutes,
        "location": meeting.location,
        "virtualLink": meeting.virtual_link,
        "relatedProjectId": meeting.related_project_id,
        "relatedClientId": meeting.related_client_id,
        "agenda": meeting.agenda,
        "discussionNotes": meeting.discussion_notes,
        "decisions": [d.model_dump() for d in meeting.decisions],
        "attendees": meeting.attendees,
        "actionItems": [a.model_dump() for a in meeting.action_items],
        "status": meeting.status,
        "createdAt": meeting.created_at,
        "isDemo": meeting.is_demo,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_meeting(
    body: MeetingCreate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    created = repo.create_meeting(body, organizer_name=user.full_name, organizer_id=user.id)
    return {
        "id": created.id,
        "title": created.title,
        "date": created.date,
        "time": created.time,
        "status": created.status,
        "message": f"Successfully scheduled meeting '{created.title}'.",
    }


@router.patch("/{meeting_id}")
async def update_meeting(
    meeting_id: str,
    body: MeetingUpdate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    updated = repo.update_meeting(meeting_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return {
        "id": updated.id,
        "title": updated.title,
        "status": updated.status,
        "message": "Meeting updated successfully.",
    }


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    user: AuthUser = Depends(require_role(UserRole.MANAGER)),
):
    """Delete a scheduled meeting or minutes record. Restricted to MANAGER and above."""
    deleted = repo.delete_meeting(meeting_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    repo.log_activity(
        actor_name=user.full_name,
        action_type="meeting_deleted",
        title=f"Meeting Removed: {meeting_id}",
        description=f"Meeting {meeting_id} deleted by {user.full_name}.",
        module="meetings",
    )
    return {"id": meeting_id, "message": f"Successfully deleted meeting {meeting_id}."}


@router.post("/{meeting_id}/action-items/{action_item_id}/convert-to-task")
async def convert_action_item_to_task(
    meeting_id: str,
    action_item_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    task = repo.convert_meeting_action_to_task(meeting_id, action_item_id)
    if not task:
        raise HTTPException(status_code=404, detail="Meeting or action item not found.")
    return {
        "taskId": task.id,
        "title": task.title,
        "assigneeName": task.assignee,
        "status": task.status,
        "message": f"Action item converted to Task '{task.title}' (ID: {task.id}).",
    }


@router.post("/{meeting_id}/decisions/{decision_id}/publish-to-knowledge")
async def publish_decision_to_knowledge(
    meeting_id: str,
    decision_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    knowledge_item = repo.publish_meeting_decision_to_knowledge(meeting_id, decision_id, author_name=user.full_name)
    if not knowledge_item:
        raise HTTPException(status_code=404, detail="Meeting or decision item not found.")
    return {
        "knowledgeItemId": knowledge_item.id,
        "title": knowledge_item.title,
        "category": knowledge_item.category,
        "message": f"Decision published into Knowledge Vault as '{knowledge_item.title}'.",
    }
