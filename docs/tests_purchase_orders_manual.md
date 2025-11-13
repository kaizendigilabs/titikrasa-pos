# Manual Test Plan — Purchase Orders

Gunakan daftar ini sebelum release perubahan modul Purchase Orders.

## Persiapan
- Pastikan supabase terisi minimal 1 supplier aktif dengan katalog.
- Sign in sebagai user Admin/Manager.

## Scenarios
1. **List + Filter**
   - Buka `/dashboard/procurements/purchase-orders`.
   - Ubah filter status, supplier, dan date range (jika tersedia) lalu pastikan hasil / pagination sesuai.
   - Gunakan search PO ID, periksa meta total.
2. **Create PO**
   - Klik `Purchase Order` → pilih supplier, tambahkan ≥1 item.
   - Submit; baris baru muncul dengan supplier & total benar.
   - Verifikasi realtime refresh & kolom aksi (detail/delete) aktif.
3. **Delete / Status Update**
   - Dari menu aksi, buka detail → ganti status ke pending/complete.
   - Coba hapus PO (selain status complete) dan konfirmasi row hilang.
4. **Supplier Detail Summary**
   - Buka halaman detail supplier → kartu “Recent Transactions” hanya menampilkan 3 PO terbaru + tombol “Lihat semua”.
5. **Supplier Transactions Page**
   - Buka `/dashboard/procurements/suppliers/:id/transactions`.
   - Pastikan toolbar search/status bekerja dan empty state/skeleton tampil saat belum ada data.
   - Klik tombol “New PO” → sheet muncul dengan supplier terisi otomatis dan sukses membuat PO yang langsung muncul di tabel.
