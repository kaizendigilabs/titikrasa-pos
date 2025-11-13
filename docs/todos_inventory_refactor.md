# TODO Refactor Inventory Module

Dokumen ini memetakan pekerjaan refactor untuk seluruh halaman Inventory supaya sejajar dengan pola DataTable & TanStack Form yang sudah dipakai Users/Resellers/Purchase Orders.

## 📌 Scope Halaman
1. `/dashboard/inventory` — daftar Store Ingredients (stock overview).
2. `/dashboard/inventory/[ingredientId]` — detail ingredient + riwayat pembelian.
3. `/dashboard/inventory/stock-adjustments` — Stock Opname / pencatatan penyesuaian.

## 🎯 Sasaran Umum
- Konsisten memakai shell tabel (`components/tables/data-table.tsx`) + hook domain `use-*-table`.
- Form edit/cetak menggunakan TanStack Form (sheet/dialog) agar validasi unified.
- Server helper pada `features/inventory/*/server.ts` menyediakan bootstrap awal (items, meta, filter default).
- UI ringkas: summary cards + recent activity, tanpa tabel kustom manual.

---

## ✅ Rencana Detail

### 1. Backend / API
- [x] Tambah helper `getStoreIngredientsTableBootstrap` (+ query `fetchStoreIngredients` update) agar mengembalikan `{ items, meta }` + filter normalisasi (status, lowStock, search).
- [x] Buat endpoint BFF untuk purchase history (`/api/inventory/store-ingredients/[id]/purchase-history`) dengan filter supplier/date.
- [ ] Siapkan endpoint draft stock adjustments untuk menyimpan/commit (jika belum ada).
- [x] Expose summary endpoints: `getStoreIngredientDetailBootstrap` bundling detail + history + supplier options agar front-end tidak melakukan multiple fetch.

- [x] Ganti `StoreIngredientsTable` lama dengan struktur: `data-table.tsx` + `_components/use-store-ingredients-table.ts`.
  - Hook harus mengelola filters (status/search/lowStock), query TanStack, dan sheet edit.
  - Kolom aksi gunakan `createActionColumn` untuk edit/toggle.
- [x] Edit form berpindah ke `TanStack Form` dalam sheet (SKU, minStock, status), validasi Zod ringan.
- [x] Toolbar mengikuti standar: search input, select status, checkbox “Low stock only”, tombol “Reset”. Gunakan `DataTableToolbar`.
- [x] Realtime bridge pindahkan ke `renderAfterTable`.

### 3. Ingredient Detail (`/dashboard/inventory/[ingredientId]`)
- [x] Pecah layout menjadi:
  - `SummaryHeader` (nama, badges, CTA edit).
  - `InventorySnapshotCard` (stock, avg cost, thresholds).
  - `LatestPurchaseCard` (supplier, price, date) + quick link ke supplier detail.
  - `LinkedSuppliersCard` (opsional) untuk menampilkan link prefered supplier.
- [x] `PurchaseHistoryTable` → ganti dengan shell DataTable:
  - Buat `use-purchase-history-table.ts` yang menerima `ingredientId`, `initialData`.
  - Toolbar: filter supplier select, date range (pakai `DateRangeFilter`), search (PO ID).
  - Kolom: tanggal, supplier, qty/uom, unit price, line total, status.
  - Empty/skeleton states mengikuti pattern supplier transactions.
- [x] Tambah server helper `getStoreIngredientDetailBootstrap(ingredientId)` untuk bundling detail + history + supplier options sehingga page.tsx ringkas.

### 4. Stock Adjustments (`/dashboard/inventory/stock-adjustments`)
- [x] Pecah `StockOpnameForm` jadi:
  - `useStockOpnameController` (TanStack Form) yang mengelola rows, validation (notes required, numeric counts), dan mutasi `useCreateStockAdjustment`.
  - Komponen presentasional: `StockOpnameToolbar`, `StockOpnameTable`, `StockOpnameSummary`.
- [x] Dukungan mode “draft vs commit” via toggle/segmented control.
- [x] Tambahkan ringkasan kartu guna menunjukkan outstanding delta, total bahan.
- [x] Pertimbangkan logging / success banner setelah submit (pesan sukses + state status pada toolbar).

### 5. Shared Components / Hooks
- [x] Tambah `features/inventory/store-ingredients/hooks.ts` helper untuk `useStoreIngredientDetail` agar detail page bisa di-hydrate ulang setelah update.
- [ ] Ekspor formatter util khusus inventory (e.g. `formatStockDelta`) jika dibutuhkan.
- [ ] Pertimbangkan `components/inventory` folder untuk kartu-kartu summary reusable.

### 6. Dokumentasi & Testing
- [x] Tambah `docs/tests_inventory_manual.md` berisi skenario: filter store ingredients, edit SKU, lihat detail ingredient, ubah filter history, submit stock opname (draft + commit).
- [ ] Update `AGENTS.md` + `docs/todos_tables_refactor.md` setelah modul Inventory mengikuti blueprint.
- [ ] Tambahkan catatan migrasi di `docs/todos_inventory_refactor.md` (dokumen ini) setiap checklist selesai.

---

## 📎 Catatan Implementasi
- Reuse hook TanStack Query yang ada (`useStoreIngredients`, `usePurchaseHistory`, `useCreateStockAdjustment`). Bila API belum cocok, perbarui client agar mengembalikan `{ items, meta }`.
- Patuhi naming: data server → `features/inventory/.../server.ts`, hooks client di `features/inventory/.../hooks.ts`, UI per halaman di `app/dashboard/inventory/.../_components`.
- Semua form baru wajib TanStack Form + Zod.
- Pastikan low-stock indicator & badges tetap muncul setelah refactor.
