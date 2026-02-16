# VendorCredit Radar

VendorCredit Radar is a multi-tenant SaaS web app for small retailers (hardware, auto parts, appliance parts) to recover money from vendor/manufacturer warranty credits and supplier RMAs.

## Stack
- Next.js 14 App Router + TypeScript
- TailwindCSS + shadcn/ui-style components
- PostgreSQL + Prisma ORM
- Auth: NextAuth (email magic link + optional Google OAuth)
- Billing: Stripe Checkout + Billing Portal + Webhooks
- Storage: S3-compatible object storage (AWS S3 prod, MinIO local)
- Email: Resend (SMTP/nodemailer fallback)
- Background processing: cron-style import job polling + optional worker script
- Testing: Vitest + Playwright

## Core Features Implemented
- Multi-tenant org model with role-based access (`ADMIN`, `STAFF`, `VIEWER`)
- Subscription-gated app access (`active` / `trialing` only)
- Stripe plans with trial (`trial_period_days=3`)
- Cases workflow with status pipeline + required-field validation
- Vendor template JSON checklist builder with step reordering
- Evidence uploads through pre-signed URLs (no exposed storage secrets)
- Claim Packet PDF generation (server-side)
- CSV import wizard with preview/mapping/dedupe
- Dashboard analytics + reports + CSV export
- Audit trail (`CaseEvent`) for key actions

---

## Prerequisites
- Node.js 20+
- npm 10+
- Docker + Docker Compose
- Stripe account + Stripe CLI (for local webhooks)

## Local Setup
### 1) Install dependencies
```bash
npm install
```

### 2) Start local infrastructure (Postgres, Redis, MinIO)
```bash
docker-compose up -d
```

### 3) Configure environment
```bash
cp .env.example .env.local
```

Important:
- `.env.local` is gitignored and must remain untracked.
- Do not commit secrets.

### 4) Run migrations and seed demo data
```bash
npm run db:migrate
npm run db:seed
```

### 5) Start the app
```bash
npm run dev
```

Optional worker (import polling):
```bash
npm run dev:all
```

---

## Stripe Local Webhooks
1. Ensure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set in `.env.local`.
2. Start forwarding:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
3. Copy the generated signing secret into `STRIPE_WEBHOOK_SECRET`.

Test events:
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

---

## Demo Seed Data
`npm run db:seed` creates:
- 1 demo org
- 3 demo users (admin/staff/viewer)
- 3 vendors + templates
- 30 cases across all statuses
- evidence placeholders
- 1 completed import job

Demo users:
- `admin@vendorcredit.local`
- `staff@vendorcredit.local`
- `viewer@vendorcredit.local`

Auth is passwordless magic link. In local mode, sent links are also written to:
- `.tmp/magic-links/*.txt`

---

## Tests
Run unit + integration tests:
```bash
npm run test
```

Run e2e tests:
```bash
npm run e2e
```

---

## Deployment (Vercel + Managed Postgres + S3)
### Recommended production architecture
- Frontend/API: Vercel
- Database: Neon or Supabase Postgres
- Storage: AWS S3
- Email: Resend (recommended)
- Stripe: Checkout + Webhooks + Billing Portal

### Deploy steps
1. Provision Postgres and set `DATABASE_URL`.
2. Provision S3 bucket and IAM credentials.
3. Create Stripe products + monthly/annual price IDs for Starter/Pro/Business.
4. Set all env vars in Vercel (see list below).
5. Run migrations in deployment:
```bash
npm run db:deploy
```
6. Configure Stripe webhook endpoint:
- `https://<your-domain>/api/stripe/webhook`
- Subscribe to:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
7. Configure scheduled trigger (Vercel Cron or external cron) for:
- `POST /api/cron/imports`
- Header: `Authorization: Bearer <CRON_SECRET>`

---

## Environment Variables
Required/commonly used:
- `NODE_ENV`
- `APP_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`

Auth/OAuth:
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

Email:
- `RESEND_API_KEY` (recommended)
- `EMAIL_FROM`
- `SMTP_HOST` (optional fallback)
- `SMTP_PORT` (optional fallback)
- `SMTP_USER` (optional fallback)
- `SMTP_PASS` (optional fallback)

Stripe:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_STARTER_MONTHLY_PRICE_ID`
- `STRIPE_STARTER_ANNUAL_PRICE_ID`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`
- `STRIPE_BUSINESS_MONTHLY_PRICE_ID`
- `STRIPE_BUSINESS_ANNUAL_PRICE_ID`

Storage:
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT` (blank for AWS S3)
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

Jobs/Cron:
- `CRON_SECRET`
- `REDIS_URL` (optional, reserved)
- `IMPORT_WORKER_INTERVAL_MS`

Local-only toggles:
- `ENABLE_BILLING_BYPASS`
- `ALLOW_DEV_CREDENTIALS`

---

## Go-live Checklist
- Stripe products and all six price IDs created
- Stripe webhook endpoint configured and validated
- Production domain + SSL active
- S3 bucket CORS configured for app domain
- S3 IAM policy scoped to bucket path
- Resend/email sending domain verified (SPF/DKIM)
- `NEXTAUTH_SECRET` set to strong random value
- `CRON_SECRET` configured and cron job active
- `ENABLE_BILLING_BYPASS=false`
- Migrations applied with `npm run db:deploy`

---

## API Endpoints (key)
- `POST /api/stripe/checkout`
- `POST /api/stripe/portal`
- `POST /api/stripe/webhook`
- `POST /api/storage/presign`
- `POST /api/storage/complete`
- `GET /api/cases/:id/packet`
- `GET /api/reports/cases.csv`
- `POST /api/cron/imports`
- `GET /api/import/template`

See `Architecture.md` for tenancy, billing, and storage details.
