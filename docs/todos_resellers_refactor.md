# TODO Refactor Halaman Resellers

Dokumen ini jadi pegangan untuk merapikan fitur Resellers supaya konsisten dengan pola baru (DataTable shell + TanStack Form + BFF terstandarisasi).

## 🎯 Sasaran Utama
- Samakan struktur dengan Users: `page.tsx` → `data-table.tsx` → `_components` (toolbar, dialogs, hooks).
- Pindahkan seluruh state tabel ke `useResellersTableController` (filter, search, mutasi, bulk action).
- Pastikan API `/api/resellers` menangani filter/paginasi secara server-side dan mengembalikan `{ data, error, meta }`.
- Migrasikan form (create/edit) ke TanStack Form untuk validasi dan reset yang lebih rapih.

## 📌 Kondisi & Masalah Saat Ini (cek di PRD)
1. Komponen `ResellersTable.tsx` masih memegang semua state UI + data, sulit di-maintain.
2. Filtering/status/role (jika ada) masih dilakukan di klien setelah fetch bulk.
3. Form invite/edit reseller belum pakai TanStack Form; banyak `useState` manual.
4. Belum ada bulk action standard (aktif/nonaktif, reset, dll) meski butuh di dashboard.
5. Dokumentasi & test manual belum disesuaikan dengan pola baru.

## ✅ Rencana Refactor

### 1. Backend / API
- [x] Audit `GET /api/resellers` supaya menerima `status`, `search`, `page`, `pageSize` dan mengembalikan total yang benar. *(sudah comply via `/api/resellers` + helper `getResellersTableBootstrap`)*
- [x] Tambahkan dukungan search terindex jika diperlukan (cek TODO global untuk FTS/trigram). *(lihat `supabase/migrations/2025110601_resellers_search_indexes.sql`)*
- [ ] Pastikan mutasi (POST/PATCH/DELETE) menggunakan transaksi/RLS sesuai standar BFF.

#### Detail View
- [x] Tambah helper `getResellerDetail` + API `/api/resellers/[id]/orders|catalog` (DataTable shell).
- [x] Halaman detail (`app/dashboard/resellers/[id]/page.tsx`) menampilkan ringkasan, informasi kontak/terms, riwayat transaksi, dan katalog bahan dengan komponen reusable.

### 2. Frontend Struktur & State
- [x] Ikuti blueprint `docs/todos_tables_refactor.md` (DataTable shell reusable).
- [x] Buat `app/dashboard/resellers/data-table.tsx` (client) + `_components/use-resellers-table.ts`.
- [x] Refactor toolbar/bulk action menggunakan `components/tables/data-table-toolbar.tsx`.
- [x] Gunakan `createActionColumn` untuk kolom aksi agar konsisten.
- [x] Hubungkan filter ke server (TanStack Query) dan realtime (jika diperlukan).

### 3. UX & Form
- [x] Gunakan TanStack Form untuk create/edit reseller sheet.
- [x] Sinkronkan toast/error handling dengan standar Users.
- [x] Tambahkan indikator syncing/loading yang seragam.

### 4. Dokumentasi & Pengujian
- [x] Update dokumen ini + AGENTS.md setelah pola baru diterapkan.
- [x] Tambahkan checklist manual test (`docs/tests_resellers_manual.md`).
- [x] Pastikan lint/tsc bersih dan tambahkan catatan di PR.

> Setelah semua poin di atas selesai, lakukan review ulang untuk memastikan file TSX tidak gemuk, logic reusable berada di hooks/contexts, dan API tinggal menjadi single source of truth untuk data Resellers.
