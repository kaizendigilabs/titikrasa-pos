# TODO Reusable Table System

Dokumen ini menjabarkan rancangan refactor komponen tabel supaya bisa dipakai lintas halaman (Users, Resellers, Suppliers, Ingredients, dsb.) dan menjadi fondasi untuk membuat komponen Table yang reusable.

## 🎯 Prinsip Desain
- **Composable shell**: Table layout (toolbar, konten, footer) harus generik dan hanya menerima konfigurasi.
- **UI vs Logic terpisah**: Komponen tabel hanya mengurus visual + perilaku dasar (sort/sync state), sedangkan data fetching/mutasi diselesaikan oleh hook domain.
- **Hybrid data flow ready**: Shell menyediakan hook untuk menampilkan status syncing, optimistic badge, dsb. agar mudah dikaitkan dengan TanStack Query + realtime.
- **Minimal duplicasi**: Semua halaman cukup mengisi `columns`, `rows`, `filters`, `actions`, tanpa memodifikasi internal table.

## 🧩 Rencana Komponen

1. **Table Context / Hook**
   - [x] Buat `useDataTableState` yang mengurus state umum (sorting, pagination, selection, syncing indicator).
   - [x] Sediakan API buat domain hook mengambil `filters`, `selectedRows`, `isFetching`, `clearRowSelection`, dsb.

2. **Toolbar Generik**
   - [x] Komponen `DataTableToolbar` (`components/tables/data-table-toolbar.tsx`) dengan slot:
     - Input search.
     - Sekumpulan dropdown filter (diterima sebagai array config).
     - Area actions (misal tombol “Add” atau custom nodes).
     - Aksi bulk (dropdown/tombol) yang muncul saat ada row terpilih, dengan API `bulkActions[]` yang bisa diisi domain (contoh: activate/deactivate/reset/delete).
     - Tombol reset filter built-in.

3. **Content Wrapper**
   - [x] `DataTableContent` sudah data-agnostic:
     - Hanya menerima `table` + pesan loading/kosong.
     - Gunakan `components/tables/data-table-column-header` untuk header standar.

4. **Action Columns**
   - [x] `createActionColumn` (`components/tables/create-action-column.tsx`) menerima config pending state, label dinamis, separator/label, dan dipakai pertama kali di Users.

5. **Footer / Pagination**
   - [x] `DataTablePagination` menampilkan `Page x of y`, total rows, selected count, dan indikator syncing.

6. **Filter Components**
   - [x] Standarisasi `DataTableSelectFilter` agar bekerja dengan schema config (label, placeholder, options) via `DataTableSelectFilterConfig`.
   - [x] `DataTableToolbar` menerima filter bertipe `custom`, jadi filter lain (date range, tags, dsb.) bisa diinject sebagai node.

7. **Domain Integration**
   - [x] Users menjadi referensi:
     - Hook `useUsersTableController` menyuplai konfigurasi domain.
     - `app/dashboard/users/data-table.tsx` hanya meneruskan config ke shell.
   - [ ] Terapkan pattern yang sama ke modul berikutnya (Resellers/Suppliers) setelah Users stabil.

## 🔗 Keterkaitan dengan `todos_users_refactor.md`
- Checklist frontend di dokumen Users harus memakai komponen tabel baru ini.
- Setelah shell siap, kembali ke `todos_users_refactor.md` untuk mengerjakan pemecahan `UsersTable.tsx`, integrasi filters ke server, dan state hooks domain.

## ✅ Deliverables Minimum
- [x] Dokumen ini ter-update dengan status refactor.
- [x] PR refactor komponen tabel reusable (shell DataTable + hook state).
- [x] Update guideline AGENTS agar contributor tahu pola baru.
- [x] Implementasi Users sebagai contoh referensi sebelum menyentuh halaman lain.

## 🚀 Cara Memakai Shell Generik
1. **Server component** (`page.tsx`) tetap fetch initial rows + metadata (page, pageSize, filters) dan teruskan via props.
2. **Definisikan kolom** di `<route>/columns.tsx` menggunakan helper `DataTableColumnHeader` + kolom aksi domain.
3. **Buat hook domain** di `<route>/_components/use-<domain>-table.ts`:
   - Tentukan `initialFilters` (turunan `PaginationFilters`).
   - Sediakan `queryHook` yang memanggil TanStack Query hook domain (`useUsers`, dll).
   - Kelola state UI (toolbar, forms, dialogs, mutasi) dan ekspose `buildToolbarConfig`.
4. **Client component** `data-table.tsx` cukup merender `<DataTable>`:
   - Pass `columns`, `initialFilters`, `initialData`, `queryHook`, dan `getRowId`.
   - Isi `renderToolbar` dengan komponen toolbar domain menggunakan `context`.
   - Gunakan `renderAfterTable` untuk forms/dialogs + listener realtime.

Referensi terbaik saat ini: `app/dashboard/users/data-table.tsx` + `_components/use-users-table.ts`.
