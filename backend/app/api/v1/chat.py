"""SSE Streaming and Chat endpoints for Company AI."""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ExecuteActionRequest, ExecuteActionResult
from app.core.security import get_optional_user, AuthUser, require_role, UserRole
from app.services.chat.chat_service import chat_service

router = APIRouter()


@router.post("/stream")
async def stream_chat(
    req: ChatRequest,
    current_user: AuthUser = Depends(get_optional_user),
):
    stream = chat_service.generate_chat_stream(
        message=req.message,
        user=current_user,
        history=req.history,
        workspace_context=req.workspace_context,
    )
    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/execute-action")
async def execute_action(
    req: ExecuteActionRequest,
    current_user: AuthUser = Depends(require_role(UserRole.MEMBER)),
) -> ExecuteActionResult:
    """Executes a confirmed action proposal from AUREN SOLIAN on the enterprise repository."""
    return chat_service.execute_action(req, current_user)
