# FilterFit (MVP)

FilterFit is a small SaaS-style app for finding the correct HVAC furnace air filter by size and optional MERV rating. It includes a shareable “this fits” detail page and an admin dashboard for managing the filter database.

## Stack
- Next.js App Router + TypeScript
- Supabase Postgres + Auth
- Row Level Security (RLS)

## Features
- Search by size (`16x25x1` or `16×25×1`) with width/height swap support
- Optional MERV filter
- SKU/UPC exact match first, fallback to partial match
- Detail page with share link and product URL
- Admin CRUD for filters + aliases
- CSV import for bulk adds

## Environment variables
Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional, not used by default)

## Supabase setup
1. Create a Supabase project.
2. Enable Email/Password auth in the Supabase dashboard.
3. Run the SQL migration in `supabase/migrations/0001_init.sql` (SQL editor is fine).
4. Seed sample data with `supabase/seed.sql`.

## Admin bootstrap
You must create an admin user and add a profile row:

1. Create a user in **Authentication → Users** (email + password).
2. Copy the user UUID from the Auth users list.
3. Run the SQL in `supabase/admin_bootstrap.sql`, replacing the UUID.

Example:
```sql
insert into public.profiles (id, is_admin)
values ('YOUR-USER-UUID', true)
on conflict (id)
do update set is_admin = true;
```

## Local development
```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Tests
```bash
npm run test
```

## Deployment (Vercel)
1. Push this repo to GitHub.
2. Create a new Vercel project from the repo.
3. Add the env vars from `.env.example` in Vercel project settings.
4. Deploy.

## CSV import format
Upload a CSV with headers:

```
brand,series,nominal_w,nominal_h,thickness,merv,sku,upc,product_name,url,notes
```

Required: `brand`, `sku`, `product_name`, `nominal_w`, `nominal_h`, `thickness`.

## Project structure
- `app/` – Next.js routes and pages
- `lib/` – parsing, search, auth utilities
- `components/` – UI helpers
- `supabase/migrations/` – schema + RLS
- `supabase/seed.sql` – sample data
- `supabase/admin_bootstrap.sql` – admin profile bootstrap

## Notes
- Public users can read filters and aliases.
- Only admin users can create/update/delete data (enforced by RLS).
- If a user should be admin, their `profiles` row must exist and be set `is_admin = true`.
