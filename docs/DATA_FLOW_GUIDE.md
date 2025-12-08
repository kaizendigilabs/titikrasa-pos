# Data Flow Standard Guide

**Panduan standar untuk implementasi data flow di Titikrasa POS**

> 📌 **Tujuan**: Memastikan semua feature menggunakan pattern yang konsisten, mudah di-maintain, dan tidak ada redundancy.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Standard Pattern](#standard-pattern)
3. [File Structure](#file-structure)
4. [Implementation Steps](#implementation-steps)
5. [Code Examples](#code-examples)
6. [Cache Policies](#cache-policies)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Checklist](#checklist)

---

## Quick Start

### Untuk Menambah Feature Baru

```bash
# 1. Buat folder di features/
mkdir -p features/new-feature

# 2. Buat file-file standar:
touch features/new-feature/types.ts
touch features/new-feature/schemas.ts
touch features/new-feature/client.ts
touch features/new-feature/hooks.ts
touch features/new-feature/server.ts

# 3. Buat API route:
mkdir -p app/api/new-feature
touch app/api/new-feature/route.ts
```

---

## Standard Pattern

**✅ GUNAKAN PATTERN INI untuk semua feature:**

```
UI Component
    ↓
hooks.ts (useQuery/useMutation)
    ↓
client.ts (API calls via centralized client)
    ↓
API Route (app/api/*)
    ↓
server.ts (business logic)
    ↓
Supabase
```

**❌ JANGAN:**

- ❌ Langsung fetch dari component
- ❌ Buat custom `request()` function di setiap feature
- ❌ Bypass API route (kecuali untuk SSR initial data)
- ❌ Campur business logic di API route

---

## File Structure

### 1. `features/{feature-name}/types.ts`

**Purpose**: Type definitions untuk feature

```typescript
// features/products/types.ts
import type { Database } from "@/lib/types/database";

// Raw database type
export type RawProductRow = Database["public"]["Tables"]["products"]["Row"];

// Frontend-friendly type
export type Product = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  createdAt: string;
};

// Filter type
export type ProductFilters = {
  search?: string;
  status?: "active" | "inactive" | "all";
  categoryId?: string;
  page?: number;
  pageSize?: number;
};

// List response type
export type ProductListResponse = {
  items: Product[];
};
```

---

### 2. `features/{feature-name}/schemas.ts`

**Purpose**: Zod schemas untuk validation

```typescript
// features/products/schemas.ts
import { z } from "zod";

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  categoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().min(0),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type ProductFilters = z.infer<typeof productFiltersSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
```

---

### 3. `features/{feature-name}/client.ts`

**Purpose**: API calls menggunakan centralized client

```typescript
// features/products/client.ts
import { apiClient } from "@/lib/api/client";
import type {
  Product,
  ProductListResponse,
  ProductFilters,
  CreateProductInput,
  UpdateProductInput,
} from "./types";

export async function listProducts(filters: ProductFilters = {}) {
  const { data, meta } = await apiClient.get<ProductListResponse>(
    "/api/products",
    filters as Record<string, string>
  );
  return { items: data.items, meta };
}

export async function getProduct(productId: string) {
  const { data } = await apiClient.get<Product>(`/api/products/${productId}`);
  return data;
}

export async function createProduct(input: CreateProductInput) {
  const { data } = await apiClient.post<Product>("/api/products", input);
  return data;
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput
) {
  const { data } = await apiClient.patch<Product>(
    `/api/products/${productId}`,
    input
  );
  return data;
}

export async function deleteProduct(productId: string) {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/api/products/${productId}`
  );
  return data.success;
}
```

**❌ JANGAN buat custom `request()` function!**

---

### 4. `features/{feature-name}/hooks.ts`

**Purpose**: React Query hooks

```typescript
// features/products/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import * as client from "./client";
import type {
  ProductFilters,
  CreateProductInput,
  UpdateProductInput,
} from "./types";

// Query keys
const PRODUCTS_KEY = "products";

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, filters],
    queryFn: () => client.listProducts(filters),
    ...CACHE_POLICIES.FREQUENT, // ← Use predefined policy
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, productId],
    queryFn: () => client.getProduct(productId),
    ...CACHE_POLICIES.FREQUENT,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => client.createProduct(input),
    onSuccess: () => {
      // Invalidate list queries
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: UpdateProductInput;
    }) => client.updateProduct(productId, input),
    onSuccess: (_, variables) => {
      // Invalidate specific product
      void queryClient.invalidateQueries({
        queryKey: [PRODUCTS_KEY, variables.productId],
      });
      // Invalidate list
      void queryClient.invalidateQueries({
        queryKey: [PRODUCTS_KEY],
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => client.deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}
```

---

### 5. `features/{feature-name}/server.ts`

**Purpose**: Server-side business logic

```typescript
// features/products/server.ts
import type { ActorContext } from "@/features/users/server";
import { appError, ERR } from "@/lib/utils/errors";
import type { Product, ProductFilters, CreateProductInput } from "./types";

export async function fetchProducts(
  actor: ActorContext,
  filters: ProductFilters
) {
  let query = actor.supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  // Pagination
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memuat produk",
      details: { hint: error.message },
    });
  }

  return {
    items: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
    },
  };
}

