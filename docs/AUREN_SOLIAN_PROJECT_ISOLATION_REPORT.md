# AUREN SOLIAN — PROJECT & DEPLOYMENT ISOLATION REPAIR REPORT
**Solian Wolves Company Intelligence & Operations Platform**  
**Repository:** `/home/kali/AUREN-SOLIAN-AI`  
**Tenant Organization:** Solian Wolves (`org-solian-wolves` / `SLN-WLV`)  
**Evaluation Date:** November 23, 2026  
**Isolation Status:** **REMEDIATED & DECOUPLED**

---

## 1. INCIDENT SUMMARY

An isolation incident was identified where prior automated tooling in `/home/kali/AUREN-SOLIAN-AI` acquired deployment configurations, service identifiers, and cloud associations originating from the separate **AUREN Personal AI** infrastructure.

Specifically, the deployment CLI linkages (`.vercel` and `.railway`), local environment defaults (`.env.local`), and backend CORS configurations in AUREN SOLIAN were pointed toward cloud projects containing personal data structures (notably `JOURNAL_HMAC_SECRET` and personal journal models).

Under the absolute project boundary mandate, an isolation audit and remediation procedure was executed strictly within `/home/kali/AUREN-SOLIAN-AI`. The adjacent `/home/kali/AUREN` repository was **never accessed, modified, moved, or inspected**. All contaminated linkages in SOLIAN have been safely backed up and removed, environment files sanitized, cross-project CORS entries purged, and test suites verified.

---

## 2. EXACT NATURE OF THE PROJECT CONFUSION

The confusion arose during deployment-readiness and verification phases when workspace-level cloud credentials for Railway and Vercel were provided to an agent. Because the workspace token had access to both Personal and Corporate infrastructure, the agent associated the local SOLIAN project with pre-existing AUREN Personal services:

1. **Railway Association**: The agent linked `/home/kali/AUREN-SOLIAN-AI` to Railway project `5ed98e08-2b04-40f6-b31b-dc97260bcf69` (service name `web`, environment `f1a8c136-5bcb-4c2c-ba1f-64f54b424886`, internal project name `dependable-acceptance`). This service holds the environment variable `JOURNAL_HMAC_SECRET`, a cryptographic key specific to the personal journal encryption subsystem of AUREN Personal AI.
2. **Vercel Association**: The agent linked `/home/kali/AUREN-SOLIAN-AI` to Vercel project `prj_wOZCWSXpsnQ9cSeE9QP8OSzXZYH7` under team `team_gA3xTtly6cbJ4LoKAYEOouXg` (project name `frontend`), which deployed to `frontend-alpha-steel-64.vercel.app`.
3. **API Routing**: The local `.env.local` file was injected with `VITE_API_BASE_URL="https://web-production-0f67f2d1.up.railway.app/api/v1"`, directing local frontend queries to the Personal backend container.
4. **CORS Boundary**: `backend/app/core/config.py` had `https://frontend-alpha-steel-64.vercel.app` added to `CORS_ORIGINS`.
5. **Test Fixtures**: Unit tests in `test_supabase_auth_integration.py` and `test_auth_foundation.py` used the mock issuer `https://dependable-acceptance.supabase.co/auth/v1`, mirroring the Personal Railway project name.

---

## 3. CONFIRMED CONTAMINATED REFERENCES (INVENTORY)

