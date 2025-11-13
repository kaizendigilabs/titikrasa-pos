# Manual Test Plan — Inventory Module

Gunakan daftar ini untuk smoke/regression testing setelah refactor Inventory.

## Prasyarat
- Sign in sebagai Admin/Manager.
- Supabase berisi ≥1 store ingredient aktif, supplier, dan purchase order.

## 1. Store Ingredients List
- Buka `/dashboard/inventory`.
- **Filter**: ubah status (Active/Inactive), search nama/SKU, centang “Low stock only”, klik Reset → tabel kembali default.
- **Edit Sheet**: klik aksi pada salah satu row → ubah SKU/min stock/status → submit → toast sukses + data terbarui.
- Verifikasi realtime: ubah data langsung di DB, pastikan tabel otomatis refresh.

## 2. Ingredient Detail
- Klik salah satu ingredient → halaman detail menampilkan summary cards (status, snapshot, latest purchase, linked suppliers).
- **Purchase History**:
  - Gunakan search PO ID, select supplier, preset tanggal, clear filter.
  - Tekan Export CSV → file diunduh (cek via jaringan/devtools jika perlu).

## 3. Stock Opname
- Buka `/dashboard/inventory/stock-adjustments`.
- **Input**: ubah counted quantity beberapa item; pastikan delta & badge berubah.
- Isi notes (wajib), pilih mode:
  - `Draft`: klik submit → snapshot disimpan, stok tidak berubah.
  - `Commit`: hanya Admin/Manager; setelah commit, current stock menyesuaikan.
- Reset counts mengembalikan nilai awal.
- Catat error state ketika notes kosong (tampil pesan di toolbar).
