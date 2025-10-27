# BRD — TITIKRASA Point of Sales (Single Store)

## 0) Guideline untuk Code/Build

- **Waktu & Uang**: simpan waktu **UTC** (render WIB di UI). Nilai uang pakai **minor unit IDR** (integer). Harga disimpan **ex‑PPN**.
- **Data Entry**: semua input **manual** oleh user; sistem melakukan kalkulasi/penyesuaian **otomatis** (stok, average cost, pajak) sesuai flow.
- **Out of scope**: forecasting, laporan analitik berat, multi‑store.

---

## 1) Ringkasan

Web app POS untuk coffee shop **single store** dengan fokus: transaksi cepat, KDS realtime, menu & resep (costing), inventory & stock opname, procurement PO‑first, transaksi reseller, users/RBAC, serta pengaturan pajak & diskon per transaksi.

---

## 2) Tujuan & KPI

- **TGT-01**: Good Performance Website
- **TGT-02**: Harga dan Stok terupdate otomatis
- **TGT-03**: Sinkron POS↔KDS realtime, zero desync.
- **TGT-04**: Downtime < 0.1% waktu operasional.

---

## 3) Scope

**In-scope:** POS, KDS, Menus & Recipes, Inventory, Procurement (Supplier & PO), Reseller, Users/RBAC, Settings (Tax/Discount, Toko).  
**Out-of-scope:** Multi‑store, loyalty, aggregator, forecasting, laporan berat, rls/policies (hanya sementara sampai website stabil).

---

## 4) Alur Utama (Flow)

- **POS-FLOW-01**: Pilih **mode** (customer/reseller) → cari menu **berdasarkan nama** (filter kategori default All) → pilih **size (S/M/L)** & **temperature (hot/ice)** → set qty → **diskon per transaksi** → **PPN 11% otomatis** → pilih metode bayar **cash/transfer** → **input uang diterima** (cash, default 0) → identitas: (customer: opsional nama; reseller: wajib pilih master reseller) → **issue receipt** (set **payment_status: paid/unpaid/void**; opsi **bypass `served`**) → trigger KDS.
- **KDS-FLOW-02**: KDS menerima tiket per item; barista ubah status: `queue → making → ready → served`. Jika POS centang **bypass `served`**, tiket dibuat langsung berstatus `served`.
- **INV-FLOW-03**: Penjualan mengurangi stok **ingredients** sesuai resep (auto consume ke ledger).
- **REC-FLOW-04**: Resep versi baru (versioning) memengaruhi costing/consumption ke depan.
- **PO-FLOW-05** (**PO‑first**): Buat PO **status** `draft` → `pending` → `complete` dari **Supplier Catalog**. Pada `draft/pending`, setiap item **wajib di‑map** ke **Store Ingredient** (boleh **create on‑the‑fly**, stok 0) dan **boleh dipakai di Resep**. Harga catalog disimpan per **base UOM** (`gr/ml/pcs`) dan qty PO diinput langsung dalam base unit—tidak ada konversi pack. Saat barang datang, ubah ke `complete` → stok (base UOM) naik, ledger `po` tercatat, **average cost** update. **Multi‑supplier** dalam satu PO didukung; memilih `complete` saat checkout menambah stok segera.
- **STK-FLOW-06**: Halaman **Stock Opname**: kolom _Nama Bahan, Stok Sekarang, Stok Aktual (input), Selisih, Status (`synced`/`out-of-sync`), Notes_ → input stok aktual → klik **Singkronkan** (wajib isi Notes) → sistem buat **Stock Adjustment** otomatis; admin/manager langsung commit, staff sebagai draft menunggu approval → baris jadi `synced`.
- **RSL-FLOW-07**: Sama dengan customer; bedanya identitas **reseller** (autocomplete, wajib) & **price list grosir**. Pembayaran **cash/transfer**; **payment_status** `paid/unpaid/void` (default `paid`). Jika `unpaid`, **due date** bisa diisi manual (default +7 hari bila dikosongkan).

---

## 5) Kebutuhan Fungsional

### 5.1 POS (Kasir)

- **Cari Menu**: berdasarkan **nama**; filter **kategori** (default All).
- **Variant**: `size` (s/m/l), `temperature` (hot/ice); **default** ditentukan di data menu (`default_size`, `default_temperature`).
- **Diskon**: **hanya per transaksi** (nominal/%) — tidak ada kupon/per‑item.
- **PPN**: default **11%** otomatis (sesuai Settings).
- **Pembayaran**: **cash/transfer** (default cash). Field **uang diterima** hanya untuk cash.
- **Payment Status**: `paid/unpaid/void` (default `paid`). `unpaid` khusus reseller dapat **due date** manual (default saran +7 hari).
- **Hold/Resume**: simpan sementara, tidak ada split/merge bill.
- **Bypass Served**: opsi untuk menandai tiket KDS langsung `served`.
- **Channel Pricing Guard**: checkout **diblok** bila varian **tanpa harga** pada channel aktif.