| Contaminated Identifier / Reference | Location in SOLIAN | Originating Context | Classification |
| :--- | :--- | :--- | :--- |
| `5ed98e08-2b04-40f6-b31b-dc97260bcf69` | `.railway/config.json` | AUREN Personal Railway Project ID | **CONFIRMED WRONG** |
| `a6b8ef4c-0bc4-4747-a3d6-c859efc6cc15` | `.railway/config.json` | AUREN Personal Railway Service ID | **CONFIRMED WRONG** |
| `prj_wOZCWSXpsnQ9cSeE9QP8OSzXZYH7` | `.vercel/project.json` | AUREN Personal Vercel Project ID | **CONFIRMED WRONG** |
| `team_gA3xTtly6cbJ4LoKAYEOouXg` | `.vercel/project.json` | Shared/Personal Vercel Team ID | **CONFIRMED WRONG** |
| `https://frontend-alpha-steel-64.vercel.app` | `backend/app/core/config.py` | AUREN Personal Frontend Deployment URL | **CONFIRMED WRONG** |
| `https://web-production-0f67f2d1.up.railway.app` | `.env.local` | AUREN Personal Backend Deployment URL | **CONFIRMED WRONG** |
| `VERCEL_OIDC_TOKEN` (redacted) | `.env.local` | Token scoped to Personal Project | **CONFIRMED WRONG** |
| `https://kcblobrrtgcwxphmgyas.supabase.co` | `docs/AUREN_SOLIAN_LIVE_TRANSITION_REPORT.md` | Personal Supabase Project URL | **CONFIRMED WRONG** |
| `https://dependable-acceptance.supabase.co` | `backend/tests/test_auth_foundation.py` | Mock issuer referencing Personal Project | **CONFIRMED WRONG** |

---

## 4. CORRECTIONS MADE

1. **Protected Local Backups Created**:
   - `.vercel` was archived to `.vercel.isolated_backup`
   - `.railway` was archived to `.railway.isolated_backup`
   - `.env.local` was archived to `.env.local.isolated_backup`
2. **CLI Deployment Decoupling**:
   - Deleted active `.vercel/` directory so local `vercel` CLI commands cannot deploy to `prj_wOZCWSXpsnQ9cSeE9QP8OSzXZYH7`.
   - Deleted active `.railway/` directory so local `railway` CLI commands cannot modify service `a6b8ef4c-0bc4-4747-a3d6-c859efc6cc15`.
3. **Sanitization of `.env.local`**:
   - Removed `VERCEL_OIDC_TOKEN`.
   - Replaced Personal Railway domain with local development default (`http://localhost:8000/api/v1`) and documented clear placeholders for future dedicated Solian Wolves production instances.
4. **Backend CORS Stripping**:
   - Removed `https://frontend-alpha-steel-64.vercel.app` from `CORS_ORIGINS` in `backend/app/core/config.py`.
5. **Test Mock Issuer Sanitization**:
   - Replaced all occurrences of `https://dependable-acceptance.supabase.co/auth/v1` in `test_auth_foundation.py` and `test_supabase_auth_integration.py` with `https://auth.solian-wolves-test.supabase.co/auth/v1`.
6. **Documentation Decoupling**:
   - Updated `docs/AUREN_SOLIAN_LIVE_TRANSITION_REPORT.md` with explicit remediation notices, decoupling the architecture diagrams from the Personal endpoints.
7. **Cache Invalidation**:
   - Purged `frontend/node_modules/.vitest-cache/` to ensure no cached Personal environment variables persist in test workers.

---

## 5. FILES CHANGED