export async function createProduct(
  actor: ActorContext,
  input: CreateProductInput
) {
  const { data, error } = await actor.supabase
    .from("products")
    .insert({
      name: input.name,
      price: input.price,
      category_id: input.categoryId ?? null,
      is_active: input.isActive ?? true,
    })
    .select()
    .single();

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal membuat produk",
      details: { hint: error.message },
    });
  }

  return data;
}
```

---

### 6. `app/api/{feature-name}/route.ts`

**Purpose**: API route handler (thin layer)

```typescript
// app/api/products/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireActor, ensureAdminOrManager } from "@/features/users/server";
import { fetchProducts, createProduct } from "@/features/products/server";
import {
  productFiltersSchema,
  createProductSchema,
} from "@/features/products/schemas";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = productFiltersSchema.parse(params);

    const result = await fetchProducts(actor, filters);

    return ok(
      { items: result.items },
      { meta: { pagination: result.pagination } }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Parameter tidak valid",
          details: { issues: error.issues },
        })
      );
    }
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const payload = await request.json();
    const input = createProductSchema.parse(payload);

    const product = await createProduct(actor, input);

    return ok(product, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Input tidak valid",
          details: { issues: error.issues },
        })
      );
    }
    return fail(error);
  }
}
```

**✅ DO:**

- ✅ Thin layer - hanya handle request/response
- ✅ Validation dengan Zod
- ✅ Authorization check
- ✅ Consistent error handling
- ✅ Use `ok()` dan `fail()` helpers

**❌ DON'T:**

- ❌ Business logic di route handler
- ❌ Direct database query
- ❌ Custom error format

---

## Cache Policies

**Gunakan predefined policies dari `lib/api/cache-policies.ts`:**

```typescript
// lib/api/cache-policies.ts
export const CACHE_POLICIES = {
  // Real-time data (orders, inventory stock)
  REALTIME: {
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Frequently changing (dashboard, reports)
  FREQUENT: {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Rarely changing (settings, master data)
  STATIC: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Never refetch (user profile, constants)
  PERMANENT: {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
} as const;
```

### Kapan Pakai Policy Apa?

| Data Type                         | Policy      | Example              |
| --------------------------------- | ----------- | -------------------- |
| Order status, Stock level         | `REALTIME`  | Orders, Inventory    |
| Dashboard metrics, Reports        | `FREQUENT`  | Dashboard, Analytics |
| Menu items, Categories, Suppliers | `STATIC`    | Menus, Categories    |
| App settings, User profile        | `PERMANENT` | Settings, Profile    |

---

## Error Handling

### Standard Error Flow

```typescript
// 1. Server throws AppError
throw appError(ERR.NOT_FOUND, {
  message: "Produk tidak ditemukan",
});

// 2. API route catches and returns fail()
return fail(error);

// 3. Client receives AppError
// 4. React Query onError handles it
// 5. UI shows error toast/message
```

### Error Types

```typescript
// lib/utils/errors.ts
export const ERR = {
  VALIDATION_ERROR: { statusCode: 400 },
  UNAUTHORIZED: { statusCode: 401 },
  FORBIDDEN: { statusCode: 403 },
  NOT_FOUND: { statusCode: 404 },
  CONFLICT: { statusCode: 409 },
  SERVER_ERROR: { statusCode: 500 },
} as const;
```

### Usage in Hooks

```typescript
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.createProduct,
    onSuccess: () => {
      toast.success("Produk berhasil dibuat");
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
    onError: (error) => {
      // AppError automatically handled by global error handler
      // Or handle specific errors:
      if (error instanceof AppError) {
        if (error.statusCode === 409) {
          toast.error("Produk dengan nama ini sudah ada");
        } else {
          toast.error(error.message);
        }
      }
    },
  });
}
```

---

## Testing

### Unit Test untuk `client.ts`

```typescript
// features/products/client.test.ts
import { describe, it, expect, vi } from "vitest";
import * as client from "./client";
import { apiClient } from "@/lib/api/client";

vi.mock("@/lib/api/client");

describe("Products Client", () => {
  it("should list products", async () => {
    const mockResponse = {
      data: { items: [{ id: "1", name: "Product 1" }] },
      meta: null,
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    const result = await client.listProducts({ status: "active" });

    expect(apiClient.get).toHaveBeenCalledWith("/api/products", {
      status: "active",
    });
    expect(result.items).toHaveLength(1);
  });
});
```

### Integration Test untuk API Route

```typescript
// app/api/products/route.test.ts
import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/products", () => {
  it("should return products list", async () => {
    const request = new Request("http://localhost/api/products?status=active");
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items).toBeDefined();
    expect(data.error).toBeNull();
  });
});
```

---

## Checklist

Gunakan checklist ini setiap kali menambah feature baru:

### ✅ File Structure

- [ ] `features/{feature}/types.ts` - Type definitions
- [ ] `features/{feature}/schemas.ts` - Zod schemas
- [ ] `features/{feature}/client.ts` - API calls
- [ ] `features/{feature}/hooks.ts` - React Query hooks
- [ ] `features/{feature}/server.ts` - Business logic
- [ ] `app/api/{feature}/route.ts` - API route

### ✅ Implementation

- [ ] Menggunakan `apiClient` dari `@/lib/api/client`
- [ ] Tidak ada custom `request()` function
- [ ] Menggunakan predefined `CACHE_POLICIES`
- [ ] Error handling dengan `AppError`
- [ ] API response menggunakan `ok()` dan `fail()`
- [ ] Validation dengan Zod schemas
- [ ] Authorization check di API route

### ✅ Code Quality

- [ ] Type-safe (no `any` types)
- [ ] Consistent naming (camelCase untuk functions/variables)
- [ ] Proper error messages (Bahasa Indonesia)
- [ ] Comments untuk complex logic
- [ ] No console.log (use proper logging)

### ✅ Testing

- [ ] Unit tests untuk `client.ts`
- [ ] Integration tests untuk API routes
- [ ] Manual testing di UI

### ✅ Documentation

- [ ] Update README jika perlu
- [ ] Add JSDoc comments untuk public functions
- [ ] Update API documentation

---

## Common Patterns

### Pattern: List with Pagination

```typescript
// hooks.ts
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => client.listProducts(filters),
    ...CACHE_POLICIES.FREQUENT,
    placeholderData: keepPreviousData, // ← Keep previous data while loading
  });
}

