-- ==============================================================================
-- AUREN SOLIAN — Organizational Intelligence Platform
-- Migration: 001_initial_company_schema.sql
-- Engine: SQLite (Local Development & Testing)
-- Description: Core 14 company tables with explicit is_demo tracking
-- ==============================================================================

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
    total_members INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    lead_id TEXT,
    lead_name TEXT NOT NULL,
    member_count INTEGER DEFAULT 0,
    active_initiatives INTEGER DEFAULT 0,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    department_id TEXT NOT NULL,
    department_name TEXT NOT NULL,
    name TEXT NOT NULL,
    lead_name TEXT NOT NULL,
    description TEXT,
    focus_area TEXT,
    member_count INTEGER DEFAULT 0,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    auth_user_id TEXT UNIQUE,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    title TEXT NOT NULL,
    department_id TEXT,
    department TEXT NOT NULL,
    team_id TEXT,
    team TEXT,
    responsibilities TEXT,
    reports_to_id TEXT,
    reports_to_name TEXT,
    status TEXT DEFAULT 'active',
    assigned_projects INTEGER DEFAULT 0,
    joined_date TEXT DEFAULT '2024-01-15',
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS operating_principles (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS operating_cadences (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    cadence TEXT NOT NULL,
    audience TEXT NOT NULL,
    description TEXT NOT NULL,
    lead TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    snippet TEXT NOT NULL,
    content TEXT NOT NULL,
    classification TEXT NOT NULL DEFAULT 'Internal',
    is_verified INTEGER NOT NULL DEFAULT 0,
    department TEXT,
    version TEXT DEFAULT '1.0',
    updated_at TEXT NOT NULL,
    author TEXT NOT NULL,
    tags TEXT,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    client TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    progress INTEGER NOT NULL DEFAULT 0,
    lead TEXT NOT NULL,
    due_date TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    department TEXT,
    description TEXT,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    project_id TEXT,
    project_name TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee TEXT NOT NULL,
    due_date TEXT NOT NULL,
    department TEXT,
    created_at TEXT DEFAULT '2026-11-20',
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'prospect',
    contract_value TEXT,
    lead_account_manager TEXT NOT NULL,
    notes TEXT,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size TEXT NOT NULL,
    classification TEXT NOT NULL DEFAULT 'Internal',
    updated_at TEXT NOT NULL,
    owner TEXT NOT NULL,
    department TEXT,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    title TEXT NOT NULL,
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    execution_count INTEGER NOT NULL DEFAULT 0,
    department TEXT,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS company_activities (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    module TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS executed_proposals (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
    action_type TEXT NOT NULL,
    executed_by TEXT NOT NULL,
    executed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
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
    agenda TEXT DEFAULT '[]',
    discussion_notes TEXT DEFAULT '',
    decisions TEXT DEFAULT '[]',
    attendees TEXT DEFAULT '[]',
    action_items TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS discussions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
    channel_type TEXT NOT NULL DEFAULT 'company',
    channel_id TEXT NOT NULL DEFAULT 'general',
    channel_name TEXT NOT NULL DEFAULT 'General Announcements',
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'member',
    title TEXT,
    content TEXT NOT NULL,
    parent_id TEXT,
    is_pinned INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    link_module TEXT,
    link_id TEXT,
    is_read INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'normal',
    created_at TEXT NOT NULL
);

