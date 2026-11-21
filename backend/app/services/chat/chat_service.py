"""Company chat service handling SSE formatting and action proposals."""
import json
import asyncio
from typing import AsyncGenerator
from app.services.llm.gemini_service import GeminiService
from app.services.knowledge.knowledge_service import knowledge_service


class ChatService:
    def __init__(self):
        self.llm = GeminiService()

    async def generate_chat_stream(
        self,
        message: str,
        user_role: str,
    ) -> AsyncGenerator[str, None]:
        # Perform retrieval from company knowledge
        knowledge_matches = knowledge_service.search(query=message)
        context_sources = [k.title for k in knowledge_matches[:2]] or ["Institutional Knowledge Base"]

        # Stream response
        async for chunk in self.llm.stream_executive_response(
            prompt=message,
            user_role=user_role,
            context_sources=context_sources,
        ):
            payload = json.dumps({"content": chunk})
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.04)

        yield "data: [DONE]\n\n"


chat_service = ChatService()

