"""Enterprise Finance and Company Records API endpoints for Solian Wolves."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from app.core.security import require_role, UserRole, AuthUser
from app.models.finance import (
    FinancialAccount,
    FinancialAccountCreate,
    FinancialAccountUpdate,
    FinancialTransaction,
    FinancialTransactionCreate,
    FinancialTransactionUpdate,
    Invoice,
    InvoiceItem,
    InvoiceCreate,
    InvoiceUpdate,
    InvoicePaymentRecord,
    AccountsPayable,
    AccountsPayableCreate,
    AccountsPayableUpdate,
    AccountsPayablePaymentRecord,
    FinancialBudget,
    FinancialBudgetCreate,
    FinancialBudgetUpdate,
    ExpenseRequest,
    ExpenseRequestCreate,
    ExpenseRequestReview,
    ExpenseRequestPay,
    FinancialOverviewStats,
    ProjectFinancialSummary,
)
from app.services.storage.sqlite_repository import repo

router = APIRouter()


class ReverseTransactionRequest(BaseModel):
    reason: str = Field(default="Administrative correction", min_length=3, max_length=300)


def serialize_account(a: FinancialAccount) -> Dict[str, Any]:
    return {
        "id": a.id,
        "organizationId": a.organization_id,
        "name": a.name,
        "accountType": a.account_type,
        "accountNumber": a.account_number,
        "currency": a.currency,
        "openingBalance": a.opening_balance,
        "currentBalance": a.current_balance,
        "status": a.status,
        "description": a.description,
        "isDemo": a.is_demo,
        "createdAt": a.created_at,
        "updatedAt": a.updated_at,
    }


def serialize_transaction(t: FinancialTransaction) -> Dict[str, Any]:
    return {
        "id": t.id,
        "reference": t.reference,
        "organizationId": t.organization_id,
        "transactionType": t.transaction_type,
        "date": t.date,
        "description": t.description,
        "amount": t.amount,
        "currency": t.currency,
        "accountId": t.account_id,
        "accountName": t.account_name,
        "destinationAccountId": t.destination_account_id,
        "destinationAccountName": t.destination_account_name,
        "category": t.category,
        "projectId": t.project_id,
        "projectName": t.project_name,
        "clientId": t.client_id,
        "clientName": t.client_name,
        "invoiceId": t.invoice_id,
        "payableId": t.payable_id,
        "paymentMethod": t.payment_method,
        "status": t.status,
        "recordedById": t.recorded_by_id,
        "recordedByName": t.recorded_by_name,
        "supportingDocumentUrl": t.supporting_document_url,
        "notes": t.notes,
        "isDemo": t.is_demo,
        "createdAt": t.created_at,
        "updatedAt": t.updated_at,
    }


def serialize_invoice(i: Invoice) -> Dict[str, Any]:
    return {
        "id": i.id,
        "organizationId": i.organization_id,
        "invoiceNumber": i.invoice_number,
        "clientId": i.client_id,
        "clientName": i.client_name,
        "projectId": i.project_id,
        "projectName": i.project_name,
        "issueDate": i.issue_date,
        "dueDate": i.due_date,
        "items": [it.model_dump() for it in i.items],
        "subtotal": i.subtotal,
        "taxRate": i.tax_rate,
        "taxAmount": i.tax_amount,
        "totalAmount": i.total_amount,
        "amountPaid": i.amount_paid,
        "balanceDue": i.balance_due,
        "currency": i.currency,
        "status": i.status,
        "notes": i.notes,
        "terms": i.terms,
        "createdBy": i.created_by,
        "isDemo": i.is_demo,
        "createdAt": i.created_at,
        "updatedAt": i.updated_at,
    }


def serialize_payable(p: AccountsPayable) -> Dict[str, Any]:
    return {
        "id": p.id,
        "organizationId": p.organization_id,
        "reference": p.reference,
        "supplierName": p.supplier_name,
        "description": p.description,
        "category": p.category,
        "amountDue": p.amount_due,
        "amountPaid": p.amount_paid,
        "balanceDue": p.balance_due,
        "currency": p.currency,
        "dueDate": p.due_date,
        "projectId": p.project_id,
        "projectName": p.project_name,
        "status": p.status,
        "supportingDocumentUrl": p.supporting_document_url,
        "notes": p.notes,
        "createdBy": p.created_by,
        "isDemo": p.is_demo,
        "createdAt": p.created_at,
        "updatedAt": p.updated_at,
    }


def serialize_budget(b: FinancialBudget) -> Dict[str, Any]:
    return {
        "id": b.id,
        "organizationId": b.organization_id,
        "name": b.name,
        "period": b.period,
        "startDate": b.start_date,
        "endDate": b.end_date,
        "category": b.category,
        "projectId": b.project_id,
        "projectName": b.project_name,
        "department": b.department,
        "allocatedAmount": b.allocated_amount,
        "spentAmount": b.spent_amount,
        "remainingAmount": b.remaining_amount,
        "utilizationPercentage": b.utilization_percentage,
        "currency": b.currency,
        "status": b.status,
        "createdBy": b.created_by,
        "notes": b.notes,
        "isDemo": b.is_demo,
        "createdAt": b.created_at,
        "updatedAt": b.updated_at,
    }


def serialize_expense_request(r: ExpenseRequest) -> Dict[str, Any]:
    return {
        "id": r.id,
        "organizationId": r.organization_id,
        "title": r.title,
        "description": r.description,
        "category": r.category,
        "amount": r.amount,
        "currency": r.currency,
        "requestedById": r.requested_by_id,
        "requestedByName": r.requested_by_name,
        "projectId": r.project_id,
        "projectName": r.project_name,
        "department": r.department,
        "urgency": r.urgency,
        "status": r.status,
        "reviewedById": r.reviewed_by_id,
        "reviewedByName": r.reviewed_by_name,
        "reviewComments": r.review_comments,
        "reviewedAt": r.reviewed_at,
        "transactionId": r.transaction_id,
        "supportingDocumentUrl": r.supporting_document_url,
        "isDemo": r.is_demo,
        "createdAt": r.created_at,
        "updatedAt": r.updated_at,
    }


def serialize_overview(stats: FinancialOverviewStats) -> Dict[str, Any]:
    return {
        "totalRecordedIncome": stats.total_recorded_income,
        "totalRecordedExpenses": stats.total_recorded_expenses,
        "netCashMovement": stats.net_cash_movement,
        "totalRecordedBalances": stats.total_recorded_balances,
        "outstandingReceivables": stats.outstanding_receivables,
        "outstandingPayables": stats.outstanding_payables,
        "monthlyIncome": stats.monthly_income,
        "monthlyExpenditure": stats.monthly_expenditure,
        "budgetTotalAllocated": stats.budget_total_allocated,
        "budgetTotalSpent": stats.budget_total_spent,
        "budgetUtilizationPercentage": stats.budget_utilization_percentage,
        "pendingApprovalsCount": stats.pending_approvals_count,
        "overdueInvoicesCount": stats.overdue_invoices_count,
        "accounts": [serialize_account(a) for a in stats.accounts],
        "recentTransactions": [serialize_transaction(t) for t in stats.recent_transactions],
        "cashFlowTrend": stats.cash_flow_trend,
        "expenseByCategory": stats.expense_by_category,
    }


def serialize_project_financials(pf: ProjectFinancialSummary) -> Dict[str, Any]:
    return {
        "projectId": pf.project_id,
        "projectName": pf.project_name,
        "allocatedBudget": pf.allocated_budget,
        "actualExpenditure": pf.actual_expenditure,
        "remainingBudget": pf.remaining_budget,
        "budgetUtilizationPercentage": pf.budget_utilization_percentage,
        "billedRevenue": pf.billed_revenue,
        "receivedRevenue": pf.received_revenue,
        "outstandingRevenue": pf.outstanding_revenue,
        "transactions": [serialize_transaction(t) for t in pf.transactions],
    }


# =============================================================================
# Overview & Telemetry
# =============================================================================
@router.get("/overview")
async def get_financial_overview(
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    stats = repo.get_financial_overview()
    return serialize_overview(stats)


# =============================================================================
# Accounts
# =============================================================================
@router.get("/accounts")
async def list_financial_accounts(
    include_archived: bool = Query(False),
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    accounts = repo.list_financial_accounts(include_archived=include_archived)
    return [serialize_account(a) for a in accounts]


@router.get("/accounts/{account_id}")
async def get_financial_account(
    account_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    acc = repo.get_financial_account(account_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Financial account not found")
    return serialize_account(acc)


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
async def create_financial_account(
    account: FinancialAccountCreate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    created = repo.create_financial_account(account)
    return serialize_account(created)


@router.patch("/accounts/{account_id}")
async def update_financial_account(
    account_id: str,
    update: FinancialAccountUpdate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    updated = repo.update_financial_account(account_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Financial account not found")
    return serialize_account(updated)


# =============================================================================
# Transactions
# =============================================================================
@router.get("/transactions")
async def list_transactions(
    account_id: Optional[str] = None,
    transaction_type: Optional[str] = None,
    category: Optional[str] = None,
    project_id: Optional[str] = None,
    client_id: Optional[str] = None,
    limit: int = Query(100, le=500),
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    txs = repo.list_transactions(
        account_id=account_id,
        transaction_type=transaction_type,
        category=category,
        project_id=project_id,
        client_id=client_id,
        limit=limit,
    )
    return [serialize_transaction(t) for t in txs]


@router.get("/transactions/{tx_id}")
async def get_transaction(
    tx_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    tx = repo.get_transaction(tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return serialize_transaction(tx)


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    tx: FinancialTransactionCreate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    try:
        created = repo.create_transaction(
            tx,
            recorded_by_id=user.user_id,
            recorded_by_name=user.full_name,
        )
        return serialize_transaction(created)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/transactions/{tx_id}/reverse")
async def reverse_transaction(
    tx_id: str,
    body: ReverseTransactionRequest,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    reversed_tx = repo.reverse_transaction(
        tx_id,
        actor_id=user.user_id,
        actor_name=user.full_name,
        reason=body.reason,
    )
    if not reversed_tx:
        raise HTTPException(status_code=404, detail="Transaction not found or already reversed")
    return serialize_transaction(reversed_tx)


# =============================================================================
# Invoices
# =============================================================================
@router.get("/invoices")
async def list_invoices(
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    project_id: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    invoices = repo.list_invoices(status=status, client_id=client_id, project_id=project_id)
    return [serialize_invoice(i) for i in invoices]


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    inv = repo.get_invoice(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_invoice(inv)


@router.post("/invoices", status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice: InvoiceCreate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    created = repo.create_invoice(invoice, creator_name=user.full_name)
    return serialize_invoice(created)


@router.patch("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    update: InvoiceUpdate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    updated = repo.update_invoice(invoice_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_invoice(updated)


@router.post("/invoices/{invoice_id}/payments")
async def record_invoice_payment(
    invoice_id: str,
    payment: InvoicePaymentRecord,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    updated = repo.record_invoice_payment(
        invoice_id,
        payment,
        recorded_by_id=user.user_id,
        recorded_by_name=user.full_name,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_invoice(updated)


# =============================================================================
# Accounts Payable
# =============================================================================
@router.get("/payables")
async def list_payables(
    status: Optional[str] = None,
    category: Optional[str] = None,
    project_id: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    payables = repo.list_payables(status=status, category=category, project_id=project_id)
    return [serialize_payable(p) for p in payables]


@router.get("/payables/{payable_id}")
async def get_payable(
    payable_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    p = repo.get_payable(payable_id)
    if not p:
        raise HTTPException(status_code=404, detail="Payable bill not found")
    return serialize_payable(p)


@router.post("/payables", status_code=status.HTTP_201_CREATED)
async def create_payable(
    payable: AccountsPayableCreate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    created = repo.create_payable(payable, creator_name=user.full_name)
    return serialize_payable(created)


@router.patch("/payables/{payable_id}")
async def update_payable(
    payable_id: str,
    update: AccountsPayableUpdate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    updated = repo.update_payable(payable_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Payable bill not found")
    return serialize_payable(updated)


@router.post("/payables/{payable_id}/payments")
async def record_payable_payment(
    payable_id: str,
    payment: AccountsPayablePaymentRecord,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    updated = repo.record_payable_payment(
        payable_id,
        payment,
        recorded_by_id=user.user_id,
        recorded_by_name=user.full_name,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Payable bill not found")
    return serialize_payable(updated)


# =============================================================================
# Budgets
# =============================================================================
@router.get("/budgets")
async def list_budgets(
    status: Optional[str] = None,
    period: Optional[str] = None,
    project_id: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    budgets = repo.list_budgets(status=status, period=period, project_id=project_id)
    return [serialize_budget(b) for b in budgets]


@router.get("/budgets/{budget_id}")
async def get_budget(
    budget_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    b = repo.get_budget(budget_id)
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
    return serialize_budget(b)


@router.post("/budgets", status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget: FinancialBudgetCreate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    created = repo.create_budget(budget, creator_name=user.full_name)
    return serialize_budget(created)


@router.patch("/budgets/{budget_id}")
async def update_budget(
    budget_id: str,
    update: FinancialBudgetUpdate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    updated = repo.update_budget(budget_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Budget not found")
    return serialize_budget(updated)


# =============================================================================
# Expense Requests
# =============================================================================
@router.get("/requests")
async def list_expense_requests(
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    requested_by_id: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    reqs = repo.list_expense_requests(status=status, urgency=urgency, requested_by_id=requested_by_id)
    return [serialize_expense_request(r) for r in reqs]


@router.get("/requests/{request_id}")
async def get_expense_request(
    request_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    r = repo.get_expense_request(request_id)
    if not r:
        raise HTTPException(status_code=404, detail="Expense request not found")
    return serialize_expense_request(r)


@router.post("/requests", status_code=status.HTTP_201_CREATED)
async def create_expense_request(
    request_data: ExpenseRequestCreate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    created = repo.create_expense_request(
        request_data,
        requested_by_id=user.user_id,
        requested_by_name=user.full_name,
    )
    return serialize_expense_request(created)


@router.post("/requests/{request_id}/review")
async def review_expense_request(
    request_id: str,
    review: ExpenseRequestReview,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    reviewed = repo.review_expense_request(
        request_id,
        review,
        reviewer_id=user.user_id,
        reviewer_name=user.full_name,
    )
    if not reviewed:
        raise HTTPException(status_code=404, detail="Expense request not found")
    return serialize_expense_request(reviewed)


@router.post("/requests/{request_id}/pay")
async def pay_expense_request(
    request_id: str,
    payment: ExpenseRequestPay,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    paid = repo.pay_expense_request(
        request_id,
        payment,
        actor_id=user.user_id,
        actor_name=user.full_name,
    )
    if not paid:
        raise HTTPException(status_code=400, detail="Expense request cannot be paid (must be in 'approved' status)")
    return serialize_expense_request(paid)


# =============================================================================
# Project Financials
# =============================================================================
@router.get("/projects/{project_id}")
async def get_project_financials(
    project_id: str,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    pf = repo.get_project_financials(project_id)
    return serialize_project_financials(pf)

