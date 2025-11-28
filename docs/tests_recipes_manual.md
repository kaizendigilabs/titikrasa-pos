# Manual Test Plan — Recipes

Langkah singkat untuk memverifikasi modul Recipes setelah refactor:

1) **List & Filter**
- Buka `/dashboard/recipes`, pastikan tabel muncul dengan kolom Menu, Ingredients, Effective Date.
- Coba pencarian (search bar) dan filter menu; tabel ter-update tanpa reload penuh.
- Klik refresh di toolbar, data ter-fetch ulang.

2) **Create Recipe (dialog)**
- Klik `Add Recipe` (hanya admin/manager). Dialog muncul di tengah.
- Isi: pilih Menu, versi >=1, effective date (opsional), tambah minimal 1 ingredient (pilih ingredient, isi qty, uom).
- Tambah Method step (step no + instruction).
- Tambah Variant Override (opsional): pilih size/temperature, tambahkan ingredient + qty + uom.
- Submit: dialog tertutup, toast sukses, baris baru muncul di tabel dengan supplier/menu dan effective date benar.

3) **Edit Recipe**
- Buka detail → klik Edit; dialog terisi data sebelumnya.
- Ubah qty ingredient, tambah/hapus step, ubah variant override, simpan.
- Pastikan tabel dan detail menampilkan nilai baru tanpa refresh manual.

4) **Delete Recipe**
- Dari action menu/detail, pilih Delete → konfirmasi.
- Baris hilang dari tabel, realtime listener tidak menambahkan kembali.

5) **Detail Drawer**
- Klik PO/row untuk membuka detail; informasi menu, versi, effective date, items, steps, overrides tampil lengkap.

6) **Validation**
- Coba submit tanpa ingredient atau tanpa menu → harus gagal dengan pesan validasi.
- Qty harus angka > 0; versi minimal 1.

7) **Realtime**
- Buat/edit/delete dari tab lain; tabel merespons (invalidate) secara otomatis.
