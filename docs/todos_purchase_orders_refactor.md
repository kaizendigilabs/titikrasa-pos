# TODO Refactor Purchase Orders

Dokumen ini melacak pekerjaan untuk merapikan modul Purchase Orders (PO) supaya konsisten dengan pola DataTable reuse (lihat `docs/todos_tables_refactor.md` dan `docs/todos_users_refactor.md`) serta pengalaman detail supplier terbaru.

## 🎯 Sasaran
- Halaman list PO memakai shell tabel generik (`page.tsx → data-table.tsx → use-purchase-orders-table.ts`) dengan filter server-side.
- Halaman detail Supplier hanya menampilkan ringkasan PO terakhir; daftar lengkap pindah ke `/dashboard/procurements/suppliers/:id/transactions`.
- Halaman `/transactions` khusus supplier menggunakan DataTable generik dengan filter status, date range, dan link kembali.

## ✅ Rencana

### 1. Backend / API
- [x] Tambahkan endpoint `GET /api/procurements/suppliers/:id/transactions` (reuse query hook dari supplier detail) dengan filter `status/search/page/pageSize`.
- [x] Pastikan `GET /api/procurements/purchase-orders` mendukung search + filter (status, supplier, date range) dan mengembalikan `{ data, error, meta }`.
- [x] Tambah helper server (`getPurchaseOrdersTableBootstrap`, `getSupplierTransactions`, `getPurchaseOrderFormOptions`) untuk initial fetch list/detail + data form.

### 2. Frontend Struktur
- [x] Refactor `app/dashboard/procurements/purchase-orders` (list view) memakai shell tabel.
  - [x] `page.tsx` fetch lewat helper `getPurchaseOrdersTableBootstrap`.
  - [x] `data-table.tsx` + `_components/use-purchase-orders-table.ts` menyuplai kolom & toolbar standar.
  - [x] Kolom aksi pakai `createActionColumn` (view detail, edit pending, delete draft).
- [x] Buat halaman `/dashboard/procurements/suppliers/[id]/transactions`:
  - [x] Reuse DataTable shell + hook `useSupplierTransactionsTable`.
  - [x] Toolbar: search nomor PO, filter status, tombol back ke detail supplier.
  - [x] CTA “Create PO” terhubung ke form baru (sementara tombol disabled).
- [x] Update detail supplier:
  - Hilangkan DataTable besar → ringkasan 3 transaksi + tombol “Lihat semua”.
  - Pastikan link diarahkan ke halaman transaksi baru (sudah implement, tinggal jaga konsistensi copy).

### 3. UX & Forms
- [x] Form create/edit PO (jika ada) dipindah ke sheet/dialog di `renderAfterTable`.
- [x] Pastikan kolom list hanya menampilkan ringkasan (status badge, supplier, total, issued/completed).
- [x] Tambahkan empty state + skeleton untuk halaman transaksi supplier.

### 4. Dokumentasi & Testing
- [x] Update `docs/tests_purchase_orders_manual.md` (buat baru) berisi skenario CRUD + filter PO.
- [x] Update `AGENTS.md` dengan pola baru (table shell + halaman transaksi supplier).
- [x] Tambahkan catatan di `docs/todos_tables_refactor.md` bahwa modul Purchase Orders sudah mengikuti blueprint ketika selesai.

## 📌 Catatan Implementasi
- Gunakan hook TanStack Query existing (`usePurchaseOrders`, dll) atau buat versi baru jika belum ada.
- Query list harus cache-aware dan siap dihubungkan ke realtime (mirip modul Users/Resellers).
- Tetap gunakan integer minor unit IDR (`formatCurrency`) untuk nilai total.
- Untuk filter tanggal, pakai `DateRangeFilter` dari `components/shared/DateRangeFilter.tsx`.

Setelah checklist di atas selesai, modul Purchase Orders diharapkan seragam dengan modul Users/Resellers, dan detail supplier tetap ringan namun punya akses cepat ke daftar transaksi lengkap.
