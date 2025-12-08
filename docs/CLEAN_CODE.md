# Clean Code Principles

**Panduan clean code untuk Data Flow Standardization**

> 📌 Semua kode yang ditulis harus mengikuti prinsip-prinsip ini tanpa kompromi.

---

## Core Principles

### 1. **Single Responsibility Principle (SRP)**

Setiap function/class hanya punya 1 tanggung jawab.

```typescript
// ❌ BAD - Multiple responsibilities
async function handleOrder(orderId: string) {
  const order = await fetchOrder(orderId);
  const validated = validateOrder(order);
  await saveToDatabase(validated);
  await sendEmail(order.customer);
  return order;
}

// ✅ GOOD - Single responsibility per function
async function fetchOrder(orderId: string) {
  return apiClient.get<Order>(`/api/orders/${orderId}`);
}

async function validateOrder(order: Order) {
  return orderSchema.parse(order);
}

async function saveOrder(order: Order) {
  return apiClient.post("/api/orders", order);
}
```

---

### 2. **DRY (Don't Repeat Yourself)**

Tidak ada duplikasi kode.

```typescript
// ❌ BAD - Duplicate request logic
async function getProduct(id: string) {
  const response = await fetch(`/api/products/${id}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

async function getOrder(id: string) {
  const response = await fetch(`/api/orders/${id}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

// ✅ GOOD - Centralized logic
export async function getProduct(id: string) {
  return apiClient.get<Product>(`/api/products/${id}`);
}

export async function getOrder(id: string) {
  return apiClient.get<Order>(`/api/orders/${id}`);
}
```

---

### 3. **Meaningful Names**

Nama variable/function harus jelas dan deskriptif.

```typescript
// ❌ BAD
const d = new Date();
const arr = data.map(x => x.id);
function proc(val: any) { ... }

// ✅ GOOD
const currentDate = new Date();
const productIds = products.map(product => product.id);
function processPayment(amount: number) { ... }
```

---

### 4. **Small Functions**

Function harus kecil (max 20 lines) dan fokus.

```typescript
// ❌ BAD - Too long
function createOrder(input: CreateOrderInput) {
  // 50+ lines of logic
  const validated = validate(input);
  const items = input.items.map(...);
  const totals = calculateTotals(items);
  const order = { ...validated, items, totals };
  const saved = await saveOrder(order);
  await updateInventory(items);
  await sendNotification(saved);
  return saved;
}

// ✅ GOOD - Small, focused functions
function createOrder(input: CreateOrderInput) {
  const validated = validateOrderInput(input);
  const order = buildOrderFromInput(validated);
  return saveOrderWithSideEffects(order);
}

function buildOrderFromInput(input: ValidatedOrderInput) {
  const items = mapOrderItems(input.items);
  const totals = calculateOrderTotals(items);
  return { ...input, items, totals };
}

async function saveOrderWithSideEffects(order: Order) {
  const saved = await saveOrder(order);
  await Promise.all([
    updateInventory(order.items),
    sendOrderNotification(saved),
  ]);
  return saved;
}
```

---

### 5. **No Magic Numbers/Strings**

Gunakan constants dengan nama yang jelas.

```typescript
// ❌ BAD
if (user.role === "admin" || user.role === "manager") {
  // ...
}
setTimeout(() => refetch(), 60000);

// ✅ GOOD
const ADMIN_ROLES = ["admin", "manager"] as const;
const REFETCH_INTERVAL_MS = 60 * 1000;

if (ADMIN_ROLES.includes(user.role)) {
  // ...
}
setTimeout(() => refetch(), REFETCH_INTERVAL_MS);
```

---

### 6. **Type Safety**

Hindari `any`, gunakan proper types.

```typescript
// ❌ BAD
function processData(data: any) {
  return data.items.map((item: any) => item.id);
}

// ✅ GOOD
type DataResponse = {
  items: Array<{ id: string; name: string }>;
};

function processData(data: DataResponse): string[] {
  return data.items.map((item) => item.id);
}
```

---

### 7. **Error Handling**

Explicit error handling, no silent failures.

```typescript
// ❌ BAD
async function fetchUser(id: string) {
  try {
    return await apiClient.get(`/api/users/${id}`);
  } catch {
    return null; // Silent failure
  }
}

// ✅ GOOD
async function fetchUser(id: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/api/users/${id}`);
  return data;
}

