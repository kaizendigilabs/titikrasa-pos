# Architecture Audit (Pre-Overhaul)

## Scope & Goals
This document captures the current state of the Titikrasa POS dashboard implementation before the planned overhaul. It inventories routing entry points, how data access and business logic are wired today, and highlights coupling between UI, state management, and the Supabase backend. The findings inform the refactor roadmap that separates concerns, introduces a reusable table system, and modernises the UI layer.

## App Router Surface Area
- `/dashboard/menus` is a server component that queries Supabase directly, maps rows, and forwards raw lists plus filter defaults to a client table component. The page-level file embeds `requireActor`/`ensureAdminOrManager` checks and `Promise.all` Supabase calls before rendering `<MenusTable />` with a dense prop contract.【F:app/dashboard/menus/page.tsx†L1-L74】
- `/dashboard/inventory` preloads a paginated inventory list on the server, but still performs authentication, data fetching, view model shaping, and layout markup inside one file. It pipes the result into `<StoreIngredientsTable />`, which replays pagination and filtering logic on the client side.【F:app/dashboard/inventory/page.tsx†L1-L62】
- `/dashboard/resellers`, `/dashboard/users`, `/dashboard/recipes`, `/dashboard/procurements/**`, and `/dashboard/menus/categories` follow similar patterns: each route performs direct Supabase queries (or feature fetch helpers) inside `page.tsx` and hands the results to feature-specific tables/forms living alongside the route. Most routes expose server-only utilities (auth, Supabase client) to client components via props.
- Nested routes (`/dashboard/inventory/[ingredientId]`, `/dashboard/users/[id]`, `/dashboard/procurements/suppliers/[id]`) keep detail-page logic in server files but import large client-side forms/tables that expect full entity payloads plus imperative callbacks.

## Feature Module Inventory
- Feature folders (e.g., `features/menus`, `features/resellers`, `features/inventory/store-ingredients`) combine HTTP client helpers, React Query hooks, Supabase realtime subscriptions, schema definitions, and data mappers in a flat structure.【F:features/menus/client.ts†L1-L107】【F:features/menus/hooks.ts†L1-L200】【F:features/inventory/store-ingredients/hooks.ts†L1-L120】
- Each `client.ts` file reimplements an ad-hoc `request` helper that wraps the Fetch API, processes `AppError`, and exposes CRUD methods per domain. There is no shared HTTP client across features, leading to duplicated error handling and inconsistent response metadata contracts.【F:features/menus/client.ts†L1-L107】
- Hook files mix server-state concerns (TanStack Query setup, optimistic cache updates) with UI-specific derivations (e.g., cloning variants config, shaping pagination metadata), and they directly manage Supabase realtime subscriptions with inline `useEffect` logic.【F:features/menus/hooks.ts†L1-L200】【F:features/inventory/store-ingredients/hooks.ts†L66-L120】

## Table & Form Implementations
- Route-level table components (`MenusTable`, `StoreIngredientsTable`, `ResellersTable`, etc.) initialise TanStack Table instances, manage UI state (filters, sorting, dialog visibility), fire mutations, and render JSX in the same file. Each table duplicates toolbar layouts, filter selects, mutation pending bookkeeping, and toast orchestration.【F:app/dashboard/menus/MenusTable.tsx†L1-L120】【F:app/dashboard/inventory/StoreIngredientsTable.tsx†L1-L120】【F:app/dashboard/resellers/ResellersTable.tsx†L1-L120】
- Form components (e.g., `MenuForm`, `CatalogCreateForm`, `ProfileForm`) rely on `useState` and manual payload mapping without a shared controller abstraction. Validation schemas exist (Zod), but wiring to the UI is bespoke per feature.
- Shared table utilities under `components/tables/` expose a minimal wrapper around shadcn `<Table>` elements (content, pagination, select filter). They do not encapsulate table instance creation, toolbar slots, or asynchronous states, so each feature implements its own plumbing around these pieces.【F:components/tables/data-table-content.tsx†L1-L52】

## State Management & Hybrid Patterns
- TanStack Query is already used for server-state fetching (`useMenus`, `useStoreIngredients`, `useResellers`, etc.), yet many derived states (filters, search keywords, optimistic lists) are duplicated in route components instead of encapsulated in dedicated view-model hooks.【F:app/dashboard/menus/MenusTable.tsx†L60-L117】【F:app/dashboard/inventory/StoreIngredientsTable.tsx†L31-L79】
- Client-side state (dialog toggles, form drafts, pending mutation tracking) sits directly inside UI components. Realtime updates via Supabase channels call `invalidateQueries` without a shared utility, and there is no lightweight client-store pattern to complement React Query for transient UI state.【F:features/inventory/store-ingredients/hooks.ts†L66-L120】

## Pain Points Identified
1. **Tight coupling between routes and data access** – Server components fetch Supabase data inline, enforce authorisation, and compute UI defaults, making it hard to reuse the same logic across API routes or background jobs.
2. **UI components overloaded with business logic** – Table and form components are responsible for validation, data transformation, and mutation orchestration, leading to 300+ line files that are difficult to test and reuse.
3. **Inconsistent state orchestration** – Filters, pagination, and realtime updates are re-implemented per feature with custom state shapes, instead of following a hybrid pattern (React Query for server state + local store for UI state) described in the refactor plan.
4. **Duplicated table plumbing** – Each table defines its own toolbar, filter inputs, and column configuration, preventing the creation of a cohesive data-table experience referenced from shadcn/tanstack documentation.
5. **Limited design system guidance** – Layout and component styles vary between pages (e.g., inventory vs. menus), signalling the need for a unified design system before the UI overhaul.

## Preparatory Deliverables Completed
- ✅ [Module Boundary Blueprint](./module-boundaries.md) assigns responsibilities to routes, feature data/model/ui layers, and shared primitives.
- ✅ [Reusable Data Table Contract](./data-table-contract.md) captures component API, view-model expectations, and integration checklist for all dashboard tables.
- ✅ [Shared Utilities Specification](./shared-utilities-spec.md) defines the standard HTTP client, Supabase realtime helper, and form factory.
- ✅ [UX & UI Overhaul Principles](./ux-principles.md) establishes navigation, component, and accessibility guidelines for the redesign.

With these artefacts prepared, the overhaul can proceed with clear architectural, technical, and UX direction.
