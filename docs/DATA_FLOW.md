# Data Flow Architecture

Dokumen ini menjelaskan arsitektur data flow dari Frontend ke Backend di aplikasi Titikrasa POS.

## Table of Contents

- [Overview](#overview)
- [Current Architecture](#current-architecture)
- [Data Flow Patterns](#data-flow-patterns)
- [Inconsistencies Found](#inconsistencies-found)
- [Recommendations](#recommendations)

---

## Overview

Aplikasi menggunakan **Next.js 16** dengan **App Router** dan **React Query (TanStack Query)** untuk state management dan data fetching. Backend menggunakan **Supabase** sebagai database dan authentication provider.

### Tech Stack

- **Frontend**: React 19, Next.js 16, TanStack Query v5
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **State Management**: TanStack Query (server state), Zustand (client state)

---

## Current Architecture

### Layer Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│  (UI Components, Pages - app/dashboard/*, app/*)            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    DATA FETCHING LAYER                       │
│  Pattern A: hooks.ts (React Query)                          │
│  Pattern B: queries.ts (React Query)                        │
│  Pattern C: client.ts (Direct fetch)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     API ROUTES LAYER                         │
│  (app/api/* - Next.js Route Handlers)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│  (features/*/server.ts - Server-side logic)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  (Supabase PostgreSQL + RLS)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Patterns

Saat ini terdapat **3 pola berbeda** untuk data fetching:

### Pattern A: `client.ts` + `hooks.ts` (Mutation-focused)

**Digunakan oleh**: Orders, Menus, Resellers, Users, Menu Categories, Recipes, Procurement

**Flow:**

```
UI Component
    ↓
hooks.ts (useQuery/useMutation)
    ↓
client.ts (fetch wrapper)
    ↓
API Route (app/api/*)
    ↓
server.ts (business logic)
    ↓
Supabase
```

**Contoh:**

```typescript
// features/orders/hooks.ts
export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => listOrders(filters), // ← calls client.ts
  });
}

// features/orders/client.ts
export async function listOrders(filters: OrderFilters) {
  const response = await request<ListOrdersResponse>("/api/pos/orders", {
    method: "GET",
  });
  return response.data;
}

// app/api/pos/orders/route.ts
export async function GET(request: NextRequest) {
  const actor = await requireActor();
  const data = await fetchOrders(actor, filters); // ← calls server.ts
  return ok(data);
}
```

**Karakteristik:**

- ✅ Memiliki custom `request()` helper di setiap `client.ts`
- ✅ Error handling konsisten dengan `AppError`
- ✅ Type-safe dengan TypeScript
- ❌ Duplikasi kode `request()` di setiap feature
- ❌ Tidak ada centralized API client

---

### Pattern B: `queries.ts` (Query-focused, Server-first)

**Digunakan oleh**: Dashboard, Settings

**Flow:**

```
UI Component
    ↓
hooks.ts (useQuery wrapper)
    ↓
queries.ts (queryOptions + fetch)
    ↓
API Route (app/api/*)
    ↓
server.ts (business logic)
    ↓
Supabase
```

**Contoh:**

```typescript
// features/dashboard/queries.ts
async function fetchDashboardSummary(range: DateRangeType) {
  const response = await fetch(`/api/dashboard/metrics?range=${range}`, {
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message);
  return payload.data.summary;
}

export function dashboardSummaryQueryOptions(range: DateRangeType) {
  return queryOptions({
    queryKey: ["dashboard-summary", range],
    queryFn: () => fetchDashboardSummary(range),
    staleTime: 60 * 1000,
  });
}

// features/dashboard/hooks.ts
export function useDashboardSummary(range: DateRangeType) {
  return useQuery(dashboardSummaryQueryOptions(range));
}
```

**Karakteristik:**

- ✅ Menggunakan `queryOptions()` untuk reusability
- ✅ Lebih dekat dengan TanStack Query best practices
- ✅ Cache configuration di satu tempat
- ❌ Error handling berbeda dari Pattern A (throw Error vs AppError)
- ❌ Tidak ada custom `request()` helper
- ❌ Tidak konsisten dengan pattern lain

---

### Pattern C: Direct Server Component Fetch

**Digunakan oleh**: POS Bootstrap, Dashboard Bootstrap

**Flow:**

```
Server Component (page.tsx)
    ↓
server.ts (direct Supabase query)
    ↓
Supabase
```

**Contoh:**

```typescript
// app/dashboard/pos/page.tsx
export default async function PosPage() {
  const bootstrap = await getPosBootstrap(); // ← direct server call
  return <PosScreen {...bootstrap} />;
}

// features/pos/server.ts
export async function getPosBootstrap() {
  const supabase = await createServerClient();
  const menus = await loadMenus(supabase);
  const resellers = await loadResellers(supabase);
  return { menus, resellers };
}
```

**Karakteristik:**

- ✅ Tidak perlu API route (lebih efisien)
- ✅ Server-side rendering optimal
- ✅ Langsung ke Supabase tanpa middleware
- ❌ Tidak bisa digunakan di Client Components
- ❌ Tidak ada caching layer (React Query)

---

## Inconsistencies Found

### 1. **Duplikasi `request()` Helper**

Setiap feature memiliki `request()` function sendiri yang hampir identik:

```typescript
// features/orders/client.ts
async function request<T>(input: string, init: RequestInit) { ... }

// features/menus/client.ts
async function request<T>(input: string, init: RequestInit) { ... }

// features/resellers/client.ts
async function request<T>(input: string, init: RequestInit) { ... }

// ... 7 file lainnya
```

**Problem:**

- 🔴 Code duplication (10 file dengan kode identik)
- 🔴 Sulit maintenance jika ada perubahan error handling
- 🔴 Tidak ada centralized interceptor untuk auth/logging

---

### 2. **Inconsistent Error Handling**

**Pattern A** (client.ts):

```typescript
throw new AppError(
  payload.error?.code ?? response.status,
  payload.error?.message ?? "Request failed"
);
```

**Pattern B** (queries.ts):

```typescript
throw new Error(payload?.error?.message ?? fallbackMessage);
```

**Problem:**

- 🔴 Error type berbeda (`AppError` vs `Error`)
- 🔴 Error handling di UI harus handle 2 jenis error
- 🔴 Tidak konsisten antara feature

---

### 3. **Mixed Data Fetching Strategies**

| Feature       | Pattern | Has client.ts | Has queries.ts | Has hooks.ts |
| ------------- | ------- | ------------- | -------------- | ------------ |
| Orders        | A       | ✅            | ❌             | ✅           |
| Menus         | A       | ✅            | ❌             | ✅           |
| Dashboard     | B       | ❌            | ✅             | ✅           |
| Settings      | B       | ❌            | ✅             | ✅           |
| POS Bootstrap | C       | ❌            | ❌             | ❌           |

**Problem:**

- 🔴 Developer harus ingat pattern mana untuk feature apa
- 🔴 Onboarding developer baru jadi lebih lama
- 🔴 Tidak ada single source of truth untuk data fetching

---

### 4. **API Response Format Inconsistency**

**Format 1** (Most features):

```typescript
{
  data: T,
  error: { message: string, code?: number } | null,
  meta: Record<string, unknown> | null
}
```

**Format 2** (Dashboard):

```typescript
{
  data: { summary: DashboardSummary },
  error: { message: string },
  meta: { ... }
}
```

**Format 3** (Settings):

```typescript
{
  data: { settings: SettingsPayload },
  error: { message: string }
}
```

**Problem:**

- 🔴 Parsing response berbeda-beda
- 🔴 Type inference jadi kompleks
- 🔴 Sulit membuat generic helper

---

### 5. **Cache Strategy Tidak Konsisten**

**Dashboard:**

```typescript
staleTime: 60 * 1000,
refetchInterval: 60 * 1000,
refetchOnWindowFocus: true,
```

**Orders:**

```typescript
staleTime: 1000 * 5,
refetchOnWindowFocus: false,
```

**Settings:**

```typescript
staleTime: 5 * 60 * 1000,
// no refetch config
```

**Problem:**

- 🔴 Tidak ada standard cache policy
- 🔴 Beberapa feature over-fetch, beberapa under-fetch
- 🔴 Tidak ada dokumentasi kapan pakai strategy apa

---

## Recommendations

### 🎯 Priority 1: Standardize Data Fetching Pattern

**Pilih 1 pattern dan konsisten:**

#### Option A: Unified `client.ts` + `hooks.ts` Pattern (Recommended)

**Pros:**

- ✅ Separation of concerns (client = API calls, hooks = React Query)
- ✅ Mudah testing (mock client.ts)
- ✅ Familiar dengan developer yang sudah ada

**Implementation:**

```typescript
// lib/api/client.ts (NEW - centralized)
export async function apiRequest<T>(
  input: string,
  init?: RequestInit
): Promise<{ data: T; meta: Record<string, unknown> | null }> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Request failed"
    );
  }

  return { data: payload.data, meta: payload.meta ?? null };
}

// features/orders/client.ts (REFACTORED)
import { apiRequest } from "@/lib/api/client";

export async function listOrders(filters: OrderFilters) {
  const params = new URLSearchParams(/* ... */);
  const { data, meta } = await apiRequest<ListOrdersResponse>(
    `/api/pos/orders?${params}`
  );
  return { items: data.items, meta };
}
```

---

### 🎯 Priority 2: Standardize API Response Format

**Single format untuk semua API:**

```typescript
// lib/utils/api-response.ts (EXISTING - enforce usage)
type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

// Enforce di semua API routes:
export function ok<T>(data: T, options?: { meta?: Record<string, unknown> }) {
  return NextResponse.json({
    data,
    error: null,
    meta: options?.meta ?? null,
  });
}
```

**Rules:**

- ✅ `data` selalu berisi payload langsung (bukan `{ summary: ... }`)
- ✅ `error` selalu null jika success
- ✅ `meta` untuk pagination/filters

---

### 🎯 Priority 3: Define Cache Policies

**Create cache policy constants:**

```typescript
// lib/api/cache-policies.ts (NEW)
export const CACHE_POLICIES = {
  // Real-time data (orders, inventory)
  REALTIME: {
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Frequently changing (dashboard)
  FREQUENT: {
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  },

  // Rarely changing (settings, master data)
  STATIC: {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  },

  // Never refetch (user profile)
  PERMANENT: {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  },
} as const;

// Usage:
export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => listOrders(filters),
    ...CACHE_POLICIES.REALTIME, // ← consistent
  });
}
```

---

### 🎯 Priority 4: Eliminate Pattern C (Direct Server Fetch)

**Problem dengan Pattern C:**

- Tidak ada caching
- Tidak bisa invalidate dari client
- Tidak bisa optimistic updates

**Solution: Convert to Pattern A:**

```typescript
// BEFORE (Pattern C)
export default async function PosPage() {
  const bootstrap = await getPosBootstrap();
  return <PosScreen {...bootstrap} />;
}

// AFTER (Pattern A)
export default async function PosPage() {
  const bootstrap = await getPosBootstrap(); // ← still SSR
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PosScreen initialData={bootstrap} />
    </HydrationBoundary>
  );
}

// PosScreen.tsx (client component)
function PosScreen({ initialData }) {
  const { data } = usePosBootstrap({ initialData }); // ← now cached
  // ...
}
```

---

### 🎯 Priority 5: Create API Client Abstraction

**Centralized API client dengan interceptors:**

```typescript
// lib/api/client.ts
class ApiClient {
  private baseUrl = "";

  async get<T>(url: string, params?: Record<string, string>) {
    const searchParams = new URLSearchParams(params);
    return this.request<T>(`${url}?${searchParams}`);
  }

  async post<T>(url: string, body?: unknown) {
    return this.request<T>(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private async request<T>(url: string, init?: RequestInit) {
    // Centralized error handling
    // Centralized auth token injection
    // Centralized logging
    // ...
  }
}

export const apiClient = new ApiClient();

// Usage:
export async function listOrders(filters: OrderFilters) {
  return apiClient.get<ListOrdersResponse>("/api/pos/orders", filters);
}
```

---

## Migration Plan

### Phase 1: Foundation (Week 1)

1. ✅ Create `lib/api/client.ts` - centralized API client
2. ✅ Create `lib/api/cache-policies.ts` - cache constants
3. ✅ Update `lib/utils/api-response.ts` - enforce format

### Phase 2: Refactor High-Traffic Features (Week 2-3)

1. ✅ Orders (most critical)
2. ✅ Dashboard
3. ✅ POS

### Phase 3: Refactor Remaining Features (Week 4-5)

1. ✅ Menus
2. ✅ Inventory
3. ✅ Procurement
4. ✅ Users & Settings

### Phase 4: Cleanup (Week 6)

1. ✅ Remove old `request()` functions
2. ✅ Update documentation
3. ✅ Add tests

---

## Benefits After Refactoring

### Developer Experience

- ✅ **Single pattern** untuk semua features
- ✅ **Predictable** - developer tahu dimana cari apa
- ✅ **Faster onboarding** - cukup pelajari 1 pattern

### Maintainability

- ✅ **DRY** - no code duplication
- ✅ **Centralized changes** - update 1 file, semua feature terpengaruh
- ✅ **Easier debugging** - single point of failure

### Performance

- ✅ **Consistent caching** - no over/under fetching
- ✅ **Optimized re-renders** - proper staleTime
- ✅ **Better UX** - predictable loading states

### Type Safety

- ✅ **End-to-end types** - dari API route sampai UI
- ✅ **Compile-time errors** - catch bugs sebelum runtime
- ✅ **Better IDE support** - autocomplete everywhere

---

## Conclusion

Current data flow memiliki **3 pattern berbeda** yang menyebabkan:

- 🔴 Code duplication (10+ files)
- 🔴 Inconsistent error handling
- 🔴 Mixed cache strategies
- 🔴 Confusing untuk developer baru

**Recommended action:**

1. Standardize ke **Pattern A** (client.ts + hooks.ts)
2. Create **centralized API client**
3. Define **cache policies**
4. Migrate secara **bertahap** (6 weeks)

**Expected outcome:**

- ✅ 80% reduction in boilerplate code
- ✅ Consistent developer experience
- ✅ Easier to add new features
- ✅ Better performance & UX
