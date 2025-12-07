# Task Testing - E2E Komprehensif

Rangkaian pengujian end-to-end untuk memastikan seluruh alur bisnis dari Supplier → Purchase Order → Store Ingredient → Adjustment → Category → Menu → Resep → POS → KDS → Dashboard Overview berjalan normal.

## Data Uji yang Dipakai
- Supplier: `QA Supplier 01` (email: `qa-supplier01@mail.com`, phone bebas).
- Ingredient: `QA Sugar` (base UOM: GR, min stock: 100).
- Category: `QA Drinks`.
- Menu: `QA Latte` (aktif, harga retail/reseller di-set).
- Menu varian: aktifkan varian ukuran/suhu untuk `QA Latte` (mis. S/M/L, hot/ice) dan uji harga per varian.
- Resep: `QA Latte` menggunakan `QA Sugar` (qty 10 gr per porsi).
- POS Order:
  - Order A (channel POS) 2x QA Latte, pembayaran cash, status paid.
  - Order B (channel reseller) 1x QA Latte, bayar unpaid untuk uji piutang.
- Purchase Order:
  - PO #QA-PO-1 ke `QA Supplier 01` dengan `QA Sugar` qty 500 gr, status pending kemudian complete.
- Stock Adjustment:
  - Adjustment penambahan untuk QA Sugar +200 gr; Adjustment pengurangan -50 gr (uji bawah min stock).

## Langkah Uji per Modul
1) **Login & Akses**
   - Login admin (`admin@mail.com / admin123`), pastikan redirect ke `/dashboard`.

2) **Supplier**
   - Tambah supplier `QA Supplier 01`.
   - Edit data (ubah phone) lalu simpan.
   - Hapus supplier (batalkan) untuk pastikan dialog bekerja, lalu tetap simpan supplier (dipakai PO).

3) **Purchase Order**
   - Buat PO baru ke `QA Supplier 01`, isi item `QA Sugar` 500 gr, status draft → pending → complete.
   - Pastikan supplier name tampil, tidak `Unknown supplier`.
   - Lihat transaksi supplier, tombol back di kiri, tanpa tombol New PO.

4) **Store Ingredient**
   - Tambah ingredient `QA Sugar` (min stock 100).
   - Verifikasi stock awal 0 (atau sesuai seed).
   - Realtime: ubah nama/stock dari halaman lain? (opsional).

5) **Stock Adjustment**
   - Buat adjustment +200 gr untuk QA Sugar (should raise stock).
   - Buat adjustment -50 gr; pastikan tidak boleh <0 jika ada validasi, atau stok turun.
   - Cek detail ingredient, pastikan filter/time range tombol Today/Week/Month/Year sudah dihapus (sesuai permintaan sebelumnya).

6) **Category**
   - Tambah kategori `QA Drinks` (modal, bukan sheet).
   - Edit nama kategori, simpan.
   - Hapus kategori (pastikan konfirmasi).

7) **Menu**
- Tambah menu `QA Latte` dengan kategori `QA Drinks`, harga retail/reseller diisi, varian default.
- Edit harga atau status aktif/nonaktif; simpan.
- Pastikan form number fields memakai placeholder (tidak auto 0).
- Uji varian: aktifkan ukuran & suhu (S/M/L + hot/ice), set harga per varian (retail/reseller), simpan. Pastikan:
  - Varian muncul di daftar harga.
  - POS menampilkan harga sesuai varian yang dipilih.
  - Resep/override varian jika dipakai tetap sinkron.

8) **Resep**
   - Tambah resep untuk menu `QA Latte` via modal; pakai ingredient `QA Sugar` qty 10 gr; effective date hari ini.
   - Edit resep (ubah qty 12) lalu simpan.
   - Hapus/reserve perubahan (opsional).
   - Pastikan daftar resep tampil dan detail dapat dibuka.

9) **POS**
   - Buat Order A (POS): tambah 2x QA Latte, bayar cash, selesai → status paid.
   - Buat Order B (reseller): tambah 1x QA Latte, pilih reseller (jika ada), set unpaid.
   - Pastikan payment drawer, change display, dan kembalian sejajar nominal.

10) **KDS**
    - Buka halaman KDS, pastikan pesanan dari POS muncul.
    - Ubah status item (served), cek sinkron ke POS/KDS (opsional).

11) **Dashboard Overview**
    - Set rentang ke Month/Week/Today:
      - Revenue naik sesuai Order A.
      - Reseller receivables terisi karena Order B unpaid.
      - Pending/Completed PO menambah metrik pending/expenses.
      - Low stock menghitung QA Sugar jika di bawah min stock.
    - Chart tidak empty; last updated menampilkan timestamp; tombol Refresh berfungsi.
    - Order History table menampilkan pesanan terbaru, link/detail berfungsi.

## Validasi Akhir (cross-check data)
- Stok QA Sugar: awal + PO 500 + adj +200 - adj 50 - resep (consumption dari order) = stok akhir terlihat di detail ingredient. Pastikan tidak di bawah min stock kecuali disengaja.
- Dashboard metrics:
  - Revenue ≈ total paid orders.
  - Receivables ≈ nilai Order B.
  - Expenses bertambah dari PO complete.
  - Low stock count sesuai min stock.

## Pelaporan
- Laporkan hasil tiap langkah (pass/fail + catatan bug) di dokumen ini atau tiket terpisah.
- Sertakan screenshot untuk POS, KDS, Dashboard Overview, dan jika ada error API/console.

---

## Eksekusi Terbaru (Playwright)
- Login + Reseller: **PASS** (search, CRUD, detail). Filter status: **NOT FOUND**.
- Create Ingredient (Inventory): **PASS** (flow baru “Add Ingredient” berhasil menyimpan & muncul di tabel).

## Eksekusi E2E Partial (QA flow)
- Supplier QA Supplier 01: **PASS**
- Catalog item QA Sugar: **PASS**
- Store Ingredient QA Sugar: **PASS**
- Purchase Order QA-PO-1: **PASS**
- Category QA Drinks: **PASS**
- Menu QA Latte + varian: **FAIL** (form submit masih belum menyimpan; pastikan pilih kategori + isi harga, coba tanpa toggle varian dulu).
- Resep QA Latte: **FAIL** (menu belum tercipta, dropdown kosong).
- POS Order A (paid): **PASS**
- Dashboard Overview: hanya teks “Total Revenue” (angka belum bertambah karena menu/resep belum sukses).

Next: pastikan kategori dibuat dengan nama unik, lalu menu & resep berhasil disimpan; ulangi order POS & cek Dashboard. KDS belum diuji di run ini.
