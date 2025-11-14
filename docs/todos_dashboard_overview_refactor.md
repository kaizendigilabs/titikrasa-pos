# TODO Refactor Dashboard Overview

Dokumen ini memetakan pekerjaan untuk merapikan halaman Dashboard Overview (`/dashboard`) agar mengikuti pola hybrid data flow, reusable DataTable, dan memenuhi ekspektasi monitoring operasional.

## 📌 Scope
1. Server bootstrap (`app/dashboard/page.tsx`, `features/dashboard/server.ts`).
2. Client shell (`app/dashboard/DashboardOverviewClient.tsx`, komponen kartu/chart/table).
3. API layer `/api/dashboard/metrics`.
4. Shared table component untuk Order History.

## 🎯 Goals
- Gunakan pola hybrid data flow: SSR bootstrap → hydrate TanStack Query cache → reuse cache untuk filter range, offline snapshot, background refetch.
- Persist hasil fetch terakhir agar ketika range diganti atau jaringan terputus, data lama tidak hilang.
- Order History memakai shell DataTable standar (`components/tables/data-table.tsx` + hook controller) agar konsisten dengan modul lain.
- Siapkan jalur menuju realtime patch (Supabase channel) untuk metrik kritis (order baru, PO pending).

---

## ✅ Rencana Detail

### 1. Data Layer & API
- [ ] Tambahkan helper `getDashboardSummary(actor, payload)` yang bisa dipanggil baik SSR maupun API; pastikan shape `{ data, error, meta }`.
- [ ] Perluas payload agar bisa menerima `limit`, `includeReceivables`, dll, namun tetap default ringan.
- [ ] Audit `fetchDashboardSummary` agar:
  - [ ] Memakai typed selects + `parseTotals` di level mapper.
  - [ ] Menyediakan `updatedAt` / `generatedAt` timestamp untuk invalidasi cache.
  - [ ] Memisahkan query berat (low stock, receivables, pending PO) supaya bisa di-load lazy bila diperlukan.
- [x] Pastikan API route mengembalikan `ok({ data, meta })` sesuai standar BFF (termasuk endpoint baru `/api/dashboard/orders`).

### 2. Hybrid Client Flow
- [x] Bungkus dashboard summary dalam TanStack Query (mis. key `["dashboard-summary", range]`) dengan dehydrasi via `HydrationBoundary`.
- [x] `DashboardOverviewClient` cukup membaca data dari query hook (`useDashboardSummary(range)`), dan memicu refetch melalui query API, bukan `fetch` manual.
- [ ] Simpan snapshot terakhir di localStorage/IndexedDB (optional) agar reload offline tetap menampilkan data terakhir.
- [ ] Tambahkan background refetch interval (mis. setiap 60 detik) + tombol manual “Refresh”.
- [ ] Hook-kan Supabase realtime channel orders untuk men-trigger `queryClient.invalidateQueries(["dashboard-summary"])` saat ada order baru terbuat.

### 3. Order History Table (Reusable)
- [x] Pindahkan table ke pattern `data-table.tsx`:
  - [x] Buat controller/hook `OrderHistoryTable` di `app/dashboard/_components` dengan query hook `useDashboardOrders`.
  - [x] Definisikan columns, filter, sorting sesuai schema DataTable generic.
- [x] Tambahkan endpoint `/api/dashboard/orders?range=...` bila butuh paginasi.
- [x] Pastikan table mendukung skeleton/loading state bawaan DataTable shell.

### 4. UI/UX Enhancements
- [ ] Tampilkan rentang aktif + summary `last updated` timestamp.
- [ ] Metric cards: tambahkan indicator delta vs previous period (opsional) atau placeholder.
- [ ] Chart: fallback (empty) terintegrasi dengan Query state (loading/error/empty).
- [ ] Order history section: gunakan CTA yang jelas (“Lihat semua pesanan”) dan state kosong terstandardisasi.

### 5. Testing & Docs
- [ ] Update `docs/tests_dashboard_manual.md` (baru) berisi skenario range switching, offline snapshot, realtime refresh.
- [ ] Tambahkan catatan di `docs/todos_tables_refactor.md` bahwa dashboard order history sudah memakai DataTable.
- [ ] Rekam progres di dokumen ini begitu checklist selesai.

---

## 📎 Catatan Implementasi
- Gunakan helper Query dari `/lib/query` (mis. `createQueryClient`) supaya konsisten dengan modules lain.
- Simpan initial summary ke query cache lewat `dehydrate(queryClient)` di server component.
- Untuk persist snapshot, cukup simpan JSON ringkas (`metrics`, `chart`, `transactions`) + timestamp; gunakan saat Query error/offline.
- Realtime listener bisa memakai channel `orders` dengan filter `created_at >= range.start`.
