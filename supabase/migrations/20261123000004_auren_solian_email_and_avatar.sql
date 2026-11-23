-- ==============================================================================
-- AUREN SOLIAN — Email & User Profile Personalization Schema Migration
-- Migration: 20261123000004_auren_solian_email_and_avatar.sql
-- ==============================================================================

-- 1. Profile Avatar Support
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Email Drafts Table
CREATE TABLE IF NOT EXISTS email_drafts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
    to_addresses TEXT NOT NULL, -- JSON array of strings
    cc_addresses TEXT DEFAULT '[]', -- JSON array of strings
    bcc_addresses TEXT DEFAULT '[]', -- JSON array of strings
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    attachments TEXT DEFAULT '[]', -- JSON array of attachment metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_user ON email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_org ON email_drafts(organization_id);

-- 3. Email Messages Table (Inbox & Sent Records)
CREATE TABLE IF NOT EXISTS email_messages (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
    user_id TEXT,
    folder TEXT NOT NULL DEFAULT 'inbox', -- inbox, sent, archive, trash
    from_address TEXT NOT NULL,
    to_addresses TEXT NOT NULL, -- JSON array of strings
    cc_addresses TEXT DEFAULT '[]',
    bcc_addresses TEXT DEFAULT '[]',
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    is_read BOOLEAN NOT NULL DEFAULT TRUE,
    attachments TEXT DEFAULT '[]',
    reply_to_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(organization_id, folder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_user ON email_messages(user_id);

