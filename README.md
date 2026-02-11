# SolarOps Lite

Production-quality MVP web app for small (5-20 employee) solar installers to reduce delays in permit + inspection workflows.

## Stack
- Next.js 14 App Router + TypeScript
- PostgreSQL + Prisma ORM + SQL migrations
- Auth.js / NextAuth (credentials)
- TailwindCSS + shadcn-style UI components
- Zod validation for all writes
- Vitest (unit + integration) + Playwright (smoke e2e)
- Docker Compose (Postgres + MailHog)

## MVP scope
### In scope
- Multi-tenant organizations (users belong to exactly one org)
- Roles: `OWNER`, `ADMIN`, `COORDINATOR`, `CREW`, `VIEWER`
- RBAC enforced at server action level
- Permit + inspection workflow dashboard and job detail
- Permit follow-up tracking + stale permit indicators
- Inspection scheduling and fail workflow (`RESCHEDULE_NEEDED` + auto correction task)
- Reminder policies + reminder worker every 10 minutes (email first)
- Reminder dedupe (no duplicate policy/item reminder within 24h)
- Audit/activity log for job/permit/inspection changes

### Out of scope
- CRM pipeline beyond job workflow
- Quote/proposal generation
- Payments/invoicing
- Full SMS pipeline (flag exists, MVP ships email)

## Project structure
- `app/` - Next.js App Router pages + API routes + server actions
- `components/` - UI primitives and layout components
- `lib/` - auth, RBAC, workflow services, reminder engine, validation
- `prisma/schema.prisma` - data model
- `prisma/migrations/0001_init/migration.sql` - initial SQL migration
- `prisma/seed.ts` - seed/demo data
- `scripts/reminder-worker.ts` - 10-minute reminder worker
- `tests/unit/` - unit tests
- `tests/integration/` - integration tests
- `tests/e2e/` - Playwright smoke test
- `docker-compose.yml` - local Postgres + MailHog

## Data model highlights
Core entities implemented with constraints/indexes:
- `Organization`, `User`, `Job`, `Permit`, `Inspection`, `Task`, `ReminderPolicy`, `ReminderLog`, `ActivityLog`
- Auth tables: `Account`, `Session`, `VerificationToken`
- Invite flow table: `InviteToken`

Required indexes included:
- `Job(orgId, status)`
- `Job(orgId, updatedAt)`
- `Permit(status, nextFollowUpAt)`

## Local development
### 1) Start infrastructure
```bash
docker-compose up -d
```

### 2) Install and configure
```bash
npm install
cp .env.example .env.local
```

### 3) Database
```bash
npm run db:migrate
npm run db:seed
```

### 4) Run app
```bash
npm run dev
```

Optional: run app + reminder worker together
```bash
npm run dev:all
```

## Test commands
```bash
npm run test
npm run e2e
```

## Seeded demo credentials
All seeded users use password: `Password123!`

- Admin: `admin@solarops.local`
- Coordinator: `coord@solarops.local`
- Crew: `crew@solarops.local`
- Viewer: `viewer@solarops.local`

Seed includes:
- 1 org
- 4 users (admin/coordinator/crew/viewer)
- 12 jobs across statuses
- stuck permits
- 3 inspections scheduled this week
- tasks due soon

## Auth and RBAC
- Credentials login via NextAuth
- First org can be created from `/auth/register` (first user is `ADMIN`)
- Admin/Owner can invite users and set roles
- Server actions enforce permissions; UI visibility mirrors server rules

## Reminders
- Trigger types:
  - `PERMIT_FOLLOWUP`
  - `INSPECTION_UPCOMING`
  - `TASK_DUE`
- Channels:
  - `EMAIL` fully implemented
  - `SMS` optional flag only (`SMS_ENABLED`), not enabled in MVP
- Deduped by org/item/channel/trigger in rolling 24-hour window
- Every reminder attempt is logged in `ReminderLog` with `SENT`, `FAILED`, or `SKIPPED`

### Email behavior
- Dev: if SMTP vars are missing, email is printed to console
- Local SMTP option: MailHog at `http://localhost:8025` (`SMTP_HOST=localhost`, `SMTP_PORT=1025`)
- Prod: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Deployment notes
### Option A: Vercel + managed Postgres
1. Provision a Postgres database.
2. Set env vars from `.env.example` in Vercel.
3. Run migrations on deploy (`npm run db:deploy`).
4. Configure a cron call to `POST /api/cron/reminders` every 10 minutes with `Authorization: Bearer $CRON_SECRET`.

### Option B: Container host
1. Build Next.js app image.
2. Run web service + worker process (or external cron hitting reminder endpoint).
3. Run `npm run db:deploy` during release.

## Product checklist mapping
- Auth + org setup/invite/roles: implemented
- Dashboard bottlenecks + filters + sorting + days stuck: implemented
- Job detail tabs (overview/permits/inspections/tasks/activity): implemented
- Permit quick actions + stale indicator: implemented
- Inspection FAIL automation: implemented
- Reminder scheduler + dedupe + logs: implemented
- Audit logs for key status changes: implemented
- Validation + org-boundary checks + empty states: implemented
- Unit/integration/e2e tests scaffolded for required cases: implemented