- [config.py](file:///home/kali/AUREN-SOLIAN-AI/backend/app/core/config.py): Removed `frontend-alpha-steel-64` from `CORS_ORIGINS`.
- [.env.local](file:///home/kali/AUREN-SOLIAN-AI/.env.local): Removed Personal Vercel OIDC token and Personal Railway API URL; set to local FastAPI default.
- [.env.example](file:///home/kali/AUREN-SOLIAN-AI/.env.example): Updated model defaults and verified clean placeholder entries.
- [test_auth_foundation.py](file:///home/kali/AUREN-SOLIAN-AI/backend/tests/test_auth_foundation.py): Sanitized mock JWT issuer.
- [test_supabase_auth_integration.py](file:///home/kali/AUREN-SOLIAN-AI/backend/tests/test_supabase_auth_integration.py): Sanitized mock JWT issuer.
- [AUREN_SOLIAN_LIVE_TRANSITION_REPORT.md](file:///home/kali/AUREN-SOLIAN-AI/docs/AUREN_SOLIAN_LIVE_TRANSITION_REPORT.md): Updated architecture diagram and marked detached endpoints.
- `.vercel/` & `.railway/`: Backed up to `.isolated_backup` files and detached from active working copy.

---

## 6. GIT REMOTE STATUS

- **Git Root:** `/home/kali/AUREN-SOLIAN-AI`
- **Current Branch:** `main`
- **Origin Remote URL:** `git@github.com:solomon476/AUREN-SOLIAN-AI.git`
- **Status:** **VERIFIED SEPARATE**
- **Assessment:** The repository points exclusively to `solomon476/AUREN-SOLIAN-AI.git`. There is no remote reference or tracking association with AUREN Personal. No pushes or remote branch deletions were executed.

---

## 7. VERCEL ASSOCIATION STATUS

- **Local `.vercel` Directory:** **DETACHED & BACKED UP** (`.vercel.isolated_backup`)
- **Active Linked Project:** None (Unlinked)
- **Status:** **CORRECTED**
- **Assessment:** Running `vercel` commands from `/home/kali/AUREN-SOLIAN-AI` will no longer target project `prj_wOZCWSXpsnQ9cSeE9QP8OSzXZYH7`. Dedicated project linkage is reserved for manual user setup.

---

## 8. FRONTEND LINK STATUS

- **Header / Navigation Links:** **VERIFIED SEPARATE**
- **Sidebar Links:** **VERIFIED SEPARATE** (All navigate internally to Solian Wolves modules: Command, Chat, Finance, Projects, Tasks, Meetings, Knowledge, Documents, Teams, Clients, Settings)
- **Meeting Links:** `https://meet.solian.ai/sync` (Solian Wolves corporate meeting domain)
- **External Redirects / OAuth:** None hardcoded; OAuth redirects dynamically compute `window.location.origin`
- **PWA Manifest:** **VERIFIED SEPARATE** (`name: "AUREN SOLIAN — Organizational Intelligence"`, `short_name: "AUREN SOLIAN"`)

---

## 9. BACKEND / API CONFIGURATION STATUS

- **Local Development Target:** `http://localhost:8000/api/v1` (FastAPI instance in `backend/app`)
- **Dynamic API Resolver:** `resolveApiBase()` in `frontend/src/api/client.ts` defaults to relative `/api/v1` when environment URLs are absent.
- **Railway CLI Link:** **DETACHED & BACKED UP** (`.railway.isolated_backup`)
- **CORS Allowed Origins:** Localhost (`5173`, `3000`, `8000`) and dedicated `https://frontend-solian-wolves.vercel.app`
- **Status:** **CORRECTED & ISOLATED**

---

## 10. SUPABASE ASSOCIATION STATUS

- **Active Supabase URL in `.env.local`:** None (Defaulting to unconfigured client mode)
- **Database Dialect:** SQLite for local development (`solian_enterprise.db`); PostgreSQL supported via environment variable `DATABASE_URL`
- **RLS Tenancy Boundary:** Enforces `organization_id = 'org-solian-wolves'` across all SQL queries and schema models
- **Status:** **VERIFIED SEPARATE** (Contaminated reference `kcblobrrtgcwxphmgyas` has been detached from active configuration)

---

## 11. REMAINING UNVERIFIED ASSOCIATIONS

- **Dedicated Solian Wolves Vercel Project:** Not yet provisioned/linked. A dedicated Vercel project (e.g. `auren-solian` or `solian-wolves-frontend`) must be created and linked manually.
- **Dedicated Solian Wolves Railway Service:** Not yet provisioned/linked. A dedicated Railway service must be created and linked manually.
- **Dedicated Solian Wolves Supabase Project:** A dedicated Supabase project for Solian Wolves enterprise data must be provisioned.

---

## 12. BUILD AND VERIFICATION RESULTS

### Frontend Verification
- **Unit Tests (`vitest run --run`)**: 11 passed (100% pass rate in 3.37s)
- **Production Compilation (`tsc && vite build`)**: 2,168 modules transformed cleanly with zero errors in 4.21s
- **Status:** **PASS**

### Backend Verification
- **Automated Tests (`pytest -v`)**: 97 passed, 0 failed (100% pass rate in 10.53s)
- **Security & RBAC Enforcement**: All boundary tests passed
- **Status:** **PASS**

### Contamination Grep Audit
- Scanned entire repository `/home/kali/AUREN-SOLIAN-AI` (excluding protected `.isolated_backup` files):
- Matches for `dependable-acceptance`: **0**
- Matches for `web-production-0f67f2d1`: **0**
- Matches for `frontend-alpha-steel-64`: **0**
- Matches for `prj_wOZCWSXpsnQ9cSeE9QP8OSzXZYH7`: **0**
- Matches for `5ed98e08-2b04-40f6-b31b-dc97260bcf69`: **0**
- Matches for `kcblobrrtgcwxphmgyas`: **0**
- Matches for `JOURNAL_HMAC_SECRET`: **0**

---

## 13. MANUAL ACTIONS REQUIRED

To deploy AUREN SOLIAN to its own independent production environment without touching AUREN Personal:

1. **Vercel Project Setup (Manual Action Required)**:
   - In the Vercel dashboard, create a new project named `auren-solian` or `solian-wolves-frontend` pointing to the GitHub repository `solomon476/AUREN-SOLIAN-AI`.
   - Configure root directory to `.`, framework to `Vite`, build command to `cd frontend && npm install && npm run build`, and output directory to `frontend/dist`.
   - Set environment variable `VITE_API_URL` to the dedicated Solian Railway backend domain.
2. **Railway Project Setup (Manual Action Required)**:
   - In Railway, create a new project named `auren-solian-backend` deploying from `solomon476/AUREN-SOLIAN-AI` using `Dockerfile`.
   - Configure environment variables: `ENVIRONMENT=production`, `SECRET_KEY=[secure-32-char-key]`, `DATABASE_URL=[solian-supabase-pg-pooler-url]`, `SUPABASE_URL=[solian-supabase-url]`.
3. **Supabase Project Setup (Manual Action Required)**:
   - Create a dedicated Supabase project for Solian Wolves (`solian-wolves-vault`).
   - Run the canonical migrations from `supabase/migrations/` in the SQL Editor.
   - Note: Do NOT use the personal project (`kcblobrrtgcwxphmgyas`).

---

## 14. CERTIFICATION MATRIX

| Component | Status | Classification |
| :--- | :--- | :--- |
| **Git Remote & Repository Boundary** | `git@github.com:solomon476/AUREN-SOLIAN-AI.git` | **VERIFIED SEPARATE** |
| **Personal Repository (`/home/kali/AUREN`)** | 100% untouched; zero access or modification | **VERIFIED SEPARATE** |
| **Vercel CLI Association** | Detached; backed up to `.vercel.isolated_backup` | **CORRECTED** |
| **Railway CLI Association** | Detached; backed up to `.railway.isolated_backup` | **CORRECTED** |
| **Local Environment (`.env.local`)** | Decoupled from personal domains; set to local | **CORRECTED** |
| **Backend CORS Origins** | Stripped personal deployment domains | **CORRECTED** |
| **Unit Test Mock Issuers** | Decoupled from personal project names | **CORRECTED** |
| **Frontend Test Suite** | 11 / 11 tests passing | **VERIFIED SEPARATE** |
| **Backend Test Suite** | 97 / 97 tests passing | **VERIFIED SEPARATE** |
| **Frontend Production Build** | Compiles with 0 diagnostics | **VERIFIED SEPARATE** |
| **Production Cloud Instances** | Dedicated Solian instances pending provisioning | **MANUAL ACTION REQUIRED** |

---

*Report certified by AUREN SOLIAN Security & Architecture Integrity Operations.*  
*Repository: `/home/kali/AUREN-SOLIAN-AI`*

