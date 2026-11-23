-- ==============================================================================
-- AUREN SOLIAN — Phase 4: Financial Intelligence & Company Records Migration
-- Migration: 20261122000003_auren_solian_finance_records.sql
-- Engine: PostgreSQL (Supabase / Production)
-- Description: Financial Accounts, Transaction Ledger, Invoices, Payables, Budgets, and Approvals
-- ==============================================================================

-- 1. Create Financial Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_account_type') THEN
        CREATE TYPE financial_account_type AS ENUM ('bank', 'mobile_money', 'cash', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_account_status') THEN
        CREATE TYPE financial_account_status AS ENUM ('active', 'frozen', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('completed', 'pending', 'cancelled', 'reversed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payable_status') THEN
        CREATE TYPE payable_status AS ENUM ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_period') THEN
        CREATE TYPE budget_period AS ENUM ('monthly', 'quarterly', 'annual', 'project_specific');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_request_status') THEN
        CREATE TYPE expense_request_status AS ENUM ('submitted', 'approved', 'rejected', 'paid', 'cancelled');
    END IF;
END $$;

-- 2. Financial Accounts
CREATE TABLE IF NOT EXISTS financial_accounts (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'bank',
    account_number TEXT,
    currency TEXT NOT NULL DEFAULT 'KES',
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active',
    description TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Invoices (Accounts Receivable)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    client_name TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    project_name TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'issued',
    notes TEXT,
    terms TEXT,
    created_by TEXT NOT NULL,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Accounts Payable (Supplier Bills & Obligations)
CREATE TABLE IF NOT EXISTS accounts_payable (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Operations',
    amount_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'KES',
    due_date TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    project_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    supporting_document_url TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Financial Budgets
CREATE TABLE IF NOT EXISTS financial_budgets (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    period TEXT NOT NULL DEFAULT 'quarterly',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    category TEXT,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    project_name TEXT,
    department TEXT,
    allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    spent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL,
    notes TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Financial Transactions (General Ledger)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    account_id TEXT NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    destination_account_id TEXT REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    category TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
    payable_id TEXT REFERENCES accounts_payable(id) ON DELETE SET NULL,
    payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
    status TEXT NOT NULL DEFAULT 'completed',
    recorded_by_id TEXT NOT NULL,
    recorded_by_name TEXT NOT NULL,
    supporting_document_url TEXT,
    notes TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Expense & Procurement Requests (Approvals)
CREATE TABLE IF NOT EXISTS expense_requests (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Operations',
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    requested_by_id TEXT NOT NULL,
    requested_by_name TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    project_name TEXT,
    department TEXT,
    urgency TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'submitted',
    reviewed_by_id TEXT,
    reviewed_by_name TEXT,
    review_comments TEXT,
    reviewed_at TIMESTAMPTZ,
    transaction_id TEXT REFERENCES financial_transactions(id) ON DELETE SET NULL,
    supporting_document_url TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Enable Row Level Security (RLS) on all Financial Tables
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;

-- 9. Create Strict Multi-Tenant Isolation Policies
CREATE POLICY financial_accounts_tenant_isolation ON financial_accounts
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''))
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

CREATE POLICY invoices_tenant_isolation ON invoices
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''))
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

CREATE POLICY accounts_payable_tenant_isolation ON accounts_payable
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''))
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

CREATE POLICY financial_budgets_tenant_isolation ON financial_budgets
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''))
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

CREATE POLICY financial_transactions_tenant_isolation ON financial_transactions
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''))
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

CREATE POLICY expense_requests_tenant_isolation ON expense_requests
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''))
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_fin_accounts_org ON financial_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_org_date ON financial_transactions(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fin_tx_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_fin_tx_account ON financial_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_project ON financial_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_client ON financial_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_payables_org_status ON accounts_payable(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_fin_budgets_org ON financial_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_fin_requests_org_status ON expense_requests(organization_id, status);

