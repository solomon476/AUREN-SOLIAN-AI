"""SSE Streaming and Chat endpoints for Company AI."""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest
from app.core.security import get_current_user, AuthUser
from app.services.chat.chat_service import chat_service

router = APIRouter()


@router.post("/stream")
async def stream_chat(
    req: ChatRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    user_role = req.user_role or current_user.role.value
    stream = chat_service.generate_chat_stream(
        message=req.message,
        user_role=user_role,
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