// Let errors propagate, handle at appropriate level
function UserProfile({ userId }: { userId: string }) {
  const { data, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
  });

  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Loading />;
  return <Profile user={data} />;
}
```

---

### 8. **Consistent Formatting**

Gunakan Prettier/ESLint, format konsisten.

```typescript
// ✅ GOOD - Consistent formatting
export async function listProducts(
  filters: ProductFilters = {}
): Promise<ProductListResponse> {
  const { data, meta } = await apiClient.get<ProductListResponse>(
    "/api/products",
    filters as Record<string, string>
  );

  return {
    items: data.items,
    meta,
  };
}
```

---

### 9. **Comments Only When Necessary**

Code should be self-documenting. Comments untuk "why", bukan "what".

```typescript
// ❌ BAD - Obvious comment
// Get user by ID
function getUserById(id: string) { ... }

// ❌ BAD - Commented code
// const oldLogic = () => { ... }

// ✅ GOOD - Explains "why"
// We use exponential backoff here because the payment gateway
// has rate limiting that requires increasing delays between retries
async function retryPayment(attempt: number) {
  const delay = Math.pow(2, attempt) * 1000;
  await sleep(delay);
  return processPayment();
}

// ✅ GOOD - JSDoc for public API
/**
 * Fetches paginated list of products with optional filters.
 *
 * @param filters - Optional filters for search, status, category
 * @returns Promise resolving to products list with pagination metadata
 * @throws {AppError} When API request fails
 */
export async function listProducts(
  filters: ProductFilters = {}
): Promise<ProductListResponse> {
  // ...
}
```

---

### 10. **Immutability**

Prefer `const`, avoid mutations.

```typescript
// ❌ BAD
let total = 0;
items.forEach((item) => {
  total += item.price;
});

// ✅ GOOD
const total = items.reduce((sum, item) => sum + item.price, 0);

// ❌ BAD
function addItem(cart: Cart, item: Item) {
  cart.items.push(item); // Mutation
  return cart;
}

// ✅ GOOD
function addItem(cart: Cart, item: Item): Cart {
  return {
    ...cart,
    items: [...cart.items, item],
  };
}
```

---

## File Organization

### Structure

```
features/
  products/
    types.ts          # Types only
    schemas.ts        # Zod schemas only
    constants.ts      # Constants only
    utils.ts          # Pure utility functions
    client.ts         # API calls only
    hooks.ts          # React Query hooks only
    server.ts         # Server-side logic only
    mappers.ts        # Data transformation only
```

### Import Order

```typescript
// 1. External dependencies
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

// 2. Internal absolute imports (@/)
import { apiClient } from "@/lib/api/client";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";

// 3. Relative imports
import type { Product, ProductFilters } from "./types";
import { productSchema } from "./schemas";

// 4. Type-only imports last
import type { ReactNode } from "react";
```

---

## Naming Conventions

### Files

```
✅ kebab-case.ts
✅ PascalCase.tsx (React components)
❌ snake_case.ts
❌ camelCase.ts
```

### Variables & Functions

```typescript
// ✅ camelCase
const userName = 'John';
function getUserById(id: string) { ... }

// ❌ snake_case
const user_name = 'John';
function get_user_by_id(id: string) { ... }
```

### Types & Interfaces

```typescript
// ✅ PascalCase
type User = { ... };
interface ProductFilters { ... }

// ❌ camelCase
type user = { ... };
interface productFilters { ... }
```

### Constants

```typescript
// ✅ UPPER_SNAKE_CASE for true constants
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// ✅ UPPER_SNAKE_CASE or PascalCase for enums/objects
const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;

const CACHE_POLICIES = { ... } as const;
```

---

## Code Review Checklist

Setiap PR harus pass checklist ini:

### ✅ General

- [ ] No `console.log` (use proper logging)
- [ ] No `any` types
- [ ] No unused imports
- [ ] No unused variables
- [ ] No commented code
- [ ] Prettier formatted
- [ ] ESLint passes

### ✅ Functions

- [ ] Max 20 lines per function
- [ ] Single responsibility
- [ ] Meaningful names
- [ ] Proper error handling
- [ ] Type-safe parameters & return

### ✅ Files

- [ ] Max 300 lines per file
- [ ] Single purpose per file
- [ ] Proper imports order
- [ ] Exports at bottom

### ✅ React

- [ ] No inline functions in JSX (use useCallback)
- [ ] Proper dependency arrays
- [ ] No unnecessary re-renders
- [ ] Proper key props in lists

### ✅ API

- [ ] Uses `apiClient`
- [ ] Uses `CACHE_POLICIES`
- [ ] Proper error types (`AppError`)
- [ ] Type-safe responses

---

## Anti-Patterns to Avoid

### 1. God Objects/Functions

```typescript
// ❌ BAD - God object
const utils = {
  formatDate: () => {},
  validateEmail: () => {},
  calculateTotal: () => {},
  sendEmail: () => {},
  // ... 50 more functions
};

