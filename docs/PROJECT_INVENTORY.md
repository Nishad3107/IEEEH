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
- `supabase/guide-review-scheduling.sql` — Guide assigned-team lookup and secure review-date scheduling RPCs.
- `supabase/progress-logs.sql` — Public document bucket policies, progress-log/document RPCs, and document linking.
- `supabase/progress-viewers.sql` — Secure team progress-log access for students, assigned guides, and coordinators.
- `supabase/final-submissions.sql` — Final report storage, GitHub link, completed team status, and final submission RPCs.
- `supabase/final-submission-views.sql` — Coordinator and guide read models for completed final submissions.

Run `supabase/schema.sql` first, then `supabase/mvp-schema.sql`, then `supabase/team-formation.sql`, then `supabase/guide-preferences.sql`, then `supabase/coordinator-allocation.sql`, then `supabase/guide-review-scheduling.sql`, then `supabase/progress-logs.sql`, then `supabase/progress-viewers.sql`, then `supabase/final-submissions.sql`, and finally `supabase/final-submission-views.sql` for the complete Supabase MVP database.
