# Manual Test – POS Module

Panduan berikut dipakai setiap kali ada perubahan signifikan pada halaman POS (`/dashboard/pos`).

## 1. Bootstrap & Navigasi
- Buka `/dashboard/pos` sebagai admin/staff → panel menu, keranjang, dan order terbaru harus muncul bersamaan tanpa error.
- Status banner menampilkan “POS Ready” ketika online dan tidak ada antrian.
- Pastikan daftar reseller hanya muncul saat mode `Reseller` dipilih.

## 2. Menu Panel
- Cari menu via input search → hasil filter mengikuti kata kunci nama atau SKU.
- Klik kategori tertentu → hanya menu kategori tersebut yang tampil, tombol “Semua” mengembalikan semua menu.
- Klik menu tanpa varian → item langsung ditambahkan ke keranjang.
- Klik menu dengan varian → dialog varian muncul, memilih salah satu menambahkan baris dengan label varian.

## 3. Keranjang
- Tambahkan beberapa item lalu gunakan tombol `-`/`+` serta input angka untuk memastikan qty tersimpan dan total diperbarui.
- Tombol “Bersihkan” mengosongkan seluruh baris, diskon, dan ringkasan kembali ke default.
- Ubah tipe diskon (Nominal vs Persen) dan nilainya → ringkasan total mengikuti perubahan.
- Toggle “Bypass served” → nilai tersimpan dan ikut terkirim saat submit (cek payload network).

## 4. Drawer Pembayaran
- Klik “Proses Pembayaran” → drawer muncul dengan nilai default.
- Ubah nama pelanggan, catatan, metode, status, due date, nominal cash; gunakan tombol pintasan nominal → nilai form dan preview pada keranjang ikut berubah.
- Saat mode `Customer`, opsi status harus terkunci ke `Paid`; saat `Reseller`, opsi `Unpaid` + input due date muncul.
- Submit pembayaran `Cash` dengan uang cukup → toast sukses dan keranjang kosong.
- Submit `Transfer` → tidak ada field uang diterima, total tersimpan benar.

## 5. Offline Queue
- Matikan jaringan (DevTools → Offline) lalu coba proses order → toast “disimpan ke antrian” muncul, keranjang kosong, status banner menunjukkan jumlah order dalam antrian.
- Nyalakan jaringan dan tekan “Sinkron sekarang” atau tunggu otomatis → order hilang dari antrian dan toast “Order tersinkron”.

## 6. Reseller Flow
- Pindah ke mode `Reseller`, pilih reseller aktif, tambah item → harga yg masuk sesuai channel reseller.
- Atur status `Unpaid` + due date, isi catatan, submit → cek payload mengandung `resellerId`, `paymentStatus: unpaid`, `dueDate`.

## 7. Persistensi
- Tambah beberapa item + isi pembayaran, refresh halaman → keranjang dan field pembayaran ter‑hydrate dari localStorage.
- Setelah submit sukses, refresh ulang → keranjang kosong kembali.

## 8. Shortcut & Numpad
- Tekan `F` saat halaman aktif (tanpa fokus di input lain) → kursor pindah ke kolom pencarian menu.
- Tekan `Ctrl + Enter` ketika keranjang valid → drawer pembayaran terbuka; bila drawer sudah terbuka kombinasi yang sama menjalankan submit (pastikan sukses ketika data valid).
- Tekan `Esc` saat drawer aktif → drawer tertutup; tekan lagi ketika dialog varian terbuka → dialog tertutup.
- Pada drawer pembayaran metode `Cash`, gunakan numpad baru untuk memasukkan nominal (uji tombol angka, `00`, `Clear`, dan backspace). Nilai pada field “Uang Diterima” harus mengikuti setiap klik numpad.
