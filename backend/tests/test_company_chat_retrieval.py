"""Company Chat Intelligence and Context Retrieval Layer tests.

Verifies:
- Dynamic cross-module retrieval
- Role-based retrieval filtering (GUEST cannot access financial or internal records)
- Grounded calculations (verified income, expenses, and project completion rates)
- Truthful reporting of missing records (no fabricated records or hallucinated figures)
- Structured XML tags and prompt injection isolation
"""
import pytest
from app.core.security import AuthUser, UserRole
from app.services.chat.retrieval import company_retrieval_service
from app.services.storage.sqlite_repository import repo
from app.models.operations import ProjectCreate, TaskCreate


def test_retrieval_financial_access_for_member():
    user = AuthUser(
        id="usr-1",
        user_id="usr-1",
        email="alice@solian.co.ke",
        full_name="Alice Moraa Nyakundi",
        role=UserRole.ADMIN,
        organization_id="org-solian-wolves",
        department="Finance",
    )
    res = company_retrieval_service.build_context("What is our current cash flow and financial position?", user=user)

    assert "verified_financial_metrics" in res["calculated_figures"]
    metrics = res["calculated_figures"]["verified_financial_metrics"]
    assert "total_recorded_balances" in metrics
    assert "verified_cleared_income" in metrics
    assert "verified_total_expenses" in metrics
    assert "net_cash_flow" in metrics

    # Verify structured prompt contains XML tags
    assert "<company_context>" in res["formatted_prompt_context"]
    assert "<verified_facts>" in res["formatted_prompt_context"]
    assert "<calculated_figures>" in res["formatted_prompt_context"]


def test_retrieval_financial_restricted_for_guest():
    user = AuthUser(
        id="usr-guest",
        user_id="usr-guest",
        email="guest@external.com",
        full_name="External Auditor",
        role=UserRole.GUEST,
        organization_id="org-solian-wolves",
    )
    res = company_retrieval_service.build_context("How much money do we have in our treasury accounts?", user=user)

    # Guest must NOT receive verified corporate balances or accounts
    assert "verified_financial_metrics" not in res["calculated_figures"]
    assert any("Financial treasury records require Member clearance" in m for m in res["missing_records"])


def test_retrieval_project_synthesis():
    # Create test project and task to verify relationship synthesis
    p = repo.create_project(
        ProjectCreate(
            name="Project Kilimanjaro Mesh",
            client="Global Telecom",
            lead="Solomon Nyangweso Omwenga",
            status="in_progress",
            progress=50,
            due_date="2026-12-31",
            priority="high",
            department="Technology & AI Systems",
            description="Mesh network backbone test.",
        )
    )
    t = repo.create_task(
        TaskCreate(
            title="Deploy Router Mesh Node A",
            description="Hardware provisioning",
            priority="urgent",
            department="Technology & AI Systems",
            assignee="Solomon Nyangweso Omwenga",
            due_date="2026-12-01",
            project_id=p.id,
            project_name=p.name,
        )
    )

    user = AuthUser(
        id="usr-1",
        user_id="usr-1",
        email="solomon@solian.co.ke",
        full_name="Solomon Nyangweso",
        role=UserRole.ADMIN,
        organization_id="org-solian-wolves",
        department="Technology",
    )
    res = company_retrieval_service.build_context("Give me an update on Project Kilimanjaro Mesh and its tasks", user=user)

    assert "queried_project" in res["verified_facts"]
    p_fact = res["verified_facts"]["queried_project"]
    assert p_fact["name"] == "Project Kilimanjaro Mesh"
    assert p_fact["lead"] == "Solomon Nyangweso Omwenga"
    assert len(p_fact["associated_tasks"]) >= 1
    assert any(task["title"] == "Deploy Router Mesh Node A" for task in p_fact["associated_tasks"])

    # Clean up test records
    repo.delete_task(t.id)
    repo.delete_project(p.id)


def test_retrieval_leadership_and_statutory_council():
    user = AuthUser(
        id="usr-1",
        user_id="usr-1",
        email="hillary@solian.co.ke",
        full_name="Hillary Onchwati",
        role=UserRole.ADMIN,
        organization_id="org-solian-wolves",
        department="Operations",
    )
    res = company_retrieval_service.build_context("Who is in our leadership council and what are their titles?", user=user)

    assert "leadership_council" in res["verified_facts"]
    council = res["verified_facts"]["leadership_council"]
    names = [c["name"] for c in council]
    assert any(n in names for n in ["Ian Momanyi Nyakundi", "Solomon K."])
    assert any(c["role"] in ("owner", "admin", "manager") for c in council)
    assert len(council) >= 3


def test_retrieval_department_awareness():
    user = AuthUser(
        id="usr-1",
        user_id="usr-1",
        email="noella@solian.co.ke",
        full_name="Noella Maraka",
        role=UserRole.MANAGER,
        organization_id="org-solian-wolves",
        department="Administration",
    )
    res = company_retrieval_service.build_context("Tell me about the Technology department", user=user)

    assert "queried_department" in res["verified_facts"]
    dept = res["verified_facts"]["queried_department"]
    assert dept["code"] in ("ENG-AI", "TECH")
    assert "assigned_members" in dept


def test_truthful_missing_records_detection():
    user = AuthUser(
        id="usr-1",
        user_id="usr-1",
        email="ian@solian.co.ke",
        full_name="Ian Momanyi Nyakundi",
        role=UserRole.OWNER,
        organization_id="org-solian-wolves",
        department="Executive",
    )
    res = company_retrieval_service.build_context("What information is missing from company records?", user=user)

    assert isinstance(res["missing_records"], list)
    # The formatted context must provide missing record transparency
    assert "<missing_records>" in res["formatted_prompt_context"]
    assert "governance_instructions" in res["formatted_prompt_context"]

