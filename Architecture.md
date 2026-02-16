# VendorCredit Radar Architecture

## 1) Multi-tenancy model
- Tenant boundary is `Organization`.
- Access joins through `Membership(userId, orgId, role)`.
- Every app query is scoped by `orgId` from authenticated membership context (`requireOrgSession` / `getApiOrgContext`).
- Roles:
  - `ADMIN`: billing + org/team/template management + all case actions
  - `STAFF`: case/import/evidence operations
  - `VIEWER`: read-only
- Audit events are recorded in `CaseEvent` for: case create/update, status changes, evidence uploads, template updates, and import-based case creation.

## 2) Authentication
- NextAuth with Prisma adapter.
- Primary sign-in: Email magic link.
- Optional OAuth: Google (enabled only when Google env vars are set).
- Session strategy: JWT with org/subscription context hydrated in callbacks.

## 3) Billing & access gating
- Stripe subscription plans: `STARTER`, `PRO`, `BUSINESS`.
- Checkout route enforces `trial_period_days=3` and maps plan+interval to Stripe price IDs.
- Billing Portal route provides self-serve upgrade/downgrade/cancel.
- Webhook events handled:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Webhook idempotency via `StripeEvent` unique event id table.
- Middleware enforces active access for `/app/*`: only `active` or `trialing` subscriptions (unless explicit local bypass flag).
- Seat limits:
  - Starter: 3
  - Pro: 15
  - Business: unlimited

## 4) Storage design
- Evidence files use S3-compatible object storage.
- Browser gets pre-signed PUT URL from `POST /api/storage/presign`.
- Browser uploads directly to S3/MinIO.
- Metadata is committed via `POST /api/storage/complete`.
- Claim packet PDF generation creates time-limited signed GET links for evidence files.
- No storage credentials are exposed to the browser.

## 5) Import & background processing
- CSV import job data model: `ImportJob` + `ImportRow`.
- Wizard flow: upload -> preview -> mapping -> confirm -> process.
- Dedupe key: `receiptId + sku + returnDate`.
- Dedupe policy: `SKIP` or `UPDATE`.
- Background reliability:
  - HTTP cron endpoint: `POST /api/cron/imports` (secured by `CRON_SECRET`)
  - Optional worker script: `npm run worker`

## 6) Case workflow
- Case statuses:
  - `NEW`, `NEEDS_INFO`, `READY_TO_SUBMIT`, `SUBMITTED`, `APPROVED`, `DENIED`, `CREDIT_RECEIVED`, `CLOSED`
- Status transitions are validated server-side.
- `READY_TO_SUBMIT` requires required fields/evidence + required checklist completion.
- Vendor templates are JSON checklist definitions (`VendorTemplate`) that instantiate case checklist items (`CaseChecklistItem`) with due date computation.

## 7) Reporting
- Dashboard metrics:
  - Open expected credit
  - Received actual credit
  - Aging buckets
  - Top vendors by pending amount
- Reports page supports filtering by date/vendor/status and CSV export (`/api/reports/cases.csv`).
