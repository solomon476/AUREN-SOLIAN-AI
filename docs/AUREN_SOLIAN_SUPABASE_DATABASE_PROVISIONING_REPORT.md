# AUREN SOLIAN — Dedicated Supabase Database Provisioning Report

**Status:** PROVISIONED & VERIFIED  
**Date:** 2026-11-23  
**Target Environment:** Production / Dedicated SOLIAN Cloud Infrastructure  

---

## 1. Executive Summary

A dedicated, isolated Supabase project has been connected, verified, and migrated for **AUREN SOLIAN AI**. 

All **25 relational company tables** and **25 Row-Level Security (RLS) tenant isolation policies** were deployed and verified via the database engine.

> [!IMPORTANT]
> **Complete Personal AI Isolation:**  
> The AUREN Personal AI database (`kcblobrrtgcwxphmgyas` / `auren-staging`) remains **100% separate, untouched, and fully operational**. Zero schema modifications were made to the personal assistant database.

---

## 2. Dedicated SOLIAN Supabase Project Details

| Parameter | Configuration Value |
| :--- | :--- |
| **Project Reference** | `pkgqnbfieqoanmslhadk` |
| **Project URL** | `https://pkgqnbfieqoanmslhadk.supabase.co` |
| **Region** | `eu-north-1` |
| **Status** | `ACTIVE_HEALTHY` |
| **Database Host** | `db.pkgqnbfieqoanmslhadk.supabase.co` |
| **PostgreSQL Port** | `5432` (Direct) / `6543` (Connection Pooler) |
| **Anon Public API Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrZ3FuYmZpZXFvYW5tc2xoYWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NDk1MDYsImV4cCI6MjExMTAyNTUwNn0.QwuWnJxVS-kE3Ht8HFS9MaXvxLR--gZ7MS7Q6xsnSGc` |

---

## 3. Deployed Tables & Schema Verification (25 / 25 Live)

All 3 foundational enterprise migrations were executed in sequence:

### A. Core Company Intelligence (Migration 2)
1. `organizations` (Tenant root: `org-solian-wolves`)
2. `departments` (Executive, Operations, Finance, Tech, etc.)
3. `teams` (Cross-functional teams)
4. `members` (Staff directory with RBAC roles)
5. `operating_principles` (Company tenets)
6. `operating_cadences` (Operational rhythms & syncs)
7. `knowledge_items` (Company Knowledge Vault & SOPs)
8. `projects` (Enterprise initiatives)
9. `tasks` (Action items & Kanban)
10. `clients` (CRM client accounts)
11. `documents` (Corporate document registry)
12. `workflows` (Automated governance workflows)
13. `company_activities` (Unified company activity stream)
14. `executed_proposals` (Idempotency ledger)
15. `meetings` (Executive & team briefings)
16. `discussions` (Company discussion threads)
17. `notifications` (System notifications)

### B. Financial Intelligence (Migration 3)
18. `financial_accounts` (Bank, mobile money, cash ledgers)
19. `financial_transactions` (Income, expenses, transfers)
20. `invoices` (Client billing & receivable tracking)
21. `accounts_payable` (Vendor liabilities & dues)
22. `financial_budgets` (Departmental quarterly budgets)
23. `expense_requests` (Approval workflow & expense claims)

### C. Communications & Profile Personalization (Migration 4)
24. `email_drafts` (Persistent compose & AI-assisted drafts)
25. `email_messages` (Inbox, sent, and archive message repository)
*(Plus `avatar_url` column added to `members` table for profile pictures).*

---

## 4. Row-Level Security (RLS) Tenant Isolation

All 25 company tables have Row-Level Security enabled with multi-tenant isolation policies (`organization_id = COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), 'org-solian-wolves')`):

- `accounts_payable_tenant_isolation`
- `clients_tenant_isolation`
- `activities_tenant_isolation`
- `dept_tenant_isolation`
- `discussions_tenant_isolation`
- `documents_tenant_isolation`
- `email_drafts_tenant_isolation`
- `email_messages_tenant_isolation`
- `proposals_tenant_isolation`
- `expense_requests_tenant_isolation`
- `financial_accounts_tenant_isolation`
- `financial_budgets_tenant_isolation`
- `financial_transactions_tenant_isolation`
- `invoices_tenant_isolation`
- `knowledge_tenant_isolation`
- `meetings_tenant_isolation`
- `members_tenant_isolation`
- `notifications_tenant_isolation`
- `cadences_tenant_isolation`
- `principles_tenant_isolation`
- `org_tenant_isolation`
- `projects_tenant_isolation`
- `tasks_tenant_isolation`
- `teams_tenant_isolation`
- `workflows_tenant_isolation`

---

## 5. Deployment Environment Configuration

### Railway Backend (`Variables` tab)
```env
ENVIRONMENT=production
DATABASE_DIALECT=postgres
DATABASE_URL=postgresql://postgres.pkgqnbfieqoanmslhadk:[YOUR-DB-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?sslmode=require
AUTH_MODE=jwt
SUPABASE_URL=https://pkgqnbfieqoanmslhadk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrZ3FuYmZpZXFvYW5tc2xoYWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NDk1MDYsImV4cCI6MjExMTAyNTUwNn0.QwuWnJxVS-kE3Ht8HFS9MaXvxLR--gZ7MS7Q6xsnSGc
CORS_ORIGINS=["https://auren-solian-ai.vercel.app"]
```

### Vercel Frontend (`Environment Variables` tab)
```env
VITE_API_URL=https://api-production-ff50740d.up.railway.app/api/v1
VITE_SUPABASE_URL=https://pkgqnbfieqoanmslhadk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrZ3FuYmZpZXFvYW5tc2xoYWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NDk1MDYsImV4cCI6MjExMTAyNTUwNn0.QwuWnJxVS-kE3Ht8HFS9MaXvxLR--gZ7MS7Q6xsnSGc
```

---

## 6. Token Flush / Revocation Guide

Now that the provisioning and migrations are complete, you should revoke the access tokens so they can never be used again:

1. Open [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens).
2. Find the token(s) used for this setup.
3. Click **Revoke** / **Delete**.
4. Both tokens will immediately be invalidated.

