# Shared Utilities Specification

To support the overhaul, we will centralise repeated logic into shared utilities. This specification details the API surface and implementation guidelines for the HTTP client, Supabase realtime helper, and schema-driven form factory.

## HTTP Client (`lib/api/client.ts`)

### Goals
- Provide a single Fetch wrapper with consistent error handling and JSON parsing.
- Support server-side (Next.js Route Handlers) and client-side usage.
- Integrate with TanStack Query by exposing typed request helpers (`get`, `post`, `put`, `patch`, `del`).

### API Design
```ts
export interface ApiRequestOptions<TBody = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  schema?: ZodSchema<any>; // optional response validation
  signal?: AbortSignal;
}

export async function apiRequest<TResponse>(
  path: string,
  options?: ApiRequestOptions
): Promise<TResponse>;

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T, B = unknown>(path: string, options?: ApiRequestOptions<B>) => apiRequest<T>(path, { ...options, method: "POST" }),
  put: <T, B = unknown>(path: string, options?: ApiRequestOptions<B>) => apiRequest<T>(path, { ...options, method: "PUT" }),
  patch: <T, B = unknown>(path: string, options?: ApiRequestOptions<B>) => apiRequest<T>(path, { ...options, method: "PATCH" }),
  del: <T>(path: string, options?: ApiRequestOptions) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};
```

### Behaviour
- Automatically inject JSON `Content-Type` for non-GET requests when the body is a plain object.
- Serialise `query` params and append to URL.
- Parse JSON responses; if `schema` is provided, validate the response and throw `AppError` when invalid.
- Map HTTP errors into `AppError` using `lib/api/errors.ts` (e.g., `status`, `code`, `message`).
- Support Supabase auth by attaching session tokens (via callback or dependency injection) when required.

### Migration Checklist
- Replace feature-specific `request` helpers with `apiClient` usage.
- Ensure tests cover error mapping and schema validation.
- Document usage examples in `docs/overhaul/module-boundaries.md` reference appendix.

## Supabase Realtime Helper (`lib/supabase/realtime.ts`)

### Goals
- Abstract Supabase channel subscription boilerplate.
- Provide a consistent way to synchronise realtime events with TanStack Query caches.
- Allow features to plug in entity mappers and cache update strategies.

### API Design
```ts
export interface RealtimeSubscriptionOptions<TRecord, TEntity> {
  channel: string;
  table: string;
  schema?: string;
  eventTypes?: Array<"INSERT" | "UPDATE" | "DELETE">;
  mapRecord: (record: TRecord) => TEntity;
  onInsert?: (entity: TEntity) => void;
  onUpdate?: (entity: TEntity) => void;
  onDelete?: (entity: TEntity) => void;
}

export function createRealtimeSubscription<TRecord, TEntity>(
  client: SupabaseClient,
  options: RealtimeSubscriptionOptions<TRecord, TEntity>
): () => void;
```

### TanStack Query Integration
Provide helper utilities:
```ts
export function connectQueryCache<TRecord, TEntity>(params: {
  queryClient: QueryClient;
  queryKey: QueryKey;
  options: RealtimeSubscriptionOptions<TRecord, TEntity>;
  merge: (draft: TEntity[], entity: TEntity) => void;
  replace: (draft: TEntity[], entity: TEntity) => void;
  remove: (draft: TEntity[], entity: TEntity) => void;
}): () => void;
```
- Internally uses `immer` or shallow copy to update cached arrays.
- Returns an unsubscribe function to be used inside React `useEffect` or server-side listeners.

### Migration Checklist
- Replace inline `supabase.channel(...).on(...).subscribe()` blocks with `createRealtimeSubscription`.
- Use `connectQueryCache` in feature hooks to keep query data in sync without manual invalidation.
- Ensure reconnection logic handles network interruptions (Supabase client already retries; helper should expose lifecycle events if needed).

## Form Factory (`lib/forms/createForm.ts`)

### Goals
- Standardise form state/validation using `react-hook-form` and `zod`.
- Reduce duplicated boilerplate for default values, submission handling, and error mapping.
- Integrate smoothly with TanStack Query mutations.

### API Design
```ts
export interface CreateFormOptions<TSchema extends ZodTypeAny> {
  schema: TSchema;
  defaultValues: Partial<z.infer<TSchema>>;
  transform?: (values: z.infer<TSchema>) => unknown; // convert to DTO before submit
}

export function createForm<TSchema extends ZodTypeAny>(
  options: CreateFormOptions<TSchema>
) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(options.schema),
    defaultValues: options.defaultValues,
  });

  async function handleSubmit(onSubmit: (dto: ReturnType<typeof options.transform> extends never ? z.infer<TSchema> : ReturnType<NonNullable<typeof options.transform>>) => Promise<void>) {
    return form.handleSubmit(async (values) => {
      const payload = options.transform ? options.transform(values) : values;
      await onSubmit(payload as any);
    });
  }

  return { form, handleSubmit };
}
```

### Usage Pattern
- Each feature form controller (e.g., `features/menus/model/forms/controller.ts`) calls `createForm` with schema/defaults.
- UI components import the controller and spread `form` props to inputs.
- Mutation hooks (e.g., `useCreateMenu`) are invoked inside the `handleSubmit` callback.

### Migration Checklist
- Move existing form schemas to `features/<feature>/model/forms/schema.ts`.
- Implement controller wrappers that configure `createForm` and expose helpers (`setServerErrors`, `resetWithDefaults`).
- Update UI form components to consume the controller; remove `useState` for each field.

## Documentation & Testing
- Add README snippets illustrating usage of each utility.
- Write unit tests for `apiRequest` (happy path, error handling) and `createRealtimeSubscription` (ensures unsubscribe works).
- Provide code samples in Storybook docs (MDX) for the form factory and data table integration to help future contributors.

With these shared utilities specified, engineers can proceed with implementation confident that the refactor will converge on consistent patterns across the codebase.
