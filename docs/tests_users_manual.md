# Manual Test Checklist — Users Feature

1. **Create user**
   - Open Users dashboard → klik "Add User", isi data, submit.
   - Pastikan toast sukses muncul dan user baru tampil di tabel setelah refresh otomatis.
2. **Edit user**
   - Buka action menu → "Edit Details", ubah nama/role, simpan.
   - Verifikasi toast sukses dan data terbarui tanpa reload.
3. **Toggle status**
   - Pilih "Deactivate" pada user lain → dialog konfirmasi muncul.
   - Setelah konfirmasi, status badge berubah dan toast menampilkan hasil.
4. **Reset password**
   - Gunakan action "Send Reset Link" → toast sukses + info link muncul.
5. **Bulk actions**
   - Pilih ≥2 user, gunakan bulk activate/deactivate/reset, lalu bulk delete.
   - Periksa dialog konfirmasi (untuk delete) dan bahwa selection ter-reset setelah selesai.
6. **Realtime sync**
   - Dari tab lain, ubah user; kembali ke dashboard → perubahan muncul otomatis.
7. **Profile form**
   - Buka detail user → kosongkan telepon, simpan, pastikan validasi sesuai.
8. **Error handling**
   - Coba buat user email duplikat → toast menampilkan pesan backend "Email is already registered".
