# Reusable Data Table Contract

This document specifies the reusable data table system that will replace feature-specific table implementations. The contract draws on shadcn UI patterns and TanStack Table to deliver consistent behaviour across all dashboard features.

## Goals
- Provide a single `<DataTable>` component with pluggable toolbar/actions that any feature can consume.
- Standardise how columns, filters, selection, and mutations are wired via view-model hooks.
- Support hybrid state management: TanStack Query for server data, local stores for UI state.
- Enable progressive enhancement (pagination, virtualisation, bulk actions) without duplicating boilerplate.

## Package Layout
```
components/data-table/
  DataTable.tsx            # Generic table wrapper (renders table head/body, empty states, loading overlay).
  DataTableToolbar.tsx     # Default toolbar with slots for search, filters, actions.
  DataTablePagination.tsx  # Controlled pagination footer.
  DataTableSkeleton.tsx    # Loading skeleton for suspense/fallback states.
  hooks.ts                 # Hook utilities (useDataTableState, useRowSelection).
  types.ts                 # Shared types/interfaces described below.
```

## Core Types
```ts
// components/data-table/types.ts
export interface DataTableState<TData> {
  table: Table<TData>;             // TanStack Table instance (created by view-model hook).
  isLoading: boolean;              // Combined loading state from queries/mutations.
  isError: boolean;
  error?: AppError;
  toolbar: DataTableToolbarConfig; // Config described below.
  pagination: DataTablePaginationState;
  selection: DataTableSelectionState;
}

export interface DataTableProps<TData> {
  state: DataTableState<TData>;
  columns: ColumnDef<TData, any>[];
  emptyContent?: ReactNode;
  toolbarSlots?: Partial<DataTableToolbarSlots>;
  onRowAction?: (action: string, row: TData) => void;
}
```

### Toolbar Config
```ts
export interface DataTableToolbarConfig {
  title: string;
  search?: {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    debounceMs?: number;
  };
  filters?: Array<{
    id: string;
    label: string;
    type: "select" | "checkbox" | "date-range" | "custom";
    options?: Array<{ label: string; value: string }>;
    value: unknown;
    onChange: (value: unknown) => void;
    renderCustom?: () => ReactNode; // required when type === "custom"
  }>;
  actions?: Array<{
    id: string;
    label: string;
    icon?: React.ComponentType;
    variant?: "default" | "outline" | "destructive";
    disabled?: boolean;
    onClick: () => void;
  }>;
  bulkActions?: Array<{
    id: string;
    label: string;
    onClick: (selected: unknown[]) => void;
    disabled?: boolean;
  }>;
}
```

### Pagination Contract
```ts
export interface DataTablePaginationState {
  pageIndex: number;
  pageSize: number;
  pageCount?: number; // optional for cursor-based pagination
  canNextPage: boolean;
  canPreviousPage: boolean;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}
```

### Selection Contract
```ts
export interface DataTableSelectionState {
  selectedRowIds: Record<string, boolean>;
  onSelectionChange: (rowIds: Record<string, boolean>) => void;
}
```

## View-Model Expectations
Feature view-model hooks must:
1. Create the TanStack Table instance via `useReactTable` using columns metadata + data from TanStack Query.
2. Provide derived loading/error states (`isFetching`, `isPending`) consolidated into `DataTableState.isLoading`/`isError`.
3. Manage toolbar/filter state via local store hooks, exposing setter functions for search, filter values, and actions.
4. Control pagination (page index/size) and connect them to query parameters.
5. Handle selection state (if applicable) by syncing with `table.getState().rowSelection`.
6. Supply mutation handlers (create/update/delete) triggered by toolbar buttons or row actions; results should invalidate or optimistically update query caches.

An example stub:
```ts
export function useMenusTableViewModel() {
  const filtersStore = useMenusFiltersStore();
  const menusQuery = useMenusQuery(filtersStore.params);
  const table = useReactTable({
    data: menusQuery.data ?? [],
    columns: menusColumns,
    getRowId: (row) => row.id,
    state: {
      rowSelection: filtersStore.rowSelection,
      sorting: filtersStore.sorting,
    },
    onRowSelectionChange: filtersStore.setRowSelection,
    onSortingChange: filtersStore.setSorting,
    manualPagination: true,
    pageCount: menusQuery.pageCount,
  });

  return {
    state: {
      table,
      isLoading: menusQuery.isLoading,
      isError: menusQuery.isError,
      error: menusQuery.error,
      toolbar: buildMenusToolbar(filtersStore),
      pagination: buildMenusPagination(filtersStore, menusQuery.meta),
      selection: {
        selectedRowIds: filtersStore.rowSelection,
        onSelectionChange: filtersStore.setRowSelection,
      },
    },
    actions: {
      createMenu,
      deleteSelectedMenus,
    },
  } satisfies DataTableViewModel<MenuRow>;
}
```

## Column Metadata Guidelines
- Each feature exports `menusColumns: ColumnDef<MenuRow>[]` from `features/menus/model/columns.ts`.
- Column definitions can include `meta` describing badges, chip colours, or action menus; `<DataTable>` can read known `meta` keys to render chips or status indicators.
- Use helper factories for common patterns (`createStatusColumn`, `createCurrencyColumn`).
- Avoid embedding JSX in the column definition that depends on feature-specific state; instead, expose pure renderers receiving `row.original`.

## Integration Steps per Feature
1. Refactor feature queries/mutations into `model/queries.ts` and `model/mutations.ts`.
2. Build a local filters store (Zustand or `useReducer`) exposing search/filter/pagination state.
3. Implement `use<Feature>TableViewModel` returning `{ state, actions }` as described.
4. Update the route page to render:
   ```tsx
   const { state, actions } = useMenusTableViewModel();
   return (
     <DataTable
       state={state}
       columns={menusColumns}
       toolbarSlots={{
         primaryAction: (
           <Button onClick={actions.createMenu}>Tambah Menu</Button>
         ),
       }}
     />
   );
   ```
5. Move dialogs/forms into `features/<feature>/ui/components` and control them via the view-model (open/close state in local store).
6. Add Storybook docs demonstrating the table in loading, empty, populated, and error states.

## Roadmap Enhancements
- **Virtualisation**: integrate `@tanstack/react-virtual` in `DataTable.tsx` behind a `virtualized` prop.
- **Column visibility persistence**: store user-selected column visibility in local storage via `useDataTableState` helper.
- **Accessible row actions**: standardise action menu button with keyboard navigation support.
- **Theming**: map design tokens to table primitives (header background, zebra striping) once the design system is finalised.

With this contract, all dashboard features will share the same data-table foundation, significantly reducing duplication and easing maintenance.
