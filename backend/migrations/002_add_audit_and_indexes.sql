-- ==============================================================================
-- AUREN SOLIAN — Organizational Intelligence Platform
-- Migration: 002_add_audit_and_indexes.sql
-- Engine: SQLite (Local Development & Testing)
-- Description: Multi-tenant performance indexes and demo filter acceleration
-- ==============================================================================

-- Members & Departments
CREATE INDEX IF NOT EXISTS idx_members_org ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_dept ON members(department_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_is_demo ON members(is_demo);
CREATE INDEX IF NOT EXISTS idx_dept_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_dept ON teams(department_id);

-- Knowledge & Governance
CREATE INDEX IF NOT EXISTS idx_knowledge_org ON knowledge_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_class ON knowledge_items(classification);
CREATE INDEX IF NOT EXISTS idx_knowledge_is_demo ON knowledge_items(is_demo);
CREATE INDEX IF NOT EXISTS idx_knowledge_verified ON knowledge_items(is_verified);

-- Operations, Projects & Tasks
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_is_demo ON tasks(is_demo);

-- CRM & Enterprise Assets
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_docs_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_docs_class ON documents(classification);
CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_org ON company_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_time ON company_activities(timestamp);

