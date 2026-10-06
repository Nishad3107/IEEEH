# Final-Year Project Tracker

All implementation work is kept in this repository. New UI, API, database, and integration code should be added under the existing `frontend/`, `next-dashboard/`, `backend/`, or `supabase/` folders.

See `docs/PROJECT_INVENTORY.md` for the complete code map.

Starter implementation for the three-member MVP split:

- `frontend/`: React + Tailwind login screen and Axios JWT interceptor.
- `backend/`: Express + PostgreSQL connection and JWT login API.

## Run the backend

```bash
cd backend
cp .env.example .env
npm install
# Create the database, then run schema.sql against it.
npm run dev
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the API at `http://localhost:5000/api` by default. Set `VITE_API_URL` to override it.

## Next.js dashboard

The requested App Router dashboard components are in `next-dashboard/`.

```bash
cd next-dashboard
npm install
npm run dev
```

Open `http://localhost:3000` to view the coordinator dashboard, guide preference form, review scheduling form, and final PDF submission record.

The Next.js dashboard is connected to the Express API through `app/lib/api.ts`. Start PostgreSQL, run `backend/schema.sql`, configure `backend/.env`, then start the backend before using the dashboard. The login page is available at `http://localhost:3000/login`.

For local development, seed test accounts after applying the schema:

```bash
cd backend
npm run seed
```

Seed password: `Password123!`

Seed accounts:

- `student@projecttrack.local`
- `guide@projecttrack.local`
- `coordinator@projecttrack.local`

## Supabase authentication

The Next.js app also includes Supabase Auth with role lookup through `public.users`:

1. Create a Supabase project.
2. Run `supabase/schema.sql`, then `supabase/mvp-schema.sql`, then `supabase/team-formation.sql`, then `supabase/guide-preferences.sql`, then `supabase/coordinator-allocation.sql`, then `supabase/guide-review-scheduling.sql`, then `supabase/progress-logs.sql`, then `supabase/progress-viewers.sql`, then `supabase/final-submissions.sql`, and finally `supabase/final-submission-views.sql` in the Supabase SQL editor.
3. Copy `next-dashboard/.env.local.example` to `next-dashboard/.env.local` and add the project URL and anon key.
4. Create users through Supabase Authentication. The trigger creates their `public.users` profile with a `student` role by default; update the role to `guide` or `coordinator` from a protected admin workflow.

Authentication files:

- `next-dashboard/app/login/page.tsx` — sign-in and sign-up UI.
- `next-dashboard/app/login/actions.ts` — server-side Supabase Auth actions.
- `next-dashboard/middleware.ts` — refreshes Supabase SSR sessions and protects `/dashboard/*`.

Public signup accepts Student and Guide roles. Coordinator accounts are intentionally not self-service and must be provisioned by an administrator.
