"""Institutional knowledge repository and semantic search service."""
from typing import List, Optional
from app.models.knowledge import KnowledgeItem

DEFAULT_KNOWLEDGE_VAULT: List[KnowledgeItem] = [
    KnowledgeItem(
        id="sop-401",
        title="Enterprise Incident Escalation Framework (SOP-401)",
        category="SOP",
        snippet="Mandatory protocol for Severity-1 operational bottlenecks, client notification SLAs, and executive escalation trees.",
        content="Full standard operating procedure outlining response SLAs (15 min for P1), command bridge setup, and client advisories.",
        updated_at="2026-11-20",
        author="Operations Director",
        tags=["incident", "SLA", "escalation", "executive"],
    ),
    KnowledgeItem(
        id="pol-202",
        title="Corporate Data Classification & Access Governance",
        category="Compliance",
        snippet="Mandatory controls for Confidential and Restricted business records, RBAC tiers, and AI boundary isolation.",
        content="Strict rules governing data tenancy, model training isolation, and credential management across departments.",
        updated_at="2026-11-18",
        author="Chief Risk Officer",
        tags=["security", "compliance", "RBAC", "governance"],
    ),
    KnowledgeItem(
        id="pb-105",
        title="High-Value Client Onboarding & Stakeholder Kickoff",
        category="Playbook",
        snippet="Step-by-step engagement ritual from contract signing to milestone-0 delivery review.",
        content="Playbook detailing technical discovery, resource allocation, and initial sprint velocity calibration.",
        updated_at="2026-11-15",
        author="Head of Client Services",
        tags=["clients", "onboarding", "milestones"],
    ),
    KnowledgeItem(
        id="arch-003",
        title="Solian Intelligence Mesh Architecture & Security Boundary",
        category="Architecture",
        snippet="Technical design of the multi-tenant context router, zero-trust LLM boundary, and asynchronous event bus.",
        content="Technical specifications of AUREN SOLIAN core architecture and container orchestration.",
        updated_at="2026-11-12",
        author="Enterprise Architect",
        tags=["architecture", "security", "ai-mesh"],
    ),
]


class KnowledgeService:
    def __init__(self):
        self._vault = list(DEFAULT_KNOWLEDGE_VAULT)

    def search(self, query: Optional[str] = None, category: Optional[str] = None) -> List[KnowledgeItem]:
        results = self._vault
        if category:
            results = [k for k in results if k.category.lower() == category.lower()]
        if query:
            q = query.lower()
            results = [
                k for k in results
                if q in k.title.lower() or q in k.snippet.lower() or any(q in t.lower() for t in k.tags)
            ]
        return results

    def get_by_id(self, item_id: str) -> Optional[KnowledgeItem]:
        for k in self._vault:
            if k.id == item_id:
                return k
        return None

    def add_item(self, item: KnowledgeItem) -> KnowledgeItem:
        self._vault.append(item)
        return item


knowledge_service = KnowledgeService()