// ✅ GOOD - Separate modules
// date-utils.ts
export function formatDate() {}

// email-utils.ts
export function validateEmail() {}
export function sendEmail() {}

// calculation-utils.ts
export function calculateTotal() {}
```

### 2. Callback Hell

```typescript
// ❌ BAD
getData(id, (data) => {
  processData(data, (processed) => {
    saveData(processed, (saved) => {
      sendNotification(saved, (sent) => {
        // ...
      });
    });
  });
});

// ✅ GOOD
const data = await getData(id);
const processed = await processData(data);
const saved = await saveData(processed);
await sendNotification(saved);
```

### 3. Premature Optimization

```typescript
// ❌ BAD - Over-optimized, hard to read
const t = d.r((s, i) => s + i.p * i.q, 0);

// ✅ GOOD - Clear first, optimize if needed
const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
```

### 4. Boolean Trap

```typescript
// ❌ BAD
function setUser(name: string, isActive: boolean, isAdmin: boolean) {}
setUser("John", true, false); // What does true/false mean?

// ✅ GOOD
type UserOptions = {
  name: string;
  status: "active" | "inactive";
  role: "admin" | "user";
};

function setUser(options: UserOptions) {}
setUser({ name: "John", status: "active", role: "user" });
```

---

## Performance Best Practices

### 1. Memoization

```typescript
// ✅ Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return items.reduce((acc, item) => {
    // Complex calculation
    return acc + complexCalculation(item);
  }, 0);
}, [items]);

// ✅ Use useCallback for functions passed as props
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);
```

### 2. Lazy Loading

```typescript
// ✅ Lazy load heavy components
const HeavyChart = lazy(() => import("./HeavyChart"));

function Dashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

### 3. Debouncing

```typescript
// ✅ Debounce search inputs
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  if (debouncedSearch) {
    fetchResults(debouncedSearch);
  }
}, [debouncedSearch]);
```

---

## Testing Standards

### Unit Tests

```typescript
// ✅ GOOD - Clear test structure
describe("listProducts", () => {
  it("should fetch products with filters", async () => {
    // Arrange
    const filters = { status: "active" };
    const mockResponse = { data: { items: [] }, meta: null };
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    // Act
    const result = await listProducts(filters);

    // Assert
    expect(apiClient.get).toHaveBeenCalledWith("/api/products", filters);
    expect(result.items).toEqual([]);
  });

  it("should handle errors gracefully", async () => {
    // Arrange
    const error = new AppError(500, "Server error");
    vi.mocked(apiClient.get).mockRejectedValue(error);

    // Act & Assert
    await expect(listProducts()).rejects.toThrow("Server error");
  });
});
```

---

## Documentation Standards

### JSDoc

````typescript
/**
 * Fetches a paginated list of products with optional filtering.
 *
 * @param filters - Optional filters for search, status, and category
 * @param filters.search - Search term for product name or SKU
 * @param filters.status - Filter by active/inactive status
 * @param filters.categoryId - Filter by category UUID
 * @param filters.page - Page number (1-indexed)
 * @param filters.pageSize - Items per page (max 100)
 *
 * @returns Promise resolving to products list with pagination metadata
 *
 * @throws {AppError} When API request fails or validation errors occur
 *
 * @example
 * ```typescript
 * const { items, meta } = await listProducts({
 *   search: 'coffee',
 *   status: 'active',
 *   page: 1,
 *   pageSize: 20,
 * });
 * ```
 */
export async function listProducts(
  filters: ProductFilters = {}
): Promise<ProductListResponse> {
  // ...
}
````

---

## Summary

### ✅ Always Do

1. Single responsibility per function/file
2. Meaningful, descriptive names
3. Type-safe code (no `any`)
4. Proper error handling
5. Immutable data structures
6. Small, focused functions
7. Consistent formatting
8. Clear documentation

### ❌ Never Do

1. Duplicate code
2. Magic numbers/strings
3. Silent error swallowing
4. Mutations
5. God objects/functions
6. Commented code
7. Unused imports/variables
8. `console.log` in production

---

**Principle**: Code is read 10x more than it's written. Optimize for readability.