// Component
function ProductList() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20 });
  const { data, isLoading } = useProducts(filters);

  return (
    <div>
      {data?.items.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
      <Pagination
        page={filters.page}
        total={data?.meta?.pagination?.total ?? 0}
        onChange={(page) => setFilters({ ...filters, page })}
      />
    </div>
  );
}
```

### Pattern: Optimistic Updates

```typescript
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, input }) =>
      client.updateProduct(productId, input),

    // Optimistic update
    onMutate: async ({ productId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products", productId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(["products", productId]);

      // Optimistically update
      queryClient.setQueryData(["products", productId], (old: any) => ({
        ...old,
        ...input,
      }));

      return { previous };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["products", variables.productId],
          context.previous
        );
      }
    },

    // Refetch on success
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["products", variables.productId],
      });
    },
  });
}
```

### Pattern: Dependent Queries

```typescript
// Fetch product details, then fetch related items
export function useProductWithRelated(productId: string) {
  const productQuery = useProduct(productId);

  const relatedQuery = useQuery({
    queryKey: ["products", productId, "related"],
    queryFn: () => client.getRelatedProducts(productId),
    enabled: !!productQuery.data, // ← Only fetch when product is loaded
    ...CACHE_POLICIES.STATIC,
  });

  return {
    product: productQuery.data,
    related: relatedQuery.data,
    isLoading: productQuery.isLoading || relatedQuery.isLoading,
  };
}
```

### Pattern: Infinite Scroll

```typescript
export function useInfiniteProducts(filters: Omit<ProductFilters, "page">) {
  return useInfiniteQuery({
    queryKey: ["products", "infinite", filters],
    queryFn: ({ pageParam = 1 }) =>
      client.listProducts({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.meta?.pagination?.total ?? 0;
      const loaded = allPages.length * (filters.pageSize ?? 20);
      return loaded < total ? allPages.length + 1 : undefined;
    },
    ...CACHE_POLICIES.FREQUENT,
  });
}

// Component
function InfiniteProductList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteProducts({ status: "active" });

  return (
    <div>
      {data?.pages.map((page) =>
        page.items.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

---

## Migration Guide

### Migrating Existing Feature

Jika ada feature yang masih pakai pattern lama:

#### Step 1: Create `lib/api/client.ts` (if not exists)

```typescript
// lib/api/client.ts
import { AppError, ERR } from "@/lib/utils/errors";

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

class ApiClient {
  private async request<T>(
    url: string,
    init?: RequestInit
  ): Promise<{ data: T; meta: Record<string, unknown> | null }> {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    let payload: ApiResponse<T> | null = null;
    try {
      payload = await response.json();
    } catch (error) {
      throw new AppError(
        ERR.SERVER_ERROR.statusCode,
        error instanceof Error ? error.message : "Unexpected response"
      );
    }

    if (!response.ok || payload.error) {
      throw new AppError(
        payload.error?.code ?? response.status,
        payload.error?.message ?? "Request failed"
      );
    }

    return { data: payload.data, meta: payload.meta ?? null };
  }

  async get<T>(url: string, params?: Record<string, string>) {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    return this.request<T>(`${url}${queryString ? `?${queryString}` : ""}`);
  }

  async post<T>(url: string, body?: unknown) {
    return this.request<T>(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(url: string, body?: unknown) {
    return this.request<T>(url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(url: string) {
    return this.request<T>(url, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
```

#### Step 2: Update `client.ts`

```typescript
// BEFORE
async function request<T>(input: string, init: RequestInit) {
  // ... custom implementation
}

export async function listProducts(filters: ProductFilters) {
  const response = await request<ProductListResponse>("/api/products", {
    method: "GET",
  });
  return response.data;
}

// AFTER
import { apiClient } from "@/lib/api/client";

export async function listProducts(filters: ProductFilters) {
  const { data, meta } = await apiClient.get<ProductListResponse>(
    "/api/products",
    filters as Record<string, string>
  );
  return { items: data.items, meta };
}
```

#### Step 3: Update `hooks.ts`

```typescript
// BEFORE
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => listProducts(filters),
    staleTime: 30000, // ← hardcoded
  });
}

// AFTER
import { CACHE_POLICIES } from "@/lib/api/cache-policies";

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => listProducts(filters),
    ...CACHE_POLICIES.FREQUENT, // ← use policy
  });
}
```

#### Step 4: Remove old `request()` function

```typescript
// DELETE THIS:
async function request<T>(input: string, init: RequestInit) {
  // ...
}
```

---

## FAQ

### Q: Kapan boleh bypass API route dan langsung ke Supabase?

**A:** Hanya untuk **Server Components** yang butuh initial data untuk SSR:

```typescript
// app/products/page.tsx (Server Component)
export default async function ProductsPage() {
  const supabase = await createServerClient();
  const { data } = await supabase.from("products").select("*").limit(10);

  return <ProductList initialData={data} />;
}

// ProductList.tsx (Client Component)
function ProductList({ initialData }) {
  const { data } = useProducts({
    initialData, // ← Use as initial data
  });
  // ...
}
```

### Q: Bagaimana handle file upload?

**A:** Gunakan `FormData` dan custom header:

```typescript
// client.ts
export async function uploadProductImage(productId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/products/${productId}/image`, {
    method: "POST",
    body: formData, // ← No JSON.stringify
    // No Content-Type header (browser sets it automatically)
  });

  const payload = await response.json();
  if (!response.ok) throw new AppError(response.status, payload.error.message);
  return payload.data;
}
```

### Q: Bagaimana handle realtime updates?

**A:** Gunakan Supabase Realtime di hooks:

```typescript
export function useProductsRealtime(filters: ProductFilters) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          // Invalidate queries when data changes
          void queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
```

### Q: Bagaimana handle authentication?

**A:** Auth sudah di-handle di `requireActor()`:

```typescript
// API route
export async function GET(request: NextRequest) {
  const actor = await requireActor(); // ← Throws if not authenticated
  ensureAdminOrManager(actor.roles); // ← Check permissions
  // ...
}
```

---

## Summary

### ✅ DO

1. ✅ Gunakan `apiClient` untuk semua API calls
2. ✅ Gunakan predefined `CACHE_POLICIES`
3. ✅ Throw `AppError` untuk semua errors
4. ✅ Return dengan `ok()` dan `fail()` di API routes
5. ✅ Validate dengan Zod schemas
6. ✅ Keep API routes thin (delegate ke `server.ts`)
7. ✅ Invalidate queries after mutations
8. ✅ Use TypeScript strictly (no `any`)

### ❌ DON'T

1. ❌ Buat custom `request()` function
2. ❌ Hardcode cache config
3. ❌ Throw generic `Error`
4. ❌ Return custom response format
5. ❌ Skip validation
6. ❌ Put business logic di API routes
7. ❌ Forget to invalidate cache
8. ❌ Use `any` types

---

**Last Updated**: 2025-12-08  
**Version**: 1.0.0
