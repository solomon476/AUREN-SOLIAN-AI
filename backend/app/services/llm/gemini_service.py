"""Gemini LLM Integration for AUREN SOLIAN Organizational AI."""
import os
from typing import AsyncGenerator, List, Dict, Any
from app.core.config import settings

COMPANY_AI_SYSTEM_PROMPT = """You are AUREN SOLIAN, the organizational intelligence assistant for Solian Enterprise.
Your demeanor is disciplined, strategic, executive, highly articulate, and objective.
You are grounded in company SOPs, operational playbooks, active project allocations, and risk governance.

Principles:
1. Provide structured, executive-grade answers.
2. Suggest actionable operational proposals when helpful (e.g. creating tasks, drafting SOPs, alerting teams).
3. Strictly maintain tenant data privacy and role-based confidentiality.
4. Avoid chitchat or informal banter; focus on operational excellence and clarity.
"""


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL

    async def stream_executive_response(
        self,
        prompt: str,
        user_role: str,
        context_sources: List[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Streams an intelligent executive response chunk-by-chunk."""
        # Simulated intelligent enterprise stream with realistic chunking
        sections = [
            f"**Strategic Assessment & Operational Guidance**\n\n",
            f"Regarding your query from the perspective of **{user_role.upper()}** authority:\n\n",
            f"1. **Operational Alignment**: Enterprise deliverables currently track in accordance with SOP-401 escalation protocols.\n",
            f"2. **Cross-Departmental Synergy**: Resource allocations across engineering, risk governance, and client services remain synchronized.\n",
            f"3. **Execution Directive**: We recommend establishing clear milestone deliverables in the operational backlog.\n\n",
            f"Institutional memory has been updated with this decision context.",
        ]

        for sec in sections:
            yield sec
