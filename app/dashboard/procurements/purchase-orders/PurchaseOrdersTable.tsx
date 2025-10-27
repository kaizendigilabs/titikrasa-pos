'use client';

import * as React from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { IconLoader2, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

import { createPurchaseOrderColumns } from './columns';
import { DataTableContent } from '@/components/tables/data-table-content';
import { DataTablePagination } from '@/components/tables/data-table-pagination';
import { DataTableSelectFilter } from '@/components/tables/data-table-select-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useCreatePurchaseOrderMutation,
  usePurchaseOrders,
  usePurchaseOrdersRealtime,
  useDeletePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
} from '@/features/procurements/purchase-orders/hooks';
import type {
  PurchaseOrderFilters,
} from '@/features/procurements/purchase-orders/schemas';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  type PurchaseOrderItemPayload,
} from '@/features/procurements/purchase-orders/schemas';
import type {
  PurchaseOrderItem,
  PurchaseOrderListItem,
} from '@/features/procurements/purchase-orders/types';

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | 'draft' | 'pending' | 'complete' }> = [
  { label: 'All Status', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Complete', value: 'complete' },
];

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value / 100);

export type PurchaseOrderCatalogLink = {
  id: string;
  storeIngredientId: string;
  ingredientName: string;
  baseUom: string | null;
  preferred: boolean;
  lastPurchasePrice: number | null;
  lastPurchasedAt: string | null;
};

export type PurchaseOrderCatalogItem = {
  id: string;
  supplier_id: string;
  name: string;
  base_uom: string;
  purchase_price: number;
  is_active: boolean;
  created_at: string;
  links?: PurchaseOrderCatalogLink[];
};

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type CatalogOption = PurchaseOrderCatalogItem;

type NewItemState = {
  catalogItemId: string;
  qty: string;
};

const DEFAULT_ITEM: NewItemState = {
  catalogItemId: '',
  qty: '1',
};

type PurchaseOrdersTableProps = {
  initialPurchaseOrders: PurchaseOrderListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { status: string; search: string | null };
  };
  suppliers: SupplierOption[];
  catalogItems: CatalogOption[];
  canManage: boolean;
};

function renderStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'pending':
      return <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>;
    case 'complete':
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Complete</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function PurchaseOrdersTable({
  initialPurchaseOrders,
  initialMeta,
  suppliers,
  catalogItems,
  canManage,
}: PurchaseOrdersTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(initialMeta.filters.search ?? '');
  const [status, setStatus] = React.useState<'all' | 'draft' | 'pending' | 'complete'>(
    (initialMeta.filters.status as 'all' | 'draft' | 'pending' | 'complete') ?? 'all',
  );
  const [filters, setFilters] = React.useState<PurchaseOrderFilters>(() => ({
    page: initialMeta.pagination.page,
    pageSize: initialMeta.pagination.pageSize,
    status,
    search: initialMeta.filters.search ?? undefined,
  }));
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrderListItem[]>(
    initialPurchaseOrders,
  );
  const [isCreateOpen, setCreateOpen] = React.useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = React.useState('');
  const [newItems, setNewItems] = React.useState<NewItemState[]>([{ ...DEFAULT_ITEM }]);
  const [selectedStatus, setSelectedStatus] = React.useState<'draft' | 'pending' | 'complete'>(
    'draft',
  );
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = React.useState<PurchaseOrderListItem | null>(
    null,
  );
  const [deletingPurchaseOrderId, setDeletingPurchaseOrderId] = React.useState<string | null>(null);

  const activeSuppliers = React.useMemo(
    () => suppliers.filter((supplier) => supplier.is_active),
    [suppliers],
  );

  const supplierCatalogItems = React.useMemo(() => {
    if (!selectedSupplierId) return [] as CatalogOption[];
    return catalogItems.filter(
      (item) => item.supplier_id === selectedSupplierId && item.is_active,
    );
  }, [catalogItems, selectedSupplierId]);

  const getCatalogById = React.useCallback(
    (catalogItemId: string) => supplierCatalogItems.find((item) => item.id === catalogItemId),
    [supplierCatalogItems],
  );

  React.useEffect(() => {
    setNewItems([{ ...DEFAULT_ITEM }]);
  }, [selectedSupplierId]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        page: 1,
        status,
        search: search.trim() || undefined,
      }));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search, status]);

  const purchaseOrdersQuery = usePurchaseOrders(filters, {
    initialData: {
      items: initialPurchaseOrders,
      meta: initialMeta,
    },
  });

  React.useEffect(() => {
    if (purchaseOrdersQuery.data?.items) {
      setPurchaseOrders(purchaseOrdersQuery.data.items);
    }
  }, [purchaseOrdersQuery.data?.items]);

  usePurchaseOrdersRealtime(true);

  const paginationMeta = purchaseOrdersQuery.data?.meta as
    | { pagination?: { page: number; pageSize: number; total: number } }
    | undefined;
  const totalKnown = paginationMeta?.pagination?.total ?? purchaseOrders.length;
  const totalPages = Math.max(
    1,
    Math.ceil(
      (paginationMeta?.pagination?.total ?? purchaseOrders.length) /
        Math.max(1, paginationMeta?.pagination?.pageSize ?? filters.pageSize),
    ),
  );

  const createPurchaseOrderMutation = useCreatePurchaseOrderMutation();
  const updatePurchaseOrderMutation = useUpdatePurchaseOrderMutation();
  const deletePurchaseOrderMutation = useDeletePurchaseOrderMutation();

  const isInitialLoading = purchaseOrdersQuery.status === 'pending' && !purchaseOrdersQuery.data;
  const isSyncing = purchaseOrdersQuery.isFetching;
  const isLoading = isInitialLoading;
  const disableStatusActions =
    updatePurchaseOrderMutation.isPending || deletePurchaseOrderMutation.isPending;

  const showReset = status !== 'all' || search.trim().length > 0;

  const handleEditPurchaseOrder = React.useCallback(
    (purchaseOrder: PurchaseOrderListItem) => {
      setSelectedPurchaseOrder(purchaseOrder);
    },
    [],
  );

  const handleDeletePurchaseOrder = React.useCallback(
    async (purchaseOrder: PurchaseOrderListItem) => {
      if (purchaseOrder.status === 'complete') {
        toast.error('Completed purchase orders cannot be deleted');
        return;
      }
      const confirmed =
        typeof window === 'undefined'
          ? false
          : window.confirm('Delete this purchase order? This action cannot be undone.');
      if (!confirmed) return;
      try {
        setDeletingPurchaseOrderId(purchaseOrder.id);
        await deletePurchaseOrderMutation.mutateAsync(purchaseOrder.id);
        setPurchaseOrders((prev) => prev.filter((item) => item.id !== purchaseOrder.id));
        toast.success('Purchase order deleted');
        setSelectedPurchaseOrder((current) =>
          current?.id === purchaseOrder.id ? null : current,
        );
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to delete purchase order';
        toast.error(message);
      } finally {
        setDeletingPurchaseOrderId(null);
      }
    },
    [deletePurchaseOrderMutation, router],
  );

  const columns = React.useMemo<ColumnDef<PurchaseOrderListItem>[]>(
    () =>
      createPurchaseOrderColumns(
        canManage
          ? {
              onEdit: handleEditPurchaseOrder,
              onDelete: handleDeletePurchaseOrder,
              pendingDeleteId: deletingPurchaseOrderId,
              disableActions: disableStatusActions,
            }
          : {
              onEdit: handleEditPurchaseOrder,
              disableActions: disableStatusActions,
            },
      ),
    [canManage, handleDeletePurchaseOrder, handleEditPurchaseOrder, deletingPurchaseOrderId, disableStatusActions],
  );

  const table = useReactTable({
    data: purchaseOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.pageSize,
      },
    },
    manualPagination: true,
    pageCount: totalPages,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: filters.page - 1, pageSize: filters.pageSize })
          : updater;
      setFilters((prev) => ({
        ...prev,
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
      }));
    },
    onSortingChange: setSorting,
  });

  React.useEffect(() => {
    table.setPageIndex(filters.page - 1);
  }, [filters.page, table]);

  const handleAddItemRow = () => {
    if (!selectedSupplierId) {
      toast.error('Select a supplier first');
      return;
    }
    if (supplierCatalogItems.length === 0) {
      toast.error('Selected supplier has no catalog items yet');
      return;
    }
    setNewItems((prev) => [...prev, { ...DEFAULT_ITEM }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setNewItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const updateItemField = (index: number, field: keyof NewItemState, value: string) => {
    setNewItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      if (field === 'catalogItemId') {
        item.catalogItemId = value;
      } else if (field === 'qty') {
        item.qty = value;
      }
      next[index] = item;
      return next;
    });
  };

  const handleCreatePurchaseOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!selectedSupplierId) {
        toast.error('Select a supplier');
        return;
      }

      const mappedItems = newItems.map<PurchaseOrderItemPayload | null>((item) => {
        if (!item.catalogItemId) return null;
        const catalog = getCatalogById(item.catalogItemId);
        if (!catalog) return null;
        const qtyNumber = Number.parseInt(item.qty || '0', 10);
        if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
          return null;
        }
        const price = catalog.purchase_price ?? 0;
        return {
          catalogItemId: catalog.id,
          qty: qtyNumber,
          price,
        } satisfies PurchaseOrderItemPayload;
      });

      const items = mappedItems.filter(
        (entry): entry is PurchaseOrderItemPayload => entry !== null,
      );

      if (items.length === 0) {
        toast.error('Add at least one catalog item.');
        return;
      }

      const payload = createPurchaseOrderSchema.parse({
        supplierId: selectedSupplierId,
        status: selectedStatus,
        items,
        totals: {
          grand_total: items.reduce(
            (acc, entry) => acc + (entry.price ?? 0) * entry.qty,
            0,
          ),
        },
      });

      const purchaseOrder = await createPurchaseOrderMutation.mutateAsync(payload);
      setPurchaseOrders((prev) => [purchaseOrder, ...prev]);
      toast.success('Purchase order created');
      router.refresh();
      setCreateOpen(false);
      setNewItems([{ ...DEFAULT_ITEM }]);
      setSelectedStatus('draft');
      setSelectedSupplierId('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create purchase order';
      toast.error(message);
    }
  };

  const handleUpdateStatus = async (
    purchaseOrder: PurchaseOrderListItem,
    nextStatus: 'draft' | 'pending' | 'complete',
  ) => {
    try {
      const payload = updatePurchaseOrderSchema.parse({ status: nextStatus });
      const updated = await updatePurchaseOrderMutation.mutateAsync({
        purchaseOrderId: purchaseOrder.id,
        payload,
      });
      setPurchaseOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`Purchase order marked as ${nextStatus}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update purchase order';
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="rounded-lg border bg-card px-4 py-4 shadow-sm md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-3">
            <div className="relative w-full md:max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search purchase orders"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSyncing && !isInitialLoading ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <IconLoader2 className="h-3 w-3 animate-spin" />
                Syncing…
              </div>
            ) : null}
            {showReset ? (
              <Button
                type="button"
                variant="outline"
                className="text-muted-foreground"
                onClick={() => {
                  setSearch('');
                  setStatus('all');
                }}
                disabled={isLoading}
              >
                <IconX className="h-4 w-4" />
              </Button>
            ) : null}
            <DataTableSelectFilter
              value={status}
              onValueChange={(value) => setStatus(value as 'all' | 'draft' | 'pending' | 'complete')}
              options={STATUS_OPTIONS}
              disabled={isLoading}
            />
            {canManage ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <IconPlus className="mr-2 h-4 w-4" />
                New PO
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <DataTableContent
          table={table}
          isLoading={isInitialLoading && purchaseOrders.length === 0}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {isSyncing ? (
          <span className="flex items-center gap-1">
            <IconLoader2 className="h-3 w-3 animate-spin" />
            Syncing…
          </span>
        ) : (
          <span>{totalKnown} purchase orders</span>
        )}
        <DataTablePagination table={table} />
      </div>

      {canManage ? (
        <Sheet open={isCreateOpen} onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setNewItems([{ ...DEFAULT_ITEM }]);
            setSelectedStatus('draft');
            setSelectedSupplierId('');
          }
        }}>
          <SheetContent side="right" className="max-w-3xl">
            <SheetHeader>
              <SheetTitle>Create purchase order</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleCreatePurchaseOrder} className="mt-4 space-y-6">
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-2">
                  {(['draft', 'pending', 'complete'] as const).map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={selectedStatus === option ? 'default' : 'outline'}
                      onClick={() => setSelectedStatus(option)}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="po-supplier">Supplier</Label>
                  <select
                    id="po-supplier"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedSupplierId}
                    onChange={(event) => setSelectedSupplierId(event.target.value)}
                    required
                  >
                    <option value="">Select supplier</option>
                    {activeSuppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSupplierId === '' ? (
                  <p className="text-sm text-muted-foreground">
                    Choose a supplier to start adding catalog items.
                  </p>
                ) : null}

                {newItems.map((item, index) => {
                  const catalogOptions = supplierCatalogItems;
                  const catalog = item.catalogItemId
                    ? getCatalogById(item.catalogItemId)
                    : undefined;
                  const baseUom = catalog?.base_uom ?? 'unit';
                  const unitPrice = catalog?.purchase_price ?? 0;
                  const qtyNumber = Number.parseInt(item.qty || '0', 10);
                  const lineTotal = qtyNumber > 0 ? qtyNumber * unitPrice : 0;

                  return (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Item {index + 1}</h3>
                        {newItems.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleRemoveItemRow(index)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Catalog item</Label>
                          <select
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            value={item.catalogItemId}
                            onChange={(event) => updateItemField(index, 'catalogItemId', event.target.value)}
                            disabled={selectedSupplierId === '' || catalogOptions.length === 0}
                            required
                          >
                            <option value="">{catalogOptions.length ? 'Select item' : 'No catalog items available'}</option>
                            {catalogOptions.map((catalogItem) => (
                              <option key={catalogItem.id} value={catalogItem.id}>
                                {catalogItem.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {catalog ? (
                          <div className="space-y-2">
                            <Label>Quantity ({baseUom})</Label>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={item.qty}
                              onChange={(event) => updateItemField(index, 'qty', event.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Unit price: {formatCurrency(unitPrice)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Line total: {formatCurrency(lineTotal)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Select a catalog item first.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddItemRow}
                  disabled={!selectedSupplierId || supplierCatalogItems.length === 0}
                >
                  Add item
                </Button>
              </div>
              <SheetFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createPurchaseOrderMutation.isPending}
                >
                  {createPurchaseOrderMutation.isPending ? 'Saving…' : 'Save purchase order'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      ) : null}

      <Dialog open={Boolean(selectedPurchaseOrder)} onOpenChange={(open) => {
        if (!open) {
          setSelectedPurchaseOrder(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase order details</DialogTitle>
            <DialogDescription>
              Review line items and update the status when goods are received.
            </DialogDescription>
          </DialogHeader>
          {selectedPurchaseOrder ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{selectedPurchaseOrder.id}</span>
                {renderStatusBadge(selectedPurchaseOrder.status)}
              </div>
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Item
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Unit price
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Line total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPurchaseOrder.items.map((item, index) => {
                      const catalog = catalogItems.find((catalogItem) => catalogItem.id === item.catalogItemId);
                      const ingredientName = catalog?.links?.find(
                        (link) => link.storeIngredientId === item.storeIngredientId,
                      )?.ingredientName;
                      return (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-muted-foreground">
                            <div className="flex flex-col">
                              <span>{catalog?.name ?? item.catalogItemId}</span>
                              <span className="text-xs text-muted-foreground">
                                Ingredient: {ingredientName ?? item.storeIngredientId}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">
                            {item.qty} {item.baseUom}
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">
                            {formatCurrency(item.price * item.qty)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {selectedPurchaseOrder && canManage ? (
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeletePurchaseOrder(selectedPurchaseOrder)}
                disabled={
                  selectedPurchaseOrder.status === 'complete' ||
                  (deletingPurchaseOrderId !== null &&
                    deletingPurchaseOrderId !== selectedPurchaseOrder.id)
                }
              >
                {deletingPurchaseOrderId === selectedPurchaseOrder.id ? 'Deleting…' : 'Delete PO'}
              </Button>
              <div className="flex flex-wrap gap-2">
                {(['draft', 'pending', 'complete'] as const).map((statusOption) => (
                  <Button
                    key={statusOption}
                    variant={selectedPurchaseOrder.status === statusOption ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus(selectedPurchaseOrder, statusOption)}
                    disabled={disableStatusActions}
                  >
                    {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                  </Button>
                ))}
              </div>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
