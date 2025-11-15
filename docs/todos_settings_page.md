# TODO Settings Module

Halaman Settings (`/dashboard/settings`) belum ada. Dokumen ini memetakan pekerjaan untuk membangun modul pengaturan sesuai BRD (tax & discount, informasi toko, penomoran struk) dengan pola BFF + TanStack Form yang dipakai modul lain.

## 📌 Scope
1. Server bootstrap & API (`/app/dashboard/settings/page.tsx`, `/app/api/settings/*`, `features/settings/*`).
2. Client shell & UI (`app/dashboard/settings/*`), termasuk forms, tabs, dan state handling.
3. Data persistence ke tabel `settings` Supabase (kunci `pos.tax_rate`, `pos.default_discount`, `store.profile`, `pos.receipt_numbering`, dll).

## 🎯 Goals
- Semua pengaturan disajikan dalam tiga panel utama:
  1. **Tax & Discount**: default PPN (decimal), flag “auto apply”, default diskon transaksi (nominal/%).
  2. **Profil Gerai**: nama toko, alamat, telepon, logo (upload), catatan footer struk.
  3. **Penomoran Struk**: prefix (POS/RES), panjang digit, auto-reset (harian/none), preview contoh.
- Pengaturan dibaca sekali via BFF `GET /api/settings`, diedit via `PUT` dengan validasi Zod, dan di-cache di TanStack Query + optimistic update.
- Perubahan langsung memutakhirkan helper yang dipakai modul POS (tax rate, next order number, footer).
- UI mengikuti pola Shadcn: tabs kiri, form sheet kanan, notifikasi toast sukses/gagal.

---

## ✅ Rencana Detail

### 1. Backend / BFF
- [x] Buat helper `getSettings(actor)` di `features/settings/server.ts` untuk memetakan value `settings` menjadi shape terstruktur (`tax`, `discount`, `storeProfile`, `receiptNumbering`). (Metadata `updatedAt/By` ditunda karena tabel belum menyimpan kolom tersebut).
- [x] Tambah endpoint:
  - `GET /api/settings` → `{ data: settings }`.
  - `PUT /api/settings` → menerima payload per section, validasi Zod, simpan ke tabel `settings`.
- [x] Pastikan penulisan `settings` menggunakan UPSERT (`on conflict (key) do update`) agar idempotent.
- [x] Perbarui `features/pos/server.ts#getPosBootstrap` agar membaca default tax rate dari helper baru (numbering masih disiapkan untuk kebutuhan berikutnya).

### 2. Client Structure
- [x] `app/dashboard/settings/page.tsx` melakukan SSR bootstrap (`getSettings`) dan hydrate Query Client sebelum render client.
- [x] Buat folder `app/dashboard/settings/_components` berisi `tax-discount-form.tsx`, `store-profile-form.tsx`, `receipt-number-form.tsx` (TanStack Form) serta `SettingsScreen` sebagai shell tabs.
- [x] Gunakan `Card`/`Form` Shadcn, inline helper text, tombol yang disable saat tidak ada perubahan.
- [x] Upload logo sementara memakai input URL hingga uploader siap.

### 3. UX & Validation
- [x] Validasi angka (tax max 0.3), diskon (persentase 0-1 atau nominal ≥ 0), prefix huruf besar, digit 3-6.
- [x] Preview struk: tampilkan `PREFIX-<running number>` dengan padding.
- [x] Tombol “Simpan” per section disable ketika tidak ada perubahan, skeleton saat initial load.
- [x] Notifikasi toast sukses/gagal, inline helper text.

### 4. Data Consistency
- [x] Setelah `PUT`, mutation meng-update cache `["settings"]` (hook POS akan membaca ulang tax saat bootstrap). Invalidasi `["pos-bootstrap"]` akan ditambahkan saat POS bootstrap memakai Query.
- [x] Sesuaikan seeder `supabase/seeds/dev_seed.sql` untuk menyimpan record default (tax, discount, store profile, numbering).
- [x] Pastikan migrasi `settings` memakai constraint unik `key` (sudah ada dari awal).

### 5. Docs & Tests
- [ ] Tambah `docs/tests_settings_manual.md` – skenario update pajak, ganti prefix struk, ubah logo.
- [ ] Update `AGENTS.md` (atau modul guidelines) dengan pola settings (BFF + TanStack Form).
- [ ] Catat progres di dokumen ini tiap checklist tercapai.

---

## 📎 Catatan Implementasi
- Simpan nilai uang tetap dalam rupiah minor unit (integer). Untuk input diskon nominal, gunakan formatter di UI tapi konversi ke integer sebelum kirim.
- Range date/time gunakan `Intl.DateTimeFormat("id-ID")` untuk preview.
- Setting key yang sudah ada di seed: `pos.tax_rate`, `pos.next_order_number`; tambahkan key baru seperti `pos.default_discount`, `store.profile`, `pos.receipt_numbering`.
- Optimistic update: gunakan `queryClient.setQueryData(["settings"], updater)` agar UI terasa instan.
