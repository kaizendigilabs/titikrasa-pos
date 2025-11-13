# TODO Refactor Halaman Suppliers

## 🎯 Sasaran
- Adopsi pola DataTable reusable (Users/Resellers) untuk halaman suppliers & detail supplier.
- Migrasi form create/edit supplier ke TanStack Form.
- Pastikan API `/api/suppliers` (dan /[id]) menjadi single source of truth (filter server-side, meta pagination).

## ✅ Langkah
1. **Backend**
   - [x] Audit `GET /api/suppliers` agar menerima `search/status/page/pageSize` dan mengembalikan `{ data, error, meta }` konsisten. *(filters now validated via `supplierFiltersSchema` + `ok()` response)*
   - [x] Tambahkan trigram/FTS index jika search belum optimal. *(see `supabase/migrations/2025110503_suppliers_search_indexes.sql`)*
   - [x] Tambahkan helper + endpoint detail (`/api/procurements/suppliers/[id]/orders`) untuk menyuplai DataTable riwayat transaksi.
2. **Frontend Struktur**
   - [x] Buat `app/dashboard/procurements/suppliers/data-table.tsx` + `_components/use-suppliers-table.ts` untuk state/logic terpusat.
   - [x] Gunakan `DataTableToolbar`, `createActionColumn`, dan forms/dialogs terpisah.
   - [x] Page-level fetch (`page.tsx` + `[id]/page.tsx`) cukup panggil helper bootstrap, tanpa state berat. *(list + detail pages now rely on `getSuppliersTableBootstrap` / `getSupplierDetail` with guarded redirects)*
3. **Form & UX**
   - [x] Gunakan TanStack Form untuk create/edit supplier sheet & catalog forms (create/edit/link) + AlertDialog confirmation.
   - [x] Standarkan toast/error handling + loading state.
   - [x] Tambah bulk actions bila relevan (activate/deactivate/delete).
   - [x] Halaman detail supplier menggunakan summary cards + DataTable reusable (PO history & katalog).
4. **Dokumentasi & Testing**
   - [x] Update dokumen ini + AGENTS.md setelah selesai.
   - [x] Buat `docs/tests_suppliers_manual.md` untuk QA.
   - [x] Pastikan `pnpm exec tsc --noEmit` & lint bersih sebelum merge.

> Setelah semua poin selesai, pastikan file TSX ringan, logic berada di hooks/contexts, dan API jadi single source of truth untuk Suppliers.
