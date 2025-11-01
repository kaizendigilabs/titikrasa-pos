# Overhaul Execution Status

Last updated: 2025-11-03

## Summary
- The menus, menu-categories, resellers, store-inventory, and procurements purchase-orders features now live on the new data/model/ui layering and consume the reusable table primitives with schema-driven form state.
- Remaining dashboard modules (procurement suppliers, recipes, users, POS, etc.) still rely on legacy table components that embed data fetching, state management, and UI logic in single files.
- Shared utilities for HTTP client, Supabase realtime, and schema-driven forms are adopted by migrated modules; other features continue to use bespoke implementations.

## Evidence Snapshot
- `features/menus/model/view-model.ts` and `features/menus/ui/components/menu-table.tsx` follow the planned structure with separated view-model and UI layers.
- `features/resellers/model/view-model.ts` and `features/resellers/ui/components/reseller-table.tsx` now mirror the same separation, using the shared API client and form utilities.
- `features/inventory/store-ingredients/model/view-model.ts` and `features/inventory/store-ingredients/ui/components/store-ingredients-table.tsx` replace the legacy inventory table with the new layered approach.
- `features/menu-categories/model/view-model.ts` and `features/menu-categories/ui/components/menu-categories-table.tsx` now serve the dashboard categories page using the shared tooling instead of the legacy table.
- `features/procurements/purchase-orders/model/view-model.ts` and `features/procurements/purchase-orders/ui/components/purchase-orders-table.tsx` drive the purchase orders screen with the reusable API hooks and form controllers.
- Procurement suppliers, recipes, and users pages still render legacy table components indicating remaining refactor work.

## Next Steps to Complete the Overhaul
1. Port each remaining dashboard feature (procurement suppliers, recipes, users, POS) to the reusable data-table contract and move business logic into dedicated `features/<feature>/model` directories.
2. Replace ad-hoc API clients in the outstanding modules with the shared `lib/api/client.ts` helper and add typed repositories per domain.
3. Introduce schema-driven form controllers for procurements, recipes, and users to align with the menus, resellers, and inventory implementations.
4. Roll out the shared Supabase realtime helper once extracted, updating legacy `use*Realtime` hooks to the new abstraction.
5. Apply the documented UX/UI patterns (toolbar layout, empty states, design tokens) across every dashboard screen.
