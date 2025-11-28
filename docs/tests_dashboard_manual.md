# Manual Test - Dashboard Overview

Gunakan skenario ini setelah refactor dashboard overview (hybrid data flow + realtime).

1) **Switch rentang & snapshot**
- Buka `/dashboard` (range default: month). Pastikan kartu metrik, chart, dan tabel order terisi.
- Ganti rentang ke Today/Week/Year. Data berganti sesuai rentang.
- Matikan koneksi jaringan, refresh halaman. Snapshot terakhir tetap muncul (kartu, chart, riwayat order).

2) **Refresh & background polling**
- Tekan tombol `Refresh`, status loading singkat lalu `last updated` berubah.
- Diamkan 1 menit; data auto refresh (staleTime 60s) tanpa kehilangan state filter rentang.

3) **Realtime invalidation**
- Dari tab lain, buat order baru (POS/reseller). Channel Supabase memicu invalidate; kartu metrik + riwayat order ter-update otomatis tanpa refresh manual.

4) **Empty & error states**
- Pilih rentang tanpa data (mis. Today pada seed minimal). Chart menampilkan empty state, tabel riwayat menampilkan pesan kosong.
- Simulasikan error API (mis. cabut network). Snapshot tetap tampil; toast/error tidak memblokir UI.

5) **Order history CTA**
- Tombol “Lihat semua pesanan” membuka halaman POS/daftar order dan tidak menutup filter yang sedang aktif.
