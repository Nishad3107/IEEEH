# Project Inventory

This repository is the source of truth for the Final-Year Project & Internship Tracker.

## Frontends

- `frontend/` — React/Vite login starter with Axios JWT interceptor.
- `next-dashboard/` — Next.js App Router application with Tailwind CSS and Supabase authentication.
- `app/page.tsx` — standalone Student Dashboard UI prototype retained from the earlier design work.

## Next.js routes

- `/` — Coordinator dashboard.
- `/login` — Supabase email/password login.
- `/dashboard` — Role-based redirect.
- `/student` — Student dashboard.
- `/dashboard/student/team-formation` — Supabase Team Formation flow.
- `/guide` — Guide workspace.
- `/reviews` — Review records page.
- `/documents` — Documents page.

## Shared Next.js code

- `next-dashboard/components/Sidebar.tsx` — Role-aware responsive navigation.
- `next-dashboard/components/AppShell.tsx` — Global layout shell.
- `next-dashboard/context/AuthContext.tsx` — Supabase auth state and user role.
- `next-dashboard/utils/supabase/client.ts` — Browser Supabase client.
- `next-dashboard/utils/supabase/server.ts` — Server Action/Server Component client.

## Backend

- `backend/src/server.js` — Express API for JWT authentication and MVP APIs.
- `backend/src/auth.js` — JWT middleware and role checks.
- `backend/src/seed.js` — Development seed users.
- `backend/schema.sql` — PostgreSQL schema for the Express backend.

## Supabase

- `supabase/schema.sql` — Auth, role, and Team Formation schema.
- `supabase/mvp-schema.sql` — Remaining terms, guide allocation, reviews, progress, documents, and final submissions schema.
- `supabase/team-formation.sql` — Secure team creation RPC, student-to-team linking, and current-team lookup.
- `supabase/guide-preferences.sql` — Guide listing, preference submission, and allocation status RPCs.
- `supabase/coordinator-allocation.sql` — Coordinator-only allocation data, guide load counts, and load-checked allocation RPC.

Run `supabase/schema.sql` first, then `supabase/mvp-schema.sql`, then `supabase/team-formation.sql`, then `supabase/guide-preferences.sql`, and finally `supabase/coordinator-allocation.sql` for the complete Supabase MVP database.
