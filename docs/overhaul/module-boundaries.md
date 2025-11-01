# Module Boundary Blueprint

This blueprint formalises the separation of responsibilities for the upcoming Titikrasa POS overhaul. It extends the architecture audit by defining concrete layers, folder structure, and data flow contracts so that teams can implement refactors consistently.

## Target Folder Structure

```
app/
  (routes)/
    dashboard/
      <feature>/
        page.tsx          # Server entry – orchestrates auth, loads view-model data, renders layout wrappers.
        layout.tsx        # Optional nested layouts.
        loaders.ts        # Server utilities specific to the route, re-exporting feature services.
features/
  <feature>/
    data/
      repository.ts      # Supabase queries & mutations.
      dto.ts             # Types and mappers to domain models.
    model/
      queries.ts         # TanStack Query hooks for server state (read).
      mutations.ts       # Mutation hooks that wrap repository writes.
      view-model.ts      # Composition hooks that combine queries, local stores, and UI actions.
      columns.ts         # ColumnDef definitions + metadata for reusable DataTable.
      forms/
        schema.ts        # Zod schema for validation & DTO transformation.
        controller.ts    # react-hook-form wrapper hooking into schema + defaults.
    ui/
      components/        # Presentational components (forms, dialogs, empty states).
      index.ts           # Barrel exports for UI.
lib/
  api/
    client.ts           # Shared HTTP client (fetch wrapper).
    errors.ts           # AppError definitions.
  supabase/
    client.ts           # Server/client initialisation helpers.
    realtime.ts         # Realtime subscription helper.
  forms/
    createForm.ts       # Factory for schema-driven forms.
components/
  data-table/           # Reusable data table primitives (table, toolbar, filters).
  layout/               # Shared layout primitives (shell, header, nav).
```

## Layer Responsibilities

### App Router (Server Components)
- Perform authentication/authorisation checks and redirect unauthorised users.
- Call feature `model/view-model` server helpers (or service loaders) to obtain pre-fetched data, but avoid Supabase queries inline.
- Compose page layout (breadcrumbs, tabs) and render client components by passing only data & configuration (no mutation functions).

### Feature Data Layer (`features/<feature>/data`)
- Encapsulate Supabase interaction through repository functions that accept typed arguments and return domain DTOs.
- No React/Next.js dependencies – pure async functions to ease reuse in API routes and background jobs.
- Provide deterministic error mapping (`Result<T, AppError>`) consumed by services/mutations.

### Feature Model Layer (`features/<feature>/model`)
- Wrap repository functions with TanStack Query hooks (`use<Feature>Query`) to manage server state and caching.
- Define mutation hooks that compose repository calls with hybrid state updates (invalidations, optimistic updates).
- Build view-model hooks (e.g., `use<Feature>TableViewModel`) that merge query results, local stores, and UI-friendly derived state.
- Store UI-only state (filters, selection, dialog toggles) in colocated hooks using `useReducer`, context, or lightweight stores (e.g., Zustand) adhering to the hybrid pattern.

### Feature UI Layer (`features/<feature>/ui`)
- Implement presentational components that accept props from view-model hooks without containing business logic.
- Provide Storybook/Ladle stories for each component to document visual states.
- Use shared design tokens and components to maintain consistency across features.

### Shared Libraries (`lib/*`, `components/*`)
- Offer reusable utilities (HTTP client, realtime helper, form factory) and primitives (data-table, layout) that features can import without duplicating logic.
- Avoid feature-specific assumptions; configuration should be injected by consumers.

## Data Flow Contract

1. **Server request** reaches `app/dashboard/<feature>/page.tsx`.
2. Page verifies auth, invokes feature loader/service to obtain initial data snapshot (SSR hydration) and renders client boundary.
3. Client component calls view-model hook (`use<Feature>TableViewModel`) which internally uses query + local store hooks.
4. View-model provides `DataTableState`, action handlers (mutations), and UI state to the presentational component.
5. UI component renders using shared `<DataTable>` primitives, dispatching actions back to the view-model.

## Implementation Guidelines

- When creating a new feature module, scaffold data/model/ui folders from a template to enforce boundary consistency.
- All Supabase queries must live in `repository.ts`. If a new query is required, add an accompanying type in `dto.ts` and expose it via a typed function.
- Mutations should return typed results and rely on `lib/api/client` for HTTP calls (if using Next.js API routes) or `lib/supabase/client` for direct Supabase operations.
- View-model hooks should never return raw `QueryClient` or `Supabase` instances – expose intent-driven methods (e.g., `createMenu`, `setFilter`).
- Presentational components must remain stateless (except for controlled inputs). Any transient state belongs in the view-model/local store.

## Checklist for Feature Migration

- [ ] Route files depend only on loaders/services, not repositories directly.
- [ ] Supabase queries/mutations defined in `data/repository.ts` with unit tests or fixtures.
- [ ] Query/mutation hooks expose typed results with loading/error flags and do not leak implementation details.
- [ ] View-model encapsulates local UI state and provides high-level handlers.
- [ ] UI components receive props for data, status, and handlers only.
- [ ] Shared data-table and form controllers are used instead of bespoke implementations.
- [ ] Storybook/Ladle entries created for newly refactored UI components.
- [ ] Feature README summarises module responsibilities and how to extend them.

Completing this checklist for each feature ensures the codebase is aligned with the planned overhaul architecture.