### 5.2 KDS

- Antrian per item (realtime), status `queue/making/ready/served`.
- Filter berdasarkan status; alert suara/visual saat order masuk.

### 5.3 Menu Management

- **Kategori**: CRUD + ikon. **Fallback ikon** untuk menu tanpa thumbnail.
- **Menu**: CRUD; `simple` (tanpa variant) atau `variant` (`size × temperature`). Atur **matrix harga manual** per kombinasinya; centang **default size/temperature**. **thumbnail_url** opsional (fallback ke ikon kategori/default).
- **Resep**: **base recipe (wajib)** + **variant overrides (opsional)**: qty **flat/absolute**; **SOP** (`[{step_no, instruction}]`) bisa override per varian. **thumbnail_url** opsional untuk resep (fallback ikon default aplikasi).
- **Costing**: HPP = Σ(qty bahan × **average cost**). Tampilkan **HPP, Keuntungan (Rp), Margin %** pada **default combo**; tombol **Lihat semua varian** (matrix) untuk varian.

### 5.4 Inventory

- **Store Ingredients** (PO‑first): list kolom `nama`, `base_uom`, `current_stock`, `avg_cost`, `supplier (terakhir beli)`, `last_purchase_price`, `min_stock`, `status`.
- **Ledger**: semua pergerakan distandarkan ke **base UOM**.
- **Opname**: kolom wajib + aksi **Singkronkan** (Notes wajib). Role effect: admin/manager auto‑approve; staff draft.
- **Konversi UOM**: preset kg↔g, liter↔ml, botol↔ml, cup↔ml; user bisa tambah/edit/hapus.
- **Purchase History per Ingredient**: header (_Current Stock, Avg Cost, Last Supplier, Last Purchase Price_); tabel dari **PO `complete`** (terbaru → lama); filter tanggal/supplier; **Export CSV**.

### 5.5 Procurement

- **Supplier** & **Supplier Catalog**: CRUD item supplier (`name`, `base_uom`, `purchase_price`, `status`). Catalog supplier **boleh lebih banyak** dari bahan toko. Harga tercatat per base unit; qty PO mengikuti base unit yang sama.
- **PO (draft/pending/complete)**: tambah item dari catalog; **wajib map** `catalog_item → store_ingredient` (buat on‑the‑fly bila belum ada). Pada `draft/pending` boleh dipakai di Resep (stok 0). **Complete**: receiving implicit (tanpa partial) → stok naik, ledger `po`, **average cost** update & **PO terkunci** untuk qty/harga.

### 5.6 Reseller

- Master **reseller** (nama, kontak, terms).
- **Harga grosir**: **manual per varian** (ex‑PPN) — **tanpa fallback** dari retail.
- POS **mode reseller** memakai matrix ini; varian tanpa harga → **blokir checkout**.
- **Payment**: cash/transfer; **payment_status** `paid/unpaid/void`. Jika `unpaid`, **due date** manual (default +7 bila kosong).

### 5.7 Users & RBAC

- **User CRUD**: tambah/edit/nonaktif/hapus (`name`, `email`, `role: admin/manager/staff`, `is_active`).
- **Reset Password**: Admin bisa reset password lewat dashboard.
- **Keamanan**: user nonaktif ditolak login; tidak bisa hapus **diri sendiri** jika hanya tersisa **1 admin**.
- **UI**: Tabel profiles (Name, Email, Role, Status, Last Login) + aksi Edit/Reset/Activate/Deactivate/Delete.

### 5.8 Settings

- **Tax & Discount** (default & priority),
- **Logo/Informasi Toko**,
- **Nomor Struk** (prefix, digit, optional reset harian).

---

## 6) Aturan Bisnis (Selected)

- **TAX-RULE-01**: subtotal → diskon transaksi → **PPN 11%** → total.
- **INV-RULE-03**: penjualan konsumsi bahan otomatis (ledger `sale`).
- **PROC-RULE-POFIRST**: **Store Ingredient dibuat/ditautkan via PO**. Item PO **tidak boleh `complete`** bila belum di‑map ke Store Ingredient.
- **PROC-RULE-DRAFT**: **PO `draft/pending` boleh menciptakan Store Ingredient** (stok 0) & bisa direferensikan di Resep. Saat **`complete`**: stok & **average cost** update; **PO terkunci** (ubah lewat adjustment).
- **PRICE-CH-01**: harga **ex‑PPN per channel**; PPN diproses saat checkout.
- **PRICE-CH-02**: varian **sellable** pada channel = menu aktif **&** harga varian tersedia di channel tsb.
- **RSL-PRICE-01**: **harga reseller wajib manual** per varian; **tanpa fallback**.
- **MEDIA-FALLBACK-01**: jika menu tanpa **thumbnail**, pakai **ikon kategori**; jika kosong, pakai **ikon default**. Jika **resep** tanpa thumbnail, pakai **ikon default**.

---

## 7) Model Data (Ringkas)

> Tipe: `uuid`, `money=int(IDR)`, `ts=datetime`, `flag=boolean`, `json=object`

