# TODO Refactor Halaman Users

Dokumen ini jadi pegangan untuk merapikan halaman Users (frontend + backend) sesuai arahan hybrid data flow, pemisahan UI/logic, dan standar BFF.

## 🎯 Sasaran Utama
- Terapkan konsep **hydrate once → cache optimistik → patch via realtime → rekonsiliasi refetch**.
- Pisahkan **presentation layer** dari **state/data logic** supaya komponen tidak gemuk.
- Perbaiki konsistensi API (filter, paginasi, validasi) agar klien bisa mengandalkan server sepenuhnya.

## 📌 Kondisi & Masalah Saat Ini (Ringkas)
1. API `/api/users` menerapkan filter `role` di klien setelah paginasi → hasil dan `total` menyesatkan.
2. Frontend mem-fetch 1 halaman lalu mem-filter sendiri + prefetch hingga 1000 data; filter (`status/role/search`) tak pernah dikirim ke server.
3. `ProfileForm` mengizinkan pengosongan telepon, tetapi `profileUpdateSchema` menolak `""`, menyebabkan validasi tak selaras.
4. Proses `POST /api/users` tidak rollback ketika penulisan role/profile gagal, bisa meninggalkan akun auth yatim.
5. `UsersTable.tsx` menampung seluruh state + efek + UI sehingga sulit dirawat dan tidak ada pemisahan concern.

## ✅ Rencana Refactor

### 1. Backend / API
- [x] Perbaiki `GET /api/users`
  - [x] Terapkan filter `role` langsung di Supabase query (gunakan `eq`/`in`) sebelum paginasi.
  - [x] Pastikan `count` mencerminkan total hasil terfilter.
  - [x] Tambahkan dukungan search case-insensitive terindex (menggunakan indeks trigram di `2025110502_profiles_search_indexes.sql`).
- [x] Audit endpoint agar menerima `status`, `role`, `search`, dan `page/pageSize` dari klien tanpa perlu filtering manual di klien.
- [x] `POST /api/users`
  - [x] Bungkus penulisan role/profile + audit dalam transaksi (RPC atau manual rollback auth user jika insert gagal).
  - [x] Pastikan error handling menghapus user auth jika langkah lanjutan gagal.
- [x] `PATCH /api/profile/[id]`
  - [x] Izinkan `phone` kosong (`""` → `null`) agar sesuai UI.
  - [ ] Pertimbangkan dukungan clear avatar juga bila diperlukan.

### 2. Frontend Struktur & State
- [x] Ikuti blueprint reusable table di `docs/todos_tables_refactor.md` sebelum menyentuh komponen Users.
- [x] Pecah `UsersTable.tsx`
  - [x] Extract hook `useUsersTableController` (filter, search, modal, pending actions, optimistic helpers).
  - [x] Extract komponen presentasi (misal `UsersToolbar`, `UsersDataView`, `InviteUserSheet`, `EditUserSheet`) ke file terpisah.
- [x] Tambah dukungan bulk actions (activate/deactivate, reset password, hard delete) yang memanfaatkan selection state + tombol di toolbar.
- [x] Gunakan **TanStack Query** untuk mem-fetch berdasar filter:
  - [x] Tambahkan `status`, `role`, `search`, `page`, `pageSize` ke `ListUsersParams`.
  - [x] Hindari prefetch manual 1000 data; cukup gunakan query pagination + background refetch.
- [x] Simpan state UI di context/hook khusus (tanpa perlu Redux/Zustand dulu) agar mudah di-share antar komponen.
- [x] Pertahankan **optimistic update** via React Query `setQueryData`, tapi pastikan setiap mutasi tetap memanggil API dengan filter aktif supaya data konsisten.
- [x] Pastikan `useUsersRealtime` menghormati filter aktif (misal: hanya patch bila user masih match filter atau lakukan revalidate ringan).

### 3. UX & Validasi
- [x] Selaraskan toast/error handling: tampilkan pesan dari backend (misal “Email sudah terdaftar”).
- [x] Tambahkan state loading/disabled yang terpusat supaya tombol tidak menggantung saat mutasi berjalan (toolbar `isBusy`, dialog konfirmasi, pending badges).
- [x] Uji alur: buat user, edit, toggle aktif, hapus, reset password — pastikan cache/realtime tetap sinkron tanpa refresh paksa. (Lihat `docs/tests_users_manual.md`)

### 4. Dokumentasi & Pengujian
- [x] Update docs/advice (AGENTS.md atau README onboarding) tentang pola hybrid data flow untuk fitur Users.
- [x] Tambahkan test manual checklist atau unit sederhana (jika memungkinkan) untuk memastikan filter + pagination ter-cover. (Lihat `docs/tests_users_manual.md`.)

> Setelah semua poin di atas selesai, lakukan review ulang untuk memastikan file TSX tidak gemuk, logic reusable berada di hooks/contexts, dan API tinggal menjadi single source of truth untuk data Users.
