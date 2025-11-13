# Manual Test Plan – Suppliers

## Setup
- Login as Admin/Manager.
- Ensure at least one supplier exists (active & inactive) for coverage.

## Checklist
1. **Page Load**
   - `/dashboard/procurements/suppliers` shows table with pagination info and toolbar.
2. **Search & Filters**
   - Search by partial name/email/phone; verify rows filtered server-side.
   - Switch status filter (All/Active/Inactive) and ensure counts update.
3. **Create Supplier**
   - Click *Add Supplier*, fill fields, submit.
   - New row appears; toast success; sheet closes & resets.
4. **Edit Supplier**
   - Use row action → Edit. Change multiple fields, toggle active state, submit.
   - Row updates without reload.
5. **Toggle Status (single)**
   - Action menu → Activate/Deactivate; confirm dialog; badge updates.
6. **Delete Supplier**
   - Action menu → Delete; confirm; row removed.
7. **Bulk Actions**
   - Select ≥2 rows → Bulk activate/deactivate/delete; verify toasts + refetch.
8. **Realtime**
   - (Optional) Update row via Supabase console; table refreshes automatically.
9. **Detail Page**
   - Navigate to `/dashboard/procurements/suppliers/[id]`; ensure catalog forms still work (create/update/delete catalog item, link ingredients).
10. **Error Handling**
    - Simulate network error during create/edit; toast shows message and forms remain.

## Post-test
- `pnpm exec tsc --noEmit`
- `pnpm lint`
