"""Enterprise financial models for Solian Wolves company intelligence and records.

Covers:
- Financial Accounts (Bank, Mobile Money, Cash)
- Transaction Ledger (Income, Expense, Transfer)
- Invoices & Accounts Receivable
- Accounts Payable (Supplier Obligations)
- Company & Project Budgets
- Expense & Procurement Approval Requests
- Financial Overview Telemetry & Reports
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


ALLOWED_ACCOUNT_TYPES = {"bank", "mobile_money", "cash", "other"}
ALLOWED_ACCOUNT_STATUSES = {"active", "frozen", "archived"}

ALLOWED_TRANSACTION_TYPES = {"income", "expense", "transfer"}
ALLOWED_TRANSACTION_STATUSES = {"completed", "pending", "cancelled", "reversed"}
ALLOWED_PAYMENT_METHODS = {"bank_transfer", "mobile_money", "cash", "card", "cheque", "other"}

ALLOWED_INVOICE_STATUSES = {"draft", "issued", "partially_paid", "paid", "overdue", "cancelled"}
ALLOWED_PAYABLE_STATUSES = {"pending", "partially_paid", "paid", "overdue", "cancelled"}
ALLOWED_BUDGET_PERIODS = {"monthly", "quarterly", "annual", "project_specific"}
ALLOWED_BUDGET_STATUSES = {"active", "closed", "draft"}

ALLOWED_EXPENSE_REQUEST_STATUSES = {"submitted", "approved", "rejected", "paid", "cancelled"}
ALLOWED_URGENCIES = {"normal", "urgent", "critical"}


# =============================================================================
# 1. Financial Accounts
# =============================================================================
class FinancialAccount(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    name: str
    account_type: str  # bank | mobile_money | cash | other
    account_number: Optional[str] = None  # e.g., '•••• 4892' or 'Till 982142'
    currency: str = "KES"
    opening_balance: float = 0.0
    current_balance: float = 0.0
    status: str = "active"  # active | frozen | archived
    description: Optional[str] = None
    is_demo: bool = False
    created_at: str
    updated_at: str


class FinancialAccountCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    account_type: str = Field(default="bank")
    account_number: Optional[str] = Field(default=None, max_length=100)
    currency: str = Field(default="KES", max_length=10)
    opening_balance: float = Field(default=0.0, ge=0.0)
    description: Optional[str] = None

    @field_validator("account_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v.lower() not in ALLOWED_ACCOUNT_TYPES:
            raise ValueError(f"Invalid account type '{v}'. Allowed: {sorted(ALLOWED_ACCOUNT_TYPES)}")
        return v.lower()


class FinancialAccountUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


# =============================================================================
# 2. Transaction Ledger
# =============================================================================
class FinancialTransaction(BaseModel):
    id: str
    reference: str  # e.g., 'TX-2026-0001'
    organization_id: str = "org-solian-wolves"
    transaction_type: str  # income | expense | transfer
    date: str  # YYYY-MM-DD
    description: str
    amount: float
    currency: str = "KES"
    account_id: str
    account_name: Optional[str] = None
    destination_account_id: Optional[str] = None  # transfers only
    destination_account_name: Optional[str] = None
    category: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    invoice_id: Optional[str] = None
    payable_id: Optional[str] = None
    payment_method: str = "bank_transfer"
    status: str = "completed"  # completed | pending | cancelled | reversed
    recorded_by_id: str
    recorded_by_name: str
    supporting_document_url: Optional[str] = None
    notes: Optional[str] = None
    is_demo: bool = False
    created_at: str
    updated_at: str


class FinancialTransactionCreate(BaseModel):
    transaction_type: str
    date: str
    description: str = Field(min_length=3, max_length=300)
    amount: float = Field(gt=0.0)
    currency: str = Field(default="KES", max_length=10)
    account_id: str
    destination_account_id: Optional[str] = None
    category: str = Field(min_length=2, max_length=100)
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    invoice_id: Optional[str] = None
    payable_id: Optional[str] = None
    payment_method: str = Field(default="bank_transfer")
    supporting_document_url: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("transaction_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v.lower() not in ALLOWED_TRANSACTION_TYPES:
            raise ValueError(f"Invalid transaction type '{v}'. Allowed: {sorted(ALLOWED_TRANSACTION_TYPES)}")
        return v.lower()

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        if v.lower() not in ALLOWED_PAYMENT_METHODS:
            raise ValueError(f"Invalid payment method '{v}'. Allowed: {sorted(ALLOWED_PAYMENT_METHODS)}")
        return v.lower()


class FinancialTransactionUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    supporting_document_url: Optional[str] = None
    notes: Optional[str] = None


# =============================================================================
# 3. Invoices & Accounts Receivable
# =============================================================================
class InvoiceItem(BaseModel):
    description: str
    quantity: float = Field(default=1.0, gt=0.0)
    unit_price: float = Field(ge=0.0)
    subtotal: float = Field(ge=0.0)


class Invoice(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    invoice_number: str  # e.g., 'INV-2026-001'
    client_id: str
    client_name: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    issue_date: str
    due_date: str
    items: List[InvoiceItem]
    subtotal: float
    tax_rate: float = 0.0  # percentage, e.g. 16.0 for VAT
    tax_amount: float = 0.0
    total_amount: float
    amount_paid: float = 0.0
    balance_due: float
    currency: str = "KES"
    status: str = "issued"  # draft | issued | partially_paid | paid | overdue | cancelled
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_by: str
    is_demo: bool = False
    created_at: str
    updated_at: str


class InvoiceCreate(BaseModel):
    invoice_number: Optional[str] = None
    client_id: str
    client_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    issue_date: str
    due_date: str
    items: List[InvoiceItem]
    tax_rate: float = Field(default=0.0, ge=0.0, le=100.0)
    currency: str = Field(default="KES", max_length=10)
    notes: Optional[str] = None
    terms: Optional[str] = None


class InvoiceUpdate(BaseModel):
    due_date: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: Optional[str] = None


class InvoicePaymentRecord(BaseModel):
    amount: float = Field(gt=0.0)
    account_id: str
    payment_method: str = "bank_transfer"
    payment_reference: Optional[str] = None
    date: str
    notes: Optional[str] = None


# =============================================================================
# 4. Accounts Payable (Supplier Obligations & Bills)
# =============================================================================
class AccountsPayable(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    reference: str  # e.g., 'BILL-2026-001'
    supplier_name: str
    description: str
    category: str
    amount_due: float
    amount_paid: float = 0.0
    balance_due: float
    currency: str = "KES"
    due_date: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    status: str = "pending"  # pending | partially_paid | paid | overdue | cancelled
    supporting_document_url: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    is_demo: bool = False
    created_at: str
    updated_at: str


class AccountsPayableCreate(BaseModel):
    reference: Optional[str] = None
    supplier_name: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=2, max_length=300)
    category: str = Field(default="Operations")
    amount_due: float = Field(gt=0.0)
    currency: str = Field(default="KES", max_length=10)
    due_date: str
    project_id: Optional[str] = None
    supporting_document_url: Optional[str] = None
    notes: Optional[str] = None


class AccountsPayableUpdate(BaseModel):
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AccountsPayablePaymentRecord(BaseModel):
    amount: float = Field(gt=0.0)
    account_id: str
    payment_method: str = "bank_transfer"
    payment_reference: Optional[str] = None
    date: str
    notes: Optional[str] = None


# =============================================================================
# 5. Financial Budgets
# =============================================================================
class FinancialBudget(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    name: str
    period: str  # monthly | quarterly | annual | project_specific
    start_date: str
    end_date: str
    category: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    department: Optional[str] = None
    allocated_amount: float
    spent_amount: float = 0.0
    remaining_amount: float = 0.0
    utilization_percentage: float = 0.0
    currency: str = "KES"
    status: str = "active"  # active | closed | draft
    created_by: str
    notes: Optional[str] = None
    is_demo: bool = False
    created_at: str
    updated_at: str


class FinancialBudgetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    period: str = Field(default="quarterly")
    start_date: str
    end_date: str
    category: Optional[str] = None
    project_id: Optional[str] = None
    department: Optional[str] = None
    allocated_amount: float = Field(gt=0.0)
    currency: str = Field(default="KES", max_length=10)
    notes: Optional[str] = None

    @field_validator("period")
    @classmethod
    def validate_period(cls, v: str) -> str:
        if v.lower() not in ALLOWED_BUDGET_PERIODS:
            raise ValueError(f"Invalid budget period '{v}'. Allowed: {sorted(ALLOWED_BUDGET_PERIODS)}")
        return v.lower()


class FinancialBudgetUpdate(BaseModel):
    name: Optional[str] = None
    allocated_amount: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# =============================================================================
# 6. Expense & Procurement Approval Requests
# =============================================================================
class ExpenseRequest(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    title: str
    description: str
    category: str
    amount: float
    currency: str = "KES"
    requested_by_id: str
    requested_by_name: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    department: Optional[str] = None
    urgency: str = "normal"  # normal | urgent | critical
    status: str = "submitted"  # submitted | approved | rejected | paid | cancelled
    reviewed_by_id: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    review_comments: Optional[str] = None
    reviewed_at: Optional[str] = None
    transaction_id: Optional[str] = None
    supporting_document_url: Optional[str] = None
    is_demo: bool = False
    created_at: str
    updated_at: str


class ExpenseRequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3, max_length=500)
    category: str = Field(default="Operations")
    amount: float = Field(gt=0.0)
    currency: str = Field(default="KES", max_length=10)
    project_id: Optional[str] = None
    department: Optional[str] = None
    urgency: str = Field(default="normal")
    supporting_document_url: Optional[str] = None

    @field_validator("urgency")
    @classmethod
    def validate_urgency(cls, v: str) -> str:
        if v.lower() not in ALLOWED_URGENCIES:
            raise ValueError(f"Invalid urgency '{v}'. Allowed: {sorted(ALLOWED_URGENCIES)}")
        return v.lower()


class ExpenseRequestReview(BaseModel):
    action: str  # approve | reject
    comments: Optional[str] = None


class ExpenseRequestPay(BaseModel):
    account_id: str
    payment_method: str = "bank_transfer"
    payment_reference: Optional[str] = None
    date: str
    notes: Optional[str] = None


# =============================================================================
# 7. Financial Overview & Reports Telemetry
# =============================================================================
class FinancialOverviewStats(BaseModel):
    total_recorded_income: float
    total_recorded_expenses: float
    net_cash_movement: float
    total_recorded_balances: float
    outstanding_receivables: float
    outstanding_payables: float
    monthly_income: float
    monthly_expenditure: float
    budget_total_allocated: float
    budget_total_spent: float
    budget_utilization_percentage: float
    pending_approvals_count: int
    overdue_invoices_count: int
    accounts: List[FinancialAccount]
    recent_transactions: List[FinancialTransaction]
    cash_flow_trend: List[Dict[str, Any]]
    expense_by_category: List[Dict[str, Any]]


class ProjectFinancialSummary(BaseModel):
    project_id: str
    project_name: str
    allocated_budget: float
    actual_expenditure: float
    remaining_budget: float
    budget_utilization_percentage: float
    billed_revenue: float
    received_revenue: float
    outstanding_revenue: float
    transactions: List[FinancialTransaction]

