# TODO Refactor Recipes Module

Dokumen ini melacak pekerjaan untuk merapikan modul Recipe (`/dashboard/recipes`) supaya mengikuti pola tabel reusable + TanStack Form seperti Users/Menus.

## 📌 Scope
1. `/dashboard/recipes` list & detail drawer.
2. Recipe create/edit sheet (`RecipeForm`), ingredient/variant handling, dan action menus.
3. BFF layer (`app/api/recipes/*`, `features/recipes/*`) untuk bootstrap dan mutasi.

## 🎯 Goals
- Tabel daftar resep memakai `DataTable` shell + controller hook (`use-recipes-table`).
- Toolbar mendukung search, filter menu, refresh, dan CTA `Add Recipe`.
- Detail drawer + action menu memakai helper standar (createActionColumn).
- Recipe form sheet menggunakan TanStack Form (no state manual), memvalidasi items & method steps.
- Server helper `getRecipesTableBootstrap` menyediakan `{ recipes, meta, menus, ingredients }`.
- Dokumentasi + manual test tersedia.

---

## ✅ Rencana Detail

### 1. Backend / API
- [x] Helper `getRecipesTableBootstrap(actor, filters)` di `features/recipes/server.ts`
  - Query resep + overrides + lookup ingredient.
  - Kembalikan `{ initialRecipes, initialMeta, menus, ingredients }`.
- [x] Endpoint `/api/recipes` untuk list + filters (search, menuId, pagination).
- [x] Endpoint `/api/recipes/[id]` (`GET/PATCH/DELETE`) agar client tidak langsung ke Supabase.
- [ ] Mutasi create/update/delete via route handler yang memanggil util existing (`toRecipeInsertPayload`, dll.).

### 2. Recipes List UI
- [x] Ganti `RecipesTable.tsx` dengan:
  - `data-table.tsx` (client) yang merender shell.
  - `_components/use-recipes-table.ts` untuk state + toolbar config + dialogs.
- [x] Kolom action gunakan `createActionColumn` (View/Edit/Delete).
- [x] Detail drawer diekstrak ke `_components/recipe-detail.tsx` agar controller hanya mengontrol open state.

### 3. Recipe Form
- [ ] Rebuild `RecipeForm` menggunakan TanStack Form + Zod:
  - Step Info (menu, version, effective date).
  - Step Ingredients (list builder, optional variant overrides).
  - Step Method (rich text or list).
- [ ] Support variant override editor (size/temp combos) dengan component reusable.
- [ ] Form sheet `RecipeFormSheet` menutup otomatis setelah submit sukses; pending state disable actions.

### 4. Hooks & Utilities
- [ ] Tambah `useRecipeDetail(recipeId)` untuk detail view (drawer + edit prefill).
- [ ] Utility `formatRecipeVersion`, `formatIngredientLine`, dsb.
- [ ] Consolidate variant override mapping di `features/recipes/utils`.

### 5. Dokumentasi & Testing
- [ ] Buat `docs/tests_recipes_manual.md` (scenario: search/filter, create recipe, edit, delete, detail drawer, realtime).
- [ ] Update `docs/todos_tables_refactor.md` + `AGENTS.md` setelah Recipes ikut pola.
- [ ] Catat progres di dokumen ini seiring checklist selesai.

---

## 📎 Catatan Implementasi
- Reuse `DataTableToolbar`, `DataTableSelectFilter`, `createActionColumn`.
- Controller hook bertanggung jawab terhadap:
  - buildToolbarConfig (search, menu filter, refresh, CTA).
  - detail drawer state & handlers.
  - delete dialog state + mutation.
  - form sheet state + onSubmit.
- Pastikan server-side pagination didukung di list endpoint (page/pageSize) untuk future use.
