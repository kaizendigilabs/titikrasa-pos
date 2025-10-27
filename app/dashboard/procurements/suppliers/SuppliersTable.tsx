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

import { createSupplierColumns } from './columns';
import { DataTableContent } from '@/components/tables/data-table-content';
import { DataTablePagination } from '@/components/tables/data-table-pagination';
import { DataTableSelectFilter } from '@/components/tables/data-table-select-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateCatalogItemMutation,
  useCreateSupplierMutation,
  useDeleteCatalogItemMutation,
  useDeleteSupplierMutation,
  useSupplierCatalog,
  useSuppliers,
  useSuppliersRealtime,
  useToggleCatalogItemMutation,
  useUpdateCatalogItemMutation,
  useUpdateSupplierMutation,
} from '@/features/procurements/suppliers/hooks';
import type { SupplierFilters } from '@/features/procurements/suppliers/schemas';
import type {
  SupplierCatalogItem,
  SupplierListItem,
} from '@/features/procurements/suppliers/types';
import {
  createSupplierSchema,
  updateSupplierSchema,
  createCatalogItemSchema,
  updateCatalogItemSchema,
} from '@/features/procurements/suppliers/schemas';

const DEFAULT_FORM_STATE = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  note: '',
};

type SupplierFormState = typeof DEFAULT_FORM_STATE;

type BaseUomValue = 'gr' | 'ml' | 'pcs';

type CatalogFormState = {
  name: string;
  baseUom: BaseUomValue;
  purchasePrice: string;
};

const DEFAULT_CATALOG_FORM: CatalogFormState = {
  name: '',
  baseUom: 'pcs',
  purchasePrice: '0',
};

const BASE_UOM_OPTIONS: Array<{ label: string; value: CatalogFormState["baseUom"] }> = [
  { label: 'Gram (gr)', value: 'gr' },
  { label: 'Milliliter (ml)', value: 'ml' },
  { label: 'Pieces (pcs)', value: 'pcs' },
];

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value / 100);

type SuppliersTableProps = {
  initialSuppliers: SupplierListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { search: string | null; status: 'all' | 'active' | 'inactive' };
  };
  canManage: boolean;
};

function buildSupplierPayload(state: SupplierFormState) {
  const contact: Record<string, string> = {};
  if (state.contactName.trim()) contact.name = state.contactName.trim();
  if (state.email.trim()) contact.email = state.email.trim();
  if (state.phone.trim()) contact.phone = state.phone.trim();
  if (state.address.trim()) contact.address = state.address.trim();
  if (state.note.trim()) contact.note = state.note.trim();

  return {
    contact: Object.keys(contact).length ? contact : undefined,
  };
}

function populateForm(supplier: SupplierListItem): SupplierFormState {
  return {
    name: supplier.name ?? '',
    contactName: supplier.contact.name ?? '',
    email: supplier.contact.email ?? '',
    phone: supplier.contact.phone ?? '',
    address: supplier.contact.address ?? '',
    note: supplier.contact.note ?? '',
  };
}

function populateCatalogForm(item: SupplierCatalogItem): CatalogFormState {
  return {
    name: item.name,
    baseUom: (item.base_uom as BaseUomValue) ?? 'pcs',
    purchasePrice: String(item.purchase_price),
  };
}

