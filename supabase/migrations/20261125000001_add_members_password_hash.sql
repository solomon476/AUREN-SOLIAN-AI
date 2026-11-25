-- ==============================================================================
-- AUREN SOLIAN — Add password_hash column to members for PostgreSQL parity
-- Migration: 20261125000001_add_members_password_hash.sql
-- ==============================================================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;

