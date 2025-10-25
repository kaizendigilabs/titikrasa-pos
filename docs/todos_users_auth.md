# TODO — Users Management & Auth

Scope: Implement authentication and users management (RBAC) using Supabase, following BFF route handler pattern and repo conventions in AGENTS.md.

Conventions
- BFF only: implement under `app/api/*`; only server routes may access service key.
- Response shape: `{ data, error, meta }`.
- Light Zod validation only where needed.
- RLS enforced; use helper functions from DB and server checks.

## 0) Prerequisites
- [ ] Verify env vars set: `SUPABASE_URL`, anon key in runtime; service role only on server routes.
- [ ] Ensure `lib/supabase/client.ts`, `server.ts`, `admin.ts`, and `middleware.ts` are aligned with App Router + `@supabase/ssr`.
- [ ] Generate TypeScript DB types: `pnpm db:types` (ke `lib/types/database.ts`).

## 1) Auth Flow (Login/Logout)
- [ ] Create `POST app/api/auth/login/route.ts` to sign in with email/password (SSR client). Return `{ data, error }`.
- [ ] Create `POST app/api/auth/logout/route.ts` to sign out and clear session cookies.
- [ ] Wire `app/login/page.tsx` form submit to `/api/auth/login`; show errors via `lib/utils/error.ts`.
- [ ] Add logout action from header/menu calling `/api/auth/logout`.
- [ ] Persist Supabase session using `@supabase/ssr` cookies helpers.

## 2) Route Guarding (Middleware + Layout)
- [ ] Use `lib/supabase/middleware.ts` to protect `/dashboard/**` (redirect to `/login` if no session).
- [ ] In dashboard root layout, fetch current profile for greeting/avatar and client hydration (optional).

## 3) Users API (BFF)
- [ ] `GET app/api/users/route.ts`: list users with roles (admin/manager only).
- [ ] `POST app/api/users/route.ts`: create user (server-side) → create auth user, insert profile, assign `user_roles`.
- [ ] `PATCH app/api/users/[id]/route.ts`: update profile fields (name, is_active) and role changes.
- [ ] `DELETE app/api/users/[id]/route.ts`: deactivate user (soft delete via `is_active=false`).
- [ ] Enforce authz in handlers (check role via RLS-safe server calls or DB helper functions).
- [ ] Standardize error mapping with `lib/utils/error.ts`.

## 4) Users Management UI (Dashboard)
- [ ] Fetch users list with TanStack Query on `app/dashboard/users/page.tsx`.
- [ ] Implement search by name/email; paginate or virtualize if needed.
- [ ] Add form/modal to invite/create user: email, name, role (admin/manager/staff), active flag.
- [ ] Edit user row: change name, role, toggle active.
- [ ] Confirm dialog for deactivate; warn about last-admin guard.
- [ ] Show toasts via `sonner` for success/error; disable buttons on pending.

## 5) Validation & Types
- [ ] Zod schemas for request payloads: create/update user.
- [ ] Narrow error messages (duplicate email, last-admin guard) → friendly UI text.
- [ ] Use generated DB types in handlers and UI.

## 6) RBAC & RLS
- [ ] Verify `roles` seeded (`admin`, `manager`, `staff`).
- [ ] Re-check RLS dev policies in `2025102501_users_table.sql` meet dashboard needs; avoid exposing sensitive data.
- [ ] Use DB helper functions: `has_role`, `is_user_admin`, `is_role_admin_id` for server-side guards.
- [ ] Respect last-admin trigger: surface constraint error clearly in UI.

## 7) Error States & Edge Cases
- [ ] Duplicate email on create → map to validation error.
- [ ] Attempt to demote/delete last admin → show specific error.
- [ ] Auth failures: invalid credentials, locked/inactive user.

## 8) Testing / Manual QA
- [ ] Login/logout happy path.
- [ ] Non-admin cannot access `/dashboard/users` (redirect/403 as designed).
- [ ] Create user, assign role, verify appears in list.
- [ ] Update role and ensure permissions change (spot-check via API).
- [ ] Deactivate user: cannot login; still retained in list with status.
- [ ] Variant: ensure RBAC read restrictions do not break UI queries.

## 9) Docs & Hand-off
- [ ] Update README/docs dengan auth flow diagram dan API endpoints.
- [ ] Note production hardening items (tighten RLS, limit roles SELECT, use SECURITY DEFINER appropriately).
- [ ] Record follow-ups atau tech debt untuk iterasi berikutnya.

---

Quick refs
- DB: `supabase/migrations/2025102501_users_table.sql`
- Pages: `app/login/page.tsx`, `app/dashboard/users/page.tsx`
- Supabase helpers: `lib/supabase/*`
- Errors: `lib/utils/error.ts`
