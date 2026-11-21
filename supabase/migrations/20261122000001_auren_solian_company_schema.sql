-- ==============================================================================
-- AUREN SOLIAN — Organizational Intelligence Platform
-- Migration: 20261122000001_auren_solian_company_schema.sql
-- Description: Multi-tenant organizational foundation with RBAC and RLS policies
-- ==============================================================================

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'member', 'guest');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE doc_classification AS ENUM ('Public', 'Internal', 'Confidential', 'Restricted');

-- 2. Organizations (Tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    tagline TEXT,
    tier TEXT DEFAULT 'enterprise',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Organization Members & RBAC
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    department TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

-- 4. Corporate Knowledge Vault (SOPs, Policies, Playbooks)
CREATE TABLE IF NOT EXISTS company_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    snippet TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enterprise Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    progress INTEGER NOT NULL DEFAULT 0,
    lead TEXT NOT NULL,
    due_date DATE,
    priority priority_level DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Operational Tasks & Kanban
CREATE TABLE IF NOT EXISTS operations_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority priority_level DEFAULT 'medium',
    assignee_id UUID REFERENCES organization_members(id),
    due_date TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Client CRM Accounts
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'prospect',
    contract_value TEXT,
    lead_account_manager TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Corporate Document Registry
CREATE TABLE IF NOT EXISTS corporate_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size TEXT NOT NULL,
    classification doc_classification NOT NULL DEFAULT 'Internal',
    storage_path TEXT,
    owner TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Automated Decision Workflows
CREATE TABLE IF NOT EXISTS automated_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    trigger_condition TEXT NOT NULL,
    action_directive TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    execution_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_workflows ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies (Sample RLS)
CREATE POLICY org_isolation_members ON organization_members
    USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY org_isolation_knowledge ON company_knowledge
    USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY org_isolation_projects ON projects
    USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

