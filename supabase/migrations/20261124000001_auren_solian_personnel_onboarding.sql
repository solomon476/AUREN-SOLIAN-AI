-- ==============================================================================
-- AUREN SOLIAN — Personnel Directory, Account Provisioning & Onboarding Migration
-- Migration: 20261124000001_auren_solian_personnel_onboarding.sql
-- ==============================================================================

-- 1. Extend members table with phone, activation lifecycle, and cryptographic tokens
ALTER TABLE members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS activation_status TEXT DEFAULT 'created';
ALTER TABLE members ADD COLUMN IF NOT EXISTS invitation_token TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- 2. Relax email NOT NULL constraint if present (permitting pending contact info during directory creation)
ALTER TABLE members ALTER COLUMN email DROP NOT NULL;

-- 3. Unique index for cryptographic invitation and bootstrap tokens
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_invitation_token ON members(invitation_token);

-- 4. Mark active accounts where auth_user_id is already bound
UPDATE members SET activation_status = 'active' WHERE auth_user_id IS NOT NULL;

