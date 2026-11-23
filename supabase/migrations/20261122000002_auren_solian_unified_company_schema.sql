-- ==============================================================================
-- AUREN SOLIAN — Organizational Intelligence Platform
-- Migration: 20261122000002_auren_solian_unified_company_schema.sql
-- Engine: PostgreSQL (Supabase / Production)
-- Description: Unified 14 company tables with RBAC, Foreign Keys, RLS and Indexes
-- ==============================================================================

-- 1. Create Enums if they do not exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'member', 'guest');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical', 'urgent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_classification') THEN
        CREATE TYPE doc_classification AS ENUM ('Public', 'Internal', 'Confidential', 'Restricted');
    END IF;
END $$;

-- 2. Organizations (Tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    tagline TEXT,
    mission TEXT,
    vision TEXT,
    operating_model TEXT,
    headquarters TEXT,
    founded_year INTEGER,
    primary_timezone TEXT DEFAULT 'UTC',
    fiscal_year TEXT,
    tier TEXT DEFAULT 'enterprise',
    total_members INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Departments
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    lead_id TEXT,
    lead_name TEXT NOT NULL,
    member_count INTEGER DEFAULT 0,
    active_initiatives INTEGER DEFAULT 0,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Teams
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    name TEXT NOT NULL,
    lead_name TEXT NOT NULL,
    description TEXT,
    focus_area TEXT,
    member_count INTEGER DEFAULT 0,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Members (Staff Directory & RBAC Identity)
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    auth_user_id TEXT UNIQUE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'member',
    title TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    department TEXT NOT NULL,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    team TEXT,
    responsibilities JSONB DEFAULT '[]'::jsonb,
    reports_to_id TEXT,
    reports_to_name TEXT,
    status TEXT DEFAULT 'active',
    assigned_projects INTEGER DEFAULT 0,
    joined_date TEXT DEFAULT '2024-01-15',
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Operating Principles
CREATE TABLE IF NOT EXISTS operating_principles (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Operating Cadences
CREATE TABLE IF NOT EXISTS operating_cadences (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cadence TEXT NOT NULL,
    audience TEXT NOT NULL,
    description TEXT NOT NULL,
    lead TEXT NOT NULL,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Corporate Knowledge Vault
CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    snippet TEXT NOT NULL,
    content TEXT NOT NULL,
    classification doc_classification NOT NULL DEFAULT 'Internal',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    department TEXT,
    version TEXT DEFAULT '1.0',
    updated_at TEXT NOT NULL,
    author TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    progress INTEGER NOT NULL DEFAULT 0,
    lead TEXT NOT NULL,
    due_date TEXT NOT NULL,
    priority priority_level DEFAULT 'medium',
    department TEXT,
    description TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Operational Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    project_name TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority priority_level DEFAULT 'medium',
    assignee TEXT NOT NULL,
    due_date TEXT NOT NULL,
    department TEXT,
    created_at TEXT DEFAULT '2026-11-20',
    is_demo BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Client CRM Accounts
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'prospect',
    contract_value TEXT,
    lead_account_manager TEXT NOT NULL,
    notes TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Corporate Documents Registry
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size TEXT NOT NULL,
    classification doc_classification NOT NULL DEFAULT 'Internal',
    updated_at TEXT NOT NULL,
    owner TEXT NOT NULL,
    department TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Workflows & Automation Rules
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    execution_count INTEGER NOT NULL DEFAULT 0,
    department TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Company Activity Audit Log
CREATE TABLE IF NOT EXISTS company_activities (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    module TEXT NOT NULL,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Executed Chat Proposals
CREATE TABLE IF NOT EXISTS executed_proposals (
    id TEXT NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    executed_by TEXT NOT NULL,
    executed_at TEXT NOT NULL,
    PRIMARY KEY (organization_id, id)
);

-- 16. Meetings & Governance Minutes
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    meeting_type TEXT NOT NULL DEFAULT 'department',
    organizer_name TEXT NOT NULL,
    organizer_id TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    virtual_link TEXT,
    related_project_id TEXT,
    related_client_id TEXT,
    agenda JSONB DEFAULT '[]'::jsonb,
    discussion_notes TEXT DEFAULT '',
    decisions JSONB DEFAULT '[]'::jsonb,
    attendees JSONB DEFAULT '[]'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_demo BOOLEAN DEFAULT FALSE
);

-- 17. Internal Discussions & Strategic Threads
CREATE TABLE IF NOT EXISTS discussions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL DEFAULT 'company',
    channel_id TEXT NOT NULL DEFAULT 'general',
    channel_name TEXT NOT NULL DEFAULT 'General Announcements',
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'member',
    title TEXT,
    content TEXT NOT NULL,
    parent_id TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_demo BOOLEAN DEFAULT FALSE
);

-- 18. Notifications & Dispatch Center
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    link_module TEXT,
    link_id TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Indexes for Performance & Scalability
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_pg_members_org ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_members_dept ON members(department_id);
CREATE INDEX IF NOT EXISTS idx_pg_members_user_id ON members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_members_auth_user_id ON members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_pg_members_is_demo ON members(is_demo);

CREATE INDEX IF NOT EXISTS idx_pg_dept_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_teams_dept ON teams(department_id);

CREATE INDEX IF NOT EXISTS idx_pg_knowledge_org ON knowledge_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_knowledge_class ON knowledge_items(classification);
CREATE INDEX IF NOT EXISTS idx_pg_knowledge_is_demo ON knowledge_items(is_demo);

CREATE INDEX IF NOT EXISTS idx_pg_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_pg_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_tasks_proj ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pg_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_pg_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_docs_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_docs_class ON documents(classification);
CREATE INDEX IF NOT EXISTS idx_pg_workflows_org ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_activities_org ON company_activities(organization_id);

CREATE INDEX IF NOT EXISTS idx_pg_meetings_org ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_meetings_date ON meetings(date);
CREATE INDEX IF NOT EXISTS idx_pg_discussions_org ON discussions(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_discussions_channel ON discussions(channel_id);
CREATE INDEX IF NOT EXISTS idx_pg_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_pg_notifications_user ON notifications(user_id);

-- ==============================================================================
-- Row-Level Security (RLS) Policies — Multi-Tenant Boundary Enforcement
-- ==============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE executed_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper tenant isolation policies for all enterprise tenant tables
DO $$ BEGIN
    -- 1. organizations
    DROP POLICY IF EXISTS org_tenant_isolation ON organizations;
    CREATE POLICY org_tenant_isolation ON organizations
        FOR ALL USING (id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 2. departments
    DROP POLICY IF EXISTS dept_tenant_isolation ON departments;
    CREATE POLICY dept_tenant_isolation ON departments
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 3. teams
    DROP POLICY IF EXISTS teams_tenant_isolation ON teams;
    CREATE POLICY teams_tenant_isolation ON teams
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 4. members
    DROP POLICY IF EXISTS members_tenant_isolation ON members;
    CREATE POLICY members_tenant_isolation ON members
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 5. operating_principles
    DROP POLICY IF EXISTS principles_tenant_isolation ON operating_principles;
    CREATE POLICY principles_tenant_isolation ON operating_principles
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 6. operating_cadences
    DROP POLICY IF EXISTS cadences_tenant_isolation ON operating_cadences;
    CREATE POLICY cadences_tenant_isolation ON operating_cadences
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 7. knowledge_items
    DROP POLICY IF EXISTS knowledge_tenant_isolation ON knowledge_items;
    CREATE POLICY knowledge_tenant_isolation ON knowledge_items
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 8. projects
    DROP POLICY IF EXISTS projects_tenant_isolation ON projects;
    CREATE POLICY projects_tenant_isolation ON projects
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 9. tasks
    DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
    CREATE POLICY tasks_tenant_isolation ON tasks
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 10. clients
    DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
    CREATE POLICY clients_tenant_isolation ON clients
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 11. documents
    DROP POLICY IF EXISTS documents_tenant_isolation ON documents;
    CREATE POLICY documents_tenant_isolation ON documents
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 12. workflows
    DROP POLICY IF EXISTS workflows_tenant_isolation ON workflows;
    CREATE POLICY workflows_tenant_isolation ON workflows
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 13. company_activities
    DROP POLICY IF EXISTS activities_tenant_isolation ON company_activities;
    CREATE POLICY activities_tenant_isolation ON company_activities
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 14. executed_proposals
    DROP POLICY IF EXISTS proposals_tenant_isolation ON executed_proposals;
    CREATE POLICY proposals_tenant_isolation ON executed_proposals
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 15. meetings
    DROP POLICY IF EXISTS meetings_tenant_isolation ON meetings;
    CREATE POLICY meetings_tenant_isolation ON meetings
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 16. discussions
    DROP POLICY IF EXISTS discussions_tenant_isolation ON discussions;
    CREATE POLICY discussions_tenant_isolation ON discussions
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));

    -- 17. notifications
    DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
    CREATE POLICY notifications_tenant_isolation ON notifications
        FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), ''));
END $$;

