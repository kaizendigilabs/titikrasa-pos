# TODO Refactor POS Module

Dokumen ini melacak pekerjaan untuk merapikan modul POS (`/dashboard/pos`) agar mengikuti pola DataTable/Controller + TanStack Form serta mendukung pengalaman kasir offline-first.

## 📌 Scope
1. `/dashboard/pos` dashboard (menu list, cart, payment drawer, status banner).
2. “New order” flow: menu grid, modifiers, cart summary, payment form.
3. Sync/offline indicators + integration dengan inventory (stok) & recipes.

## 🎯 Goals
- Komponen POS dipisah antara UI dan logic: `page.tsx` hanya fetch bootstrap (menus, resellers, open orders, settings); logic di `features/pos/*`.
- Menu list & filters memakai hook state terpisah (`use-pos-menu`) dengan search, category tabs, favorit.
- Cart state menggunakan TanStack Store atau Zustand yg tersentral, siap disimpan offline (IndexedDB).
- Payment drawer/form memakai TanStack Form + validasi (amount tendered, method, change).
- Offline banner + sync queue status (realtime status/foreground sync).

---

## ✅ Rencana Detail

### 1. Backend / Bootstrap
- [x] Helper `getPosBootstrap(actor)` di `features/pos/server.ts`:
  - Fetch active menus (with variant prices), resellers (for quick-select), open drafts.
  - Include POS settings (tax, service, rounding, offline queue status).
- [x] API endpoints:
  - `/api/pos/orders` (list/create/update). Support offline queue (payload dengan `client_id` untuk dedup).
  - `/api/pos/orders/[id]` (detail, mark paid/cancel).
  - `/api/pos/menus` (optional filter search).
- [x] Webhook/RPC to adjust inventory ketika checkout (menggunakan `pos_checkout` RPC fallback manual).

### 2. Frontend Structure
- [x] `app/dashboard/pos/page.tsx` → `data-provider.tsx` + hook `usePosController`.
- [x] Split UI:
  - `MenuPanel` (search, category filter, menu cards).
  - `CartPanel` (items, modifiers, quantity controls).
  - `PaymentPanel` (drawer/form; show change & method selection).
  - `StatusBanner` (offline/sync indicator).
- [x] Implement skeleton loaders + optimistic inserts for cart actions.

### 3. Cart & Orders
- [x] Central cart store (TanStack Store or Zustand) with persistence (IndexedDB/localStorage).
- [x] Actions:
  - add/remove menu item, choose variant/modifiers.
  - apply reseller pricing or discounts.
  - compute totals (tax/service) via helper.
- [x] Payment flow:
  - TanStack Form for payment fields (amount tendered, method, notes).
  - After submit: queue order if offline, show toast + clear cart.

### 4. Offline & Sync
- [x] Add `usePosSync` hook:
  - observe Supabase channel for new orders.
  - process local queue when reconnect.
  - show status badge (e.g., “Offline – 3 orders queued”).
- [x] Provide manual “Retry sync” button.

- [x] Keyboard shortcuts (Enter to add, Shift+Enter to pay, etc.) — optional.
- [x] Menu panel: grid responsif dengan thumbnail besar, kategori/favorit tabs, indikator stok langsung di kartu.
- [x] Cart panel: tombol +/- besar, ringkasan total kontras, tombol clear cart, diskon/reseller mudah diakses.
- [x] Payment drawer: TanStack Form dengan tombol pintas nominal, kalkulasi kembalian otomatis, opsi draft.
- [x] Status banner offline/online + jumlah order dalam antrian, tombol retry sync.
- [x] Numpad / shortcut untuk kasir layar sentuh dan keyboard (F fokus search, Ctrl+Enter bayar, dll).

### 6. Documentation & Tests
- [x] Buat `docs/tests_pos_manual.md` (scenario: add cart, discount/reseller, payment cash/card, offline queue).
- [x] Update `AGENTS.md` dengan pola POS (cart store + TanStack Form).
- [x] Catat progres di dokumen ini setiap checklist selesai.

---

## 📎 Implementasi Notes
- Reuse `features/menus/types` (MenuVariants) untuk POS state; hindari duplikasi mapping.
- Cart store harus siap di-reset setelah submit & saat user logout.
- Pastikan order payload menyertakan `client_id` untuk dedup di server.
- Payment form harus menghitung change dan memvalidasi tendered ≥ total (kecuali piutang/reseller).