export function SuppliersTable({ initialSuppliers, initialMeta, canManage }: SuppliersTableProps) {
  const [search, setSearch] = React.useState(initialMeta.filters.search ?? '');
  const [status, setStatus] = React.useState<'all' | 'active' | 'inactive'>(
    initialMeta.filters.status ?? 'all',
  );
  const [filters, setFilters] = React.useState<SupplierFilters>(() => ({
    page: initialMeta.pagination.page,
    pageSize: initialMeta.pagination.pageSize,
    search: initialMeta.filters.search ?? undefined,
    status: initialMeta.filters.status,
  }));
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isInviteOpen, setInviteOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierListItem | null>(null);
  const [formState, setFormState] = React.useState<SupplierFormState>(DEFAULT_FORM_STATE);
  const [suppliers, setSuppliers] = React.useState<SupplierListItem[]>(initialSuppliers);
  const [pendingActions, setPendingActions] = React.useState<
    Record<string, 'toggle' | 'delete' | 'update' | 'catalog'>
  >({});
  const [catalogDialogSupplier, setCatalogDialogSupplier] = React.useState<SupplierListItem | null>(null);
  const [catalogForm, setCatalogForm] = React.useState<CatalogFormState>(DEFAULT_CATALOG_FORM);
  const [editingCatalogItem, setEditingCatalogItem] = React.useState<SupplierCatalogItem | null>(null);

  const normalizedSearch = search.trim().toLowerCase();

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        page: 1,
        search: search.trim() || undefined,
        status,
      }));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search, status]);

  const suppliersQuery = useSuppliers(filters, {
    initialData: {
      items: initialSuppliers,
      meta: initialMeta,
    },
  });

  React.useEffect(() => {
    if (suppliersQuery.data?.items) {
      setSuppliers(suppliersQuery.data.items);
    }
  }, [suppliersQuery.data?.items]);

  useSuppliersRealtime({ enabled: true });

  const paginationMeta = suppliersQuery.data?.meta as
    | {
        pagination?: { page: number; pageSize: number; total: number };
      }
    | undefined;
  const totalKnown = paginationMeta?.pagination?.total ?? suppliers.length;
  const totalPages = Math.max(
    1,
    Math.ceil(
      (paginationMeta?.pagination?.total ?? suppliers.length) /
        Math.max(1, paginationMeta?.pagination?.pageSize ?? filters.pageSize),
    ),
  );

  const createSupplierMutation = useCreateSupplierMutation();
  const updateSupplierMutation = useUpdateSupplierMutation();
  const deleteSupplierMutation = useDeleteSupplierMutation();

  const isInitialLoading = suppliersQuery.status === 'pending' && !suppliersQuery.data;
  const isSyncing = suppliersQuery.isFetching;
  const isLoading = isInitialLoading;

  const showReset = status !== 'all' || normalizedSearch.length > 0;

  const handleResetFilters = React.useCallback(() => {
    setSearch('');
    setStatus('all');
  }, []);

  const columns = React.useMemo<ColumnDef<SupplierListItem>[]>(
    () =>
      createSupplierColumns({
        canManage,
        pendingActions,
        onEdit: (supplier) => {
          setEditingSupplier(supplier);
          setFormState(populateForm(supplier));
        },
        onToggleStatus: async (supplier) => {
          setPendingActions((prev) => ({ ...prev, [supplier.id]: 'toggle' }));
          try {
            const nextStatus = !supplier.is_active;
            const payload = updateSupplierSchema.parse({
              isActive: nextStatus,
            });
            const updated = await updateSupplierMutation.mutateAsync({
              supplierId: supplier.id,
              payload,
            });
            setSuppliers((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            );
            toast.success(`Supplier ${nextStatus ? 'activated' : 'deactivated'}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update supplier';
            toast.error(message);
          } finally {
            setPendingActions((prev) => {
              const { [supplier.id]: _omit, ...rest } = prev;
              return rest;
            });
          }
        },
        onDelete: async (supplier) => {
          if (!window.confirm(`Delete ${supplier.name}? This action cannot be undone.`)) {
            return;
          }
          setPendingActions((prev) => ({ ...prev, [supplier.id]: 'delete' }));
          try {
            await deleteSupplierMutation.mutateAsync(supplier.id);
            setSuppliers((prev) => prev.filter((item) => item.id !== supplier.id));
            toast.success('Supplier deleted');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete supplier';
            toast.error(message);
          } finally {
            setPendingActions((prev) => {
              const { [supplier.id]: _omit, ...rest } = prev;
              return rest;
            });
          }
        },
        onManageCatalog: (supplier) => {
          setCatalogDialogSupplier(supplier);
          setEditingCatalogItem(null);
          setCatalogForm(DEFAULT_CATALOG_FORM);
        },
      }),
    [canManage, pendingActions, updateSupplierMutation, deleteSupplierMutation],
  );

  const table = useReactTable({
    data: suppliers,
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

  const handleCreateSupplier = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        const extras = buildSupplierPayload(formState);
        const payload = createSupplierSchema.parse({
          name: formState.name.trim(),
          contact: extras.contact,
        });
        const supplier = await createSupplierMutation.mutateAsync(payload);
        setSuppliers((prev) => [supplier, ...prev]);
        toast.success('Supplier added');
        setInviteOpen(false);
        setFormState(DEFAULT_FORM_STATE);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create supplier';
        toast.error(message);
      }
    },
    [createSupplierMutation, formState],
  );

  const handleUpdateSupplier = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingSupplier) return;
      setPendingActions((prev) => ({ ...prev, [editingSupplier.id]: 'update' }));

      try {
        const extras = buildSupplierPayload(formState);
        const payload = updateSupplierSchema.parse({
          name: formState.name.trim(),
          contact: extras.contact,
        });
        const updated = await updateSupplierMutation.mutateAsync({
          supplierId: editingSupplier.id,
          payload,
        });
        setSuppliers((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        toast.success('Supplier updated');
        setEditingSupplier(null);
        setFormState(DEFAULT_FORM_STATE);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update supplier';
        toast.error(message);
      } finally {
        setPendingActions((prev) => {
          const { [editingSupplier.id]: _omit, ...rest } = prev;
          return rest;
        });
      }
    },
    [editingSupplier, formState, updateSupplierMutation],
  );

  const activeCatalogSupplierId = catalogDialogSupplier?.id ?? '';
  const catalogQuery = useSupplierCatalog({
    supplierId: activeCatalogSupplierId,
    enabled: Boolean(activeCatalogSupplierId),
  });
  const createCatalogItemMutation = useCreateCatalogItemMutation(activeCatalogSupplierId);
  const updateCatalogItemMutation = useUpdateCatalogItemMutation(activeCatalogSupplierId);
  const toggleCatalogItemMutation = useToggleCatalogItemMutation(activeCatalogSupplierId);
  const deleteCatalogItemMutation = useDeleteCatalogItemMutation(activeCatalogSupplierId);

  const handleSubmitCatalog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catalogDialogSupplier) return;
    const basePayload = {
      supplierId: catalogDialogSupplier.id,
      name: catalogForm.name.trim(),
      baseUom: catalogForm.baseUom,
      purchasePrice: Math.max(0, Math.round(Number(catalogForm.purchasePrice || '0'))),
      isActive: editingCatalogItem?.is_active ?? true,
    };

    try {
      if (editingCatalogItem) {
        const payload = updateCatalogItemSchema.parse(basePayload);
        await updateCatalogItemMutation.mutateAsync({
          catalogItemId: editingCatalogItem.id,
          payload,
        });
        toast.success('Catalog item updated');
      } else {
        const payload = createCatalogItemSchema.parse(basePayload);
        await createCatalogItemMutation.mutateAsync(payload);
        toast.success('Catalog item added');
      }
      setCatalogForm(DEFAULT_CATALOG_FORM);
      setEditingCatalogItem(null);
      setPendingActions((prev) => ({
        ...prev,
        [catalogDialogSupplier.id]: 'catalog',
      }));
      setTimeout(() => {
        setPendingActions((prev) => {
          const { [catalogDialogSupplier.id]: _omit, ...rest } = prev;
          return rest;
        });
      }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save catalog item';
      toast.error(message);
    }
  };

  const handleEditCatalogItem = (item: SupplierCatalogItem) => {
    setEditingCatalogItem(item);
    setCatalogForm(populateCatalogForm(item));
  };

  const handleResetCatalogForm = () => {
    setEditingCatalogItem(null);
    setCatalogForm(DEFAULT_CATALOG_FORM);
  };

  const handleToggleCatalogItem = async (item: SupplierCatalogItem) => {
    if (!catalogDialogSupplier) return;
    try {
      await toggleCatalogItemMutation.mutateAsync({
        catalogItemId: item.id,
        isActive: !item.is_active,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle item';
      toast.error(message);
    }
  };

  const handleDeleteCatalogItem = async (item: SupplierCatalogItem) => {
    if (!catalogDialogSupplier) return;
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await deleteCatalogItemMutation.mutateAsync(item.id);
      toast.success('Catalog item deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete item';
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
                placeholder="Search suppliers"
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
                onClick={handleResetFilters}
                disabled={isLoading}
              >
                <IconX className="h-4 w-4" />
              </Button>
            ) : null}
            <DataTableSelectFilter
              value={status}
              onValueChange={(value) => setStatus(value as 'all' | 'active' | 'inactive')}
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              disabled={isLoading}
            />
            {canManage ? (
              <Button type="button" onClick={() => setInviteOpen(true)}>
                <IconPlus className="mr-2 h-4 w-4" />
                New supplier
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <DataTableContent
          table={table}
          isLoading={isInitialLoading && suppliers.length === 0}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {isSyncing ? (
          <span className="flex items-center gap-1">
            <IconLoader2 className="h-3 w-3 animate-spin" />
            Syncing…
          </span>
        ) : (
          <span>{totalKnown} suppliers</span>
        )}
        <DataTablePagination table={table} />
      </div>

      {canManage ? (
        <>
          <Sheet open={isInviteOpen} onOpenChange={(open) => {
            setInviteOpen(open);
            if (!open) {
              setFormState(DEFAULT_FORM_STATE);
            }
          }}>
            <SheetContent side="right" className="max-w-xl">
              <SheetHeader>
                <SheetTitle>New supplier</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleCreateSupplier} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Name</Label>
                  <Input
                    id="supplier-name"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-contact-name">Contact name</Label>
                  <Input
                    id="supplier-contact-name"
                    value={formState.contactName}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, contactName: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-email">Email</Label>
                    <Input
                      id="supplier-email"
                      type="email"
                      value={formState.email}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-phone">Phone</Label>
                    <Input
                      id="supplier-phone"
                      value={formState.phone}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-address">Address</Label>
                  <Input
                    id="supplier-address"
                    value={formState.address}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-note">Notes</Label>
                  <Input
                    id="supplier-note"
                    value={formState.note}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, note: event.target.value }))
                    }
                  />
                </div>
                <SheetFooter>
                  <Button type="submit" className="w-full" disabled={createSupplierMutation.isPending}>
                    {createSupplierMutation.isPending ? 'Saving…' : 'Save supplier'}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>

          <Sheet open={Boolean(editingSupplier)} onOpenChange={(open) => {
            if (!open) {
              setEditingSupplier(null);
              setFormState(DEFAULT_FORM_STATE);
            }
          }}>
            <SheetContent side="right" className="max-w-xl">
              <SheetHeader>
                <SheetTitle>Edit supplier</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleUpdateSupplier} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-name">Contact name</Label>
                  <Input
                    id="edit-contact-name"
                    value={formState.contactName}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, contactName: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formState.email}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={formState.phone}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={formState.address}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-note">Notes</Label>
                  <Input
                    id="edit-note"
                    value={formState.note}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, note: event.target.value }))
                    }
                  />
                </div>
                <SheetFooter>
                  <Button type="submit" className="w-full" disabled={updateSupplierMutation.isPending}>
                    {updateSupplierMutation.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>

          <Dialog
            open={Boolean(catalogDialogSupplier)}
            onOpenChange={(open) => {
              if (!open) {
                setCatalogDialogSupplier(null);
                setCatalogForm(DEFAULT_CATALOG_FORM);
                setEditingCatalogItem(null);
              }
            }}
          >
            <DialogContent className="max-w-3xl gap-6">
              <DialogHeader>
                <DialogTitle>{catalogDialogSupplier?.name ?? 'Catalog'}</DialogTitle>
                <DialogDescription>
                  Manage supplier catalog items and maintain purchasing data consistency.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitCatalog} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="catalog-name">Item name</Label>
                    <Input
                      id="catalog-name"
                      value={catalogForm.name}
                      onChange={(event) =>
                        setCatalogForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catalog-base-uom">Base UOM</Label>
                    <select
                      id="catalog-base-uom"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={catalogForm.baseUom}
                      onChange={(event) =>
                        setCatalogForm((prev) => ({
                          ...prev,
                          baseUom: event.target.value as BaseUomValue,
                        }))
                      }
                      required
                    >
                      {BASE_UOM_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="catalog-price">Purchase price (IDR)</Label>
                    <Input
                      id="catalog-price"
                      type="number"
                      min={0}
                      step={1}
                      value={catalogForm.purchasePrice}
                      onChange={(event) =>
                        setCatalogForm((prev) => ({
                          ...prev,
                          purchasePrice: event.target.value,
                        }))
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Math.max(0, Math.round(Number(catalogForm.purchasePrice || '0'))))}
                      {" "}per {catalogForm.baseUom}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={createCatalogItemMutation.isPending || updateCatalogItemMutation.isPending}>
                    {editingCatalogItem
                      ? updateCatalogItemMutation.isPending
                        ? 'Saving…'
                        : 'Save changes'
                      : createCatalogItemMutation.isPending
                      ? 'Saving…'
                      : 'Add item'}
                  </Button>
                  {editingCatalogItem ? (
                    <Button type="button" variant="ghost" onClick={handleResetCatalogForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>

              <div className="max-h-72 overflow-y-auto rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Item
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Base UOM
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Unit price
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(catalogQuery.data ?? []).map((item) => (
                      <tr key={item.id} className={item.is_active ? '' : 'opacity-60'}>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Added {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {item.base_uom}
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {formatCurrency(item.purchase_price)}
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {item.is_active ? 'Active' : 'Inactive'}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCatalogItem(item)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleCatalogItem(item)}
                            >
                              {item.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteCatalogItem(item)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(catalogQuery.data ?? []).length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={5}>
                          No catalog items yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
