# Manual Test Plan – Resellers

## Pre-requisites
- Seed minimal data (1 active reseller, 1 inactive) or run migrations + `pnpm db:reset:types`.
- Login as admin/manager.

## Checklist
1. **Bootstrap**
   - Visit `/dashboard/resellers`; verify table shows initial rows, pagination totals correct.
2. **Search & Filters**
   - Use search input for partial name/email/phone; results update after debounce.
   - Toggle status filter (All/Active/Inactive) and ensure counts update.
3. **Create**
   - Click *Add Reseller*, fill form (name + optional fields), submit.
   - New reseller appears at top; toast shows success.
4. **Edit**
   - Open action menu → Edit; change at least two fields + status, submit.
   - Row updates without reload; toast success.
5. **Toggle Status**
   - Use action menu → Activate/Deactivate; confirm dialog; verify badge changes.
6. **Delete**
   - Delete a reseller via menu; confirm removal + toast.
   - Multi-select ≥2 rows, run bulk delete; confirm dialog & removal.
7. **Realtime**
   - (Optional) Update row from Supabase console; table refreshes automatically.
8. **Error States**
   - Force API failure (e.g., set network offline) when creating; toast shows error and form stays open.

## Post-test
- Run `pnpm exec tsc --noEmit`.
- Run `pnpm lint` if time permits.
