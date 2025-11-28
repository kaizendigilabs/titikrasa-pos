# TODO Refactor Menu Management

Dokumen ini melacak pekerjaan untuk merapikan modul Menu (daftar menu, kategori, form/variant builder) supaya konsisten dengan pola DataTable reusable + TanStack Form seperti modul Users/Inventory.

## 📌 Scope
1. `/dashboard/menus` — daftar menu + sheet create/edit (simple vs variant).
2. `/dashboard/menus/categories` — daftar kategori menu + form pengurutan/status.
3. `features/menus/*` dan `features/menu-categories/*` — API client, hooks, server helper.

## 🎯 Goals
- Semua tabel memakai shell `DataTable` + hook controller (`use-menus-table`, `use-menu-categories-table`).
- Sheet/form menggunakan TanStack Form + Zod (tidak lagi mengelola state manual).
- Bootstrap endpoint/server helper menyediakan `{ items, meta, filters }` tunggal.
- Variant builder (sizes/temperatures/price matrix) ditata ulang supaya mudah di-maintain & dites.
- Dokumentasi + manual test tersedia.

---

## ✅ Rencana Detail

### 1. Backend / API
- [x] Buat helper `getMenusTableBootstrap(actor, filters)` di `features/menus/server.ts`:
  - Join kategori, batasi `page/pageSize`, dukung filter `status/type/category/search`.
  - Kembalikan `{ initialMenus, categories, initialMeta }`.
- [x] Endpoint BFF `/api/menus` + `/api/menus/[id]` supaya front-end tidak langsung query Supabase (konsisten dengan Users/Inventory).
- [x] Helper untuk kategori (`getMenuCategoriesBootstrap`), plus endpoint `/api/menu-categories`.
- [ ] Evaluasi publish/toggle/publish API: gabungkan ke route BFF untuk status update & delete.

### 2. Menus List (`/dashboard/menus`)
- [x] Ganti `MenusTable.tsx` dengan struktur: `data-table.tsx` (client) + `_components/use-menus-table.ts`.
  - Hook mengelola `filters`, TanStack Query, realtime, state sheet/dialog, pending states.
  - `renderToolbar`: search, status/type select, category select, tombol reset + CTA “Menu Baru”.
  - `renderAfterTable`: `MenuFormDialog`, delete dialog, status dialog, realtime listener.
- [x] `createMenuColumns` gunakan `createActionColumn` (View/Edit/Delete/Toggle).
- [x] Pagination & sorting pindah ke `useDataTableState` (tidak manual `useReactTable`).

### 3. Menu Form & Variant Builder
- [x] Pindahkan ke TanStack Form:
  - Schema: `menuFormSchema` (Zod) untuk simple & variant. *(validasi ringan masih di form controller; bisa dipadukan dengan schema bila dibutuhkan)*.
  - Komponen `MenuFormDialog` menampung form + steps (Info umum, Harga, Variant).
- [x] Reuse components:
  - `VariantSizeSelector`, `VariantTemperatureSelector`, `PriceMatrixTable`.
  - Validasi default size/temp otomatis + fallback.
- [x] Tambahkan hook `useMenuFormController` untuk handle mode create/edit, map data, submit ke mutation. *(Dilipat ke `useMenusTableController` agar satu sumber state.)*
- [ ] Preview thumbnail + icon upload? (opsional, sebutkan di TODO).

### 4. Menu Categories (`/dashboard/menus/categories`)
- [x] Buat controller + DataTable shell seperti modul lain:
  - Toolbar: search, status filter, tombol create.
  - TanStack Form sheet untuk kategori (name, slug, icon, sort order, status).
  - Delete/Toggle dialogs (createActionColumn).
- [x] Pastikan slug otomatis (slugify) hanya di UI; server tetap memvalidasi unik.

### 5. Shared Enhancements
- [x] Tambahkan hook `useMenuDetail(menuId)` (mirip `useStoreIngredientDetail`) untuk reuse data setelah submit.
- [x] Ekspor util `formatMenuPrice`, `getVariantLabel` dsb jika dibutuhkan antar modul (POS, detail menu).
- [x] Pertimbangkan folder `app/dashboard/menus/_components` untuk menyimpan form, sheet, toolbar, variant builder.

### 6. Dokumentasi & Testing
- [ ] Buat `docs/tests_menus_manual.md` (scenario: filter list, create simple menu, create variant menu, edit status, manage kategori, realtime).
- [ ] Update `AGENTS.md` + `docs/todos_tables_refactor.md` setelah modul Menu mengikuti blueprint.
- [ ] Catat perubahan signifikan di `docs/todos_menus_refactor.md` setiap checklist selesai.

---

## 📎 Catatan Implementasi
- Reuse TanStack Query hooks (`useMenus`, `useMenuCategories`) tapi pastikan `initialData` bentuknya `{ items, meta }`.
- Dekatkan file client/server: BFF route di `/app/api/menus/*` memanggil helper `features/menus/server.ts`.
- Utamakan UX: sheet tidak boleh menutup sebelum submit selesai; tampilkan toast sukses/gagal.
- Pertimbangkan limit variant: size/temperature combos ≤ 6 (sesuai `MENU_SIZES`/`MENU_TEMPERATURES`).
