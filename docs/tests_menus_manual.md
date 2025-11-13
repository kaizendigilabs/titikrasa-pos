# Manual Test Plan — Menu Management

Catatan ini dipakai saat regression testing modul Menu (daftar menu & kategori).

## 1. Daftar Menu (`/dashboard/menus`)
1. **Filter dasar**
   - Ketik kata kunci pada search → hasil menyempit, tombol reset muncul.
   - Ubah filter Status (Semua → Aktif → Nonaktif) dan Type (Semua → Simple → Variant).
   - Pilih kategori tertentu lalu reset → semua filter kembali ke default.
2. **Pagination & sinkronisasi**
   - Ubah page size (default 50) via pagination component → baris berganti.
   - Scroll page lain dan verifikasi indikator “Syncing…” muncul saat refetch.
3. **Create simple menu**
   - Klik “Menu Baru”, isi form tipe Simple dengan harga retail & reseller.
   - Submit → sheet menutup setelah sukses, toast muncul, tabel memuat baris baru.
4. **Create variant menu**
   - Buka sheet, ubah tipe ke Variant.
   - Aktifkan kombinasi size/temperature, isi matrix harga (retail & reseller).
   - Pastikan default size/temp otomatis menyesuaikan pilihan.
5. **Edit menu**
   - Pilih baris → “Edit”, ubah nama/thumbnail/harga.
   - Submit → periksa nilai terbaru pada tabel.
6. **Toggle status & hapus**
   - Gunakan action menu (“Nonaktifkan/Aktifkan”) → dialog konfirmasi muncul.
   - Pilih “Hapus” → dialog merah, setelah confirm baris hilang.

## 2. Kategori Menu (`/dashboard/menus/categories`)
1. **Filter & search**
   - Cari nama/slug, ubah status filter (Aktif/Nonaktif).
   - Tombol reset mengembalikan kombinasi default.
2. **Create kategori**
   - Klik “Kategori Baru”, isi nama → slug otomatis mengikuti (boleh diedit manual).
   - Isi ikon/sort order opsional, simpan → baris baru muncul di urutan yang sesuai.
3. **Edit & slug kontrol**
   - Edit kategori, ubah nama dan pastikan slug tidak berubah jika pengguna sudah mengetik manual.
4. **Toggle & delete**
   - Gunakan action menu untuk mengaktifkan/nonaktifkan kategori.
   - Hapus kategori → dialog konfirmasi, baris hilang.

## 3. Realtime sanity
1. Buka dua browser/tab pada halaman menu.
2. Lakukan create/edit/delete dari tab A → tab B tersinkron (tanpa refresh) dan indikator “Syncing…” tampil singkat.
3. Ulangi untuk halaman kategori.

## 4. Error handling
- Coba submit form dengan input tidak valid (harga kosong, slug kosong) → toast error muncul dan field tetap terbuka.
- Putuskan koneksi jaringan sementara saat menyimpan → pastikan pending state hilang dan toast error muncul.