- **categories**: id, name, slug, sort_order, is_active, **icon_url**
- **store_ingredients**: id, name, base_uom(gr/ml/pcs), sku, min_stock, current_stock, avg_cost(money), conversions(json), is_active
- **menus**: id, name, sku, category_id, price(money, retail), reseller_price(money), is_active, **thumbnail_url**, variants(json|null):
  - `null` → simple (pakai `price`).
  - object (contoh):
    ```json
    {
      "allowed_sizes": ["s", "m", "l"],
      "allowed_temperatures": ["hot", "ice"],
      "default_size": "m",
      "default_temperature": "ice",
      "prices": {
        "retail": {
          "s": { "hot": 25000, "ice": 26000 },
          "m": { "hot": 28000, "ice": 29000 },
          "l": { "hot": 32000, "ice": 33000 }
        },
        "reseller": {
          "s": { "hot": 24000, "ice": 25000 },
          "m": { "hot": 27000, "ice": 28000 },
          "l": { "hot": 31000, "ice": 32000 }
        }
      }
    }
    ```
- **recipes**: id, menu_id, version, effective_from, items(json[{ingredient_id, qty, uom}]), **thumbnail_url**, method_steps(json[{step_no, instruction}]), method_overrides(json{"s_hot":[{step_no,instruction}], ...})
- **recipe_variant_overrides**: id, menu_id, size(enum s/m/l), temperature(enum hot/ice), version, effective_from, items(json[{ingredient_id, qty, uom}])
- **stock_ledger**: id, ingredient_id, delta_qty, uom, reason(enum: sale,po,adjust,waste), ref_type, ref_id, at(ts)
- **suppliers**: id, name, contact(json), is_active
- **supplier_catalog_items**: id, supplier_id, name, base_uom(enum gr/ml/pcs), purchase_price(money per base unit), is_active
- **ingredient_supplier_links**: id, store_ingredient_id, catalog_item_id, preferred(flag), last_purchase_price(money), last_purchased_at(ts)
- **purchase_orders**: id, status(enum: draft,pending,complete), items(json[{catalog_item_id, store_ingredient_id, qty, base_uom, price(money)}]), totals(json), issued_at, completed_at
- **resellers**: id, name, contact(json), terms(json), is_active
- **orders**: id, number, channel(enum: pos,reseller), **payment_method(enum: cash,transfer)**, **payment_status(enum: paid,unpaid,void)**, **due_date(date|null)**, customer_note, status(enum: open,paid,void,refunded), totals(json), paid_at
- **order_items**: id, order_id, menu_id, variant, qty, price(money), discount(money), tax(money)
- **kds_tickets**: id, order_id, items(json[{order_item_id, status, updated_by, timestamps}])
- **profiles**: user_id, **auth.users.id (uuid, Supabase Auth)**, name, email(unique), is_active, last_login_at(ts)
- **roles**: id, name(unique)
- **user_roles**: user_id, role_id
- **audit_logs**: id, actor_id, action, entity, entity_id, before(json), after(json), at(ts)
- **settings**: id, key, value(json)

---

## 8) Acceptance Criteria (Epic)

- **EP-POS**: Transaksi dari pilih menu hingga struk; KDS ter‑trigger; stok berkurang sesuai resep.
- **EP-KDS**: Perubahan status item realtime; kasir melihat status `ready/served`.
- **EP-MENU**: Admin/manager CRUD kategori, menu & resep; harga retail tampil benar di POS.
- **EP-INV**: Ledger konsisten; opname menghasilkan adjustment sesuai role.
- **EP-INV-HIST**: Purchase History per ingredient (filter tanggal/supplier, ekspor CSV, terbaru di atas). Header menampilkan _Last Supplier_ & _Last Purchase Price_ dari PO **`complete`** terbaru.
- **EP-PROC**: PO bisa `draft/pending/complete`; saat `complete`, stok & **average cost** ter‑update; PO terkunci qty/harga.
- **EP-RSL**: Mode reseller: harga grosir manual dipakai; checkout gagal bila varian tanpa harga reseller. `unpaid` dapat **due date** manual (default +7 bila kosong).
- **EP-USR**: Admin dapat tambah/edit/nonaktif/hapus user, set **role**, dan **reset password**. Email unik wajib. Tidak bisa hapus diri sendiri jika hanya tersisa satu admin.
- **EP-RBAC**: Kebijakan akses berjalan sesuai matriks; aksi kritikal terekam di audit log.

---

## 9) Konvensi

- **Money**: integer ex‑PPN; helper `money.ts`.
- **UOM**: Procurement & stock pakai base unit (`gr`, `ml`, `pcs`). Tidak ada konversi pack↔base pada PO; resep masih boleh memakai helper konversi ringan bila dibutuhkan.
- **Variant key**: `${size}|${temperature}` (contoh: `"m|ice"`) atau `null` (simple).
- **Timezone**: simpan UTC; render WIB.
- **tsconfig alias**:
