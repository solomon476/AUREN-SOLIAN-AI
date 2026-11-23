"""Enterprise LLM Integration for AUREN SOLIAN Organizational AI.

Supports direct, low-latency asynchronous HTTP streaming:
- Primary: Google Gemini API (gemini-3.5-flash-lite) via official REST SSE streaming.
- Fallback: Groq Cloud API (openai/gpt-oss-120b) via OpenAI-compatible SSE streaming.
- Honest error reporting: Never substitutes fabricated fake text for failed LLM calls.
"""
import os
import json
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

COMPANY_AI_SYSTEM_PROMPT = """You are AUREN SOLIAN, the organizational intelligence assistant for Solian Wolves.
Your tone is composed, precise, articulate, executive, and business-oriented.
You serve as the operational and organizational intelligence system for Solian Wolves.

Operational Directives:
1. Ground answers strictly in verified Solian Wolves organizational context (SOPs, company policies, active initiatives, financial intelligence, and operational tasks).
2. Distinguish verified company knowledge from suggestions and assumptions. Never invent company facts, policies, or client engagements.
3. If information is not found in company records, explicitly state that it is not documented, identify the missing information, and propose creating a task or drafting an SOP to establish it.
4. Strictly respect role-based access control (RBAC):
   - OWNER / ADMIN: Full organizational and architecture scope.
   - MANAGER: Departmental operations, SOP indexing, team delegation.
   - MEMBER: Task execution, internal SOPs, project collaboration.
   - GUEST: Public company info only. Do NOT reveal internal, confidential, or restricted records.
5. Propose actionable operational steps (e.g. creating tasks, drafting SOPs, alerting teams) for human review and confirmation; never execute consequential actions silently.
6. Maintain business precision: avoid conversational filler, emojis, or casual banter.
"""


class GeminiService:
    def __init__(self):
        self.model_name = settings.GEMINI_MODEL
        self.groq_model = settings.GROQ_MODEL

    async def stream_executive_response(
        self,
        prompt: str,
        user_role: str = "member",
        user_name: str = "Solian Operator",
        user_department: str = "Operations",
        context_sources: Optional[List[str]] = None,
        operational_context: Optional[Dict[str, Any]] = None,
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        workspace_context: Optional[str] = None,
        restricted_attempt: bool = False,
    ) -> AsyncGenerator[str, None]:
        """
        Streams an intelligent executive response chunk-by-chunk using verified LLM providers.
        """
        import asyncio

        # 1. Access Restriction Guard (RBAC Policy Enforcement)
        if restricted_attempt:
            chunks = [
                "### 🛡️ Access Restricted Under Solian Wolves Governance\n\n",
                f"Your query requests information classified beyond your assigned tier (**{user_role.upper()}**).\n\n",
                "Under **Corporate Data Classification & Access Governance (POL-202)**:\n",
                "- **Guest Tier**: Restricted to Public operating guidelines.\n",
                "- **Internal / Confidential Records**: Accessible only to verified organization Members, Managers, and Executive Administrators.\n\n",
                "If this data is necessary for your deliverables, please request clearance from an Organization Administrator (`Ian Momanyi Nyakundi` or `Hillary Onchwati Isaiah`).",
            ]
            for c in chunks:
                yield c
                await asyncio.sleep(0.02)
            return

        # 2. Build system context message
        context_preamble = (
            f"Organizational Operating Context for Solian Wolves:\n"
            f"- Active User: {user_name} (Role: {user_role.upper()}, Department: {user_department})\n"
            f"- Active Workspace Module: {workspace_context or 'General Command'}\n"
            f"- Verified Knowledge Sources: {json.dumps(context_sources or [])}\n"
            f"- Accessible Company Documentation: {json.dumps(knowledge_context or [])}\n"
            f"- Operational Records & Financial Intelligence: {json.dumps(operational_context or {})}\n"
        )

        user_content_prompt = f"{context_preamble}\n\nUser Directive/Query:\n{prompt}"

        # 3. Attempt Google Gemini Stream
        gemini_key = settings.effective_gemini_key
        chunks_yielded = 0
        if gemini_key:
            try:
                async for chunk in self._stream_gemini(
                    prompt=user_content_prompt,
                    history=history,
                    gemini_key=gemini_key,
                ):
                    yield chunk
                    chunks_yielded += 1
                if chunks_yielded > 0:
                    return
            except Exception as exc:
                logger.warning(f"Gemini API streaming error: {exc}")

        # 4. Attempt Groq Fallback Stream (only if Gemini yielded nothing or failed)
        if chunks_yielded == 0:
            groq_key = settings.effective_groq_key
            if groq_key:
                try:
                    async for chunk in self._stream_groq(
                        prompt=user_content_prompt,
                        history=history,
                        groq_key=groq_key,
                    ):
                        yield chunk
                        chunks_yielded += 1
                    if chunks_yielded > 0:
                        return
                except Exception as exc:
                    logger.warning(f"Groq API streaming fallback error: {exc}")

        # 5. Honest Error Reporting (No fake canned response substitution)
        err_chunks = [
            "### ⚠️ AI Intelligence Service Offline\n\n",
            "Unable to establish a live connection to verified enterprise AI intelligence providers.\n\n",
            "**Operational Telemetry**:\n",
            f"- **Primary Provider**: Google Gemini (`{self.model_name}`)\n",
            f"- **Fallback Provider**: Groq Cloud (`{self.groq_model}`)\n",
            "- **Status**: Upstream connection failed or API credentials not initialized in current environment.\n\n",
            "**Governance Directive**:\n",
            "Per company operational integrity policy, AUREN SOLIAN does not fabricate pre-canned AI responses when provider connections are offline. Please verify API configuration or try again.",
        ]
        for c in err_chunks:
            yield c
            await asyncio.sleep(0.02)

    async def _stream_gemini(
        self,
        prompt: str,
        history: Optional[List[Dict[str, Any]]],
        gemini_key: str,
    ) -> AsyncGenerator[str, None]:
        """Streams directly from Google Gemini REST SSE endpoint."""
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:streamGenerateContent"
            f"?alt=sse&key={gemini_key}"
        )

        contents = []
        if history:
            for item in history[-6:]:
                role = "model" if item.get("role") in ("assistant", "model") else "user"
                content_text = item.get("content", "")
                if content_text:
                    contents.append({
                        "role": role,
                        "parts": [{"text": str(content_text)}],
                    })

        contents.append({
            "role": "user",
            "parts": [{"text": prompt}],
        })

        payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": COMPANY_AI_SYSTEM_PROMPT}],
            },
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
            },
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream(
                "POST",
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "curl/8.5.0",
                },
            ) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise RuntimeError(f"Gemini API returned status {response.status_code}: {err_body.decode('utf-8', errors='ignore')}")

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_text = line[6:].strip()
                        if not data_text or data_text == "[DONE]":
                            continue
                        try:
                            parsed = json.loads(data_text)
                            candidates = parsed.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                for p in parts:
                                    text = p.get("text", "")
                                    if text:
                                        yield text
                        except Exception:
                            continue

    async def _stream_groq(
        self,
        prompt: str,
        history: Optional[List[Dict[str, Any]]],
        groq_key: str,
    ) -> AsyncGenerator[str, None]:
        """Streams directly from Groq Cloud OpenAI-compatible endpoint."""
        url = "https://api.groq.com/openai/v1/chat/completions"

        messages = [{"role": "system", "content": COMPANY_AI_SYSTEM_PROMPT}]
        if history:
            for item in history[-6:]:
                role = "assistant" if item.get("role") in ("assistant", "model") else "user"
                content_text = item.get("content", "")
                if content_text:
                    messages.append({"role": role, "content": str(content_text)})

        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.groq_model,
            "messages": messages,
            "stream": True,
            "temperature": 0.2,
            "max_tokens": 2048,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "curl/8.5.0",
                },
            ) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise RuntimeError(f"Groq API returned status {response.status_code}: {err_body.decode('utf-8', errors='ignore')}")

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_text = line[6:].strip()
                        if not data_text or data_text == "[DONE]":
                            continue
                        try:
                            parsed = json.loads(data_text)
                            choices = parsed.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                text = delta.get("content", "")
                                if text:
                                    yield text
                        except Exception:
                            continue
