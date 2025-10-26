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

import { createResellerColumns } from './columns';
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
import type { ResellerListItem } from '@/features/resellers/types';
import type { ResellerFilters } from '@/features/resellers/schemas';
import {
  useCreateResellerMutation,
  useDeleteResellerMutation,
  useResellers,
  useResellersRealtime,
  useToggleResellerStatusMutation,
  useUpdateResellerMutation,
} from '@/features/resellers/hooks';
import {
  createResellerSchema,
  updateResellerSchema,
} from '@/features/resellers/schemas';
import type { ResellerListMeta } from '@/features/resellers/client';

type ResellersTableProps = {
  initialResellers: ResellerListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { search: string | null; status: 'all' | 'active' | 'inactive' };
  };
  canManage: boolean;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  note: string;
};

const DEFAULT_FORM_STATE: FormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  note: '',
};

function buildPayload(state: FormState) {
  const contact: Record<string, string> = {};
  if (state.email.trim()) contact.email = state.email.trim();
  if (state.phone.trim()) contact.phone = state.phone.trim();
  if (state.address.trim()) contact.address = state.address.trim();
  if (state.note.trim()) contact.note = state.note.trim();

  return {
    contact: Object.keys(contact).length ? contact : undefined,
  };
}

function populateForm(reseller: ResellerListItem): FormState {
  return {
    name: reseller.name,
    email: reseller.contact.email ?? '',
    phone: reseller.contact.phone ?? '',
    address: reseller.contact.address ?? '',
    note: reseller.contact.note ?? '',
  };
}

function upsertResellerEntry(
  list: ResellerListItem[],
  reseller: ResellerListItem,
) {
  const index = list.findIndex((item) => item.id === reseller.id);
  if (index === -1) {
    return [reseller, ...list];
  }
  const next = [...list];
  next[index] = reseller;
  return next;
}

export function ResellersTable({
  initialResellers,
  initialMeta,
  canManage,
}: ResellersTableProps) {
  const [search, setSearch] = React.useState(initialMeta.filters.search ?? '');
  const [status, setStatus] = React.useState<'all' | 'active' | 'inactive'>(
    initialMeta.filters.status ?? 'all'
  );
  const [filters, setFilters] = React.useState<ResellerFilters>(() => ({
    page: initialMeta.pagination.page,
    pageSize: initialMeta.pagination.pageSize,
    search: initialMeta.filters.search ?? undefined,
    status: initialMeta.filters.status,
  }));
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isInviteOpen, setInviteOpen] = React.useState(false);
  const [editingReseller, setEditingReseller] =
    React.useState<ResellerListItem | null>(null);
  const [inviteForm, setInviteForm] = React.useState(DEFAULT_FORM_STATE);
  const [editForm, setEditForm] = React.useState(DEFAULT_FORM_STATE);
  const [resellers, setResellers] =
    React.useState<ResellerListItem[]>(initialResellers);
  const resellersRef = React.useRef(resellers);
  const [pendingActions, setPendingActions] = React.useState<
    Record<string, 'toggle' | 'update' | 'delete'>
  >({});

  const normalizedSearch = React.useMemo(
    () => search.trim().toLowerCase(),
    [search],
  );

  const shouldDisplayReseller = React.useCallback(
    (reseller: ResellerListItem) => {
      if (status === 'active' && !reseller.is_active) {
        return false;
      }
      if (status === 'inactive' && reseller.is_active) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        reseller.name,
        reseller.contact.email,
        reseller.contact.phone,
        reseller.contact.address,
        reseller.contact.note,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    },
    [normalizedSearch, status],
  );

  React.useEffect(() => {
    resellersRef.current = resellers;
  }, [resellers]);

  React.useEffect(() => {
    setResellers((prev) => prev.filter(shouldDisplayReseller));
  }, [shouldDisplayReseller]);

  const clearPending = React.useCallback((id: string) => {
    setPendingActions((prev) => {
      if (!(id in prev)) return prev;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleOpenEditSheet = React.useCallback(
    (reseller: ResellerListItem) => {
      setEditingReseller(reseller);
      setEditForm(populateForm(reseller));
    },
    []
  );

  const handleRealtimeUpsert = React.useCallback(
    (reseller: ResellerListItem) => {
      setResellers((prev) => {
        const next = upsertResellerEntry(prev, reseller);
        return next.filter(shouldDisplayReseller);
      });
    },
    [shouldDisplayReseller]
  );

  const handleRealtimeDelete = React.useCallback(
    (resellerId: string) => {
      setResellers((prev) =>
        prev.filter(
          (item) => item.id !== resellerId && shouldDisplayReseller(item)
        )
      );
    },
    [shouldDisplayReseller]
  );

  React.useEffect(() => {
    if (!editingReseller) {
      setEditForm(DEFAULT_FORM_STATE);
    }
  }, [editingReseller]);

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

  const resellersQuery = useResellers(filters, {
    initialData: {
      items: initialResellers,
      meta: initialMeta,
    },
  });

  React.useEffect(() => {
    if (resellersQuery.data?.items) {
      setResellers(
        resellersQuery.data.items.filter(shouldDisplayReseller),
      );
    }
  }, [resellersQuery.data?.items, shouldDisplayReseller]);

  useResellersRealtime(true, {
    onUpsert: handleRealtimeUpsert,
    onDelete: handleRealtimeDelete,
  });

  const paginationMeta =
    (resellersQuery.data?.meta as ResellerListMeta | null)?.pagination ??
    initialMeta.pagination;
  const totalPages = Math.max(
    1,
    Math.ceil(
      (paginationMeta.total ?? resellers.length) /
        Math.max(1, paginationMeta.pageSize ?? filters.pageSize)
    )
  );
  const totalKnown = paginationMeta.total ?? resellers.length;
  const createMutation = useCreateResellerMutation();
  const updateMutation = useUpdateResellerMutation();
  const toggleStatusMutation = useToggleResellerStatusMutation();
  const deleteMutation = useDeleteResellerMutation();

  const handleToggleStatus = React.useCallback(
    async (reseller: ResellerListItem) => {
      if (pendingActions[reseller.id]) return;
      const nextStatus = !reseller.is_active;
      const actionLabel = nextStatus ? 'activate' : 'deactivate';
      const confirmed = window.confirm(
        `Are you sure you want to ${actionLabel} ${
          reseller.name || 'this reseller'
        }?`
      );
      if (!confirmed) {
        return;
      }

      const previousStatus = reseller.is_active;
      setPendingActions((prev) => ({ ...prev, [reseller.id]: 'toggle' }));
      const optimistic = { ...reseller, is_active: nextStatus };
      setResellers((prev) => {
        const next = upsertResellerEntry(prev, optimistic);
        return next.filter(shouldDisplayReseller);
      });

      try {
        const updated = await toggleStatusMutation.mutateAsync({
          resellerId: reseller.id,
          isActive: nextStatus,
        });
        setResellers((prev) => {
          const next = upsertResellerEntry(prev, updated);
          return next.filter(shouldDisplayReseller);
        });
        toast.success(`Reseller ${nextStatus ? 'activated' : 'deactivated'}`);
      } catch (error) {
        const reverted = { ...reseller, is_active: previousStatus };
        setResellers((prev) => {
          const next = upsertResellerEntry(prev, reverted);
          return next.filter(shouldDisplayReseller);
        });
        const message =
          error instanceof Error ? error.message : 'Failed to update status';
        toast.error(message);
      } finally {
        clearPending(reseller.id);
      }
    },
    [pendingActions, toggleStatusMutation, clearPending, shouldDisplayReseller]
  );

  const handleDelete = React.useCallback(
    async (reseller: ResellerListItem) => {
      if (pendingActions[reseller.id]) return;
      const confirmed = window.confirm(
        `Delete ${
          reseller.name || 'this reseller'
        }? This action cannot be undone.`
      );
      if (!confirmed) {
        return;
      }

      const snapshot = resellersRef.current;
      setPendingActions((prev) => ({ ...prev, [reseller.id]: 'delete' }));
      setResellers((prev) => prev.filter((item) => item.id !== reseller.id));

      try {
        await deleteMutation.mutateAsync(reseller.id);
        toast.success('Reseller deleted');
      } catch (error) {
        setResellers(snapshot.filter(shouldDisplayReseller));
        const message =
          error instanceof Error ? error.message : 'Failed to delete reseller';
        toast.error(message);
      } finally {
        clearPending(reseller.id);
      }
    },
    [pendingActions, deleteMutation, clearPending, shouldDisplayReseller]
  );

  const columns = React.useMemo<ColumnDef<ResellerListItem>[]>(
    () =>
      createResellerColumns({
        canManage,
        pendingActions,
        onEdit: handleOpenEditSheet,
        onToggleStatus: handleToggleStatus,
        onDelete: handleDelete,
      }),
    [
      canManage,
      pendingActions,
      handleDelete,
      handleOpenEditSheet,
      handleToggleStatus,
    ]
  );

  const table = useReactTable({
    data: resellers,
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

  const isInitialLoading =
    resellersQuery.status === 'pending' && !resellersQuery.data;
  const isSyncing = resellersQuery.isFetching;
  const isLoading = isInitialLoading;

  const showReset = status !== 'all' || (search.trim().length ?? 0) > 0;

  const handleCreate = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        const extras = buildPayload(inviteForm);
        const payload = createResellerSchema.parse({
          name: inviteForm.name.trim(),
          contact: extras.contact,
        });
        const created = await createMutation.mutateAsync(payload);
        setResellers((prev) => {
          const next = upsertResellerEntry(prev, created);
          return next.filter(shouldDisplayReseller);
        });
        toast.success('Reseller created');
        setInviteOpen(false);
        setInviteForm(DEFAULT_FORM_STATE);
        setFilters((prev) => ({ ...prev, page: 1 }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create reseller';
        toast.error(message);
      }
    },
    [createMutation, inviteForm, shouldDisplayReseller]
  );

  const handleEdit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingReseller) return;
      const targetId = editingReseller.id;
      const extras = buildPayload(editForm);
      const payload = {
        name: editForm.name.trim(),
        contact: extras.contact,
      };

      try {
        updateResellerSchema.parse(payload);
        setPendingActions((prev) => ({ ...prev, [targetId]: 'update' }));
        const updated = await updateMutation.mutateAsync({
          resellerId: targetId,
          input: payload,
        });
        setResellers((prev) => {
          const next = upsertResellerEntry(prev, updated);
          return next.filter(shouldDisplayReseller);
        });
        toast.success('Reseller updated');
        setEditingReseller(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update reseller';
        toast.error(message);
      } finally {
        clearPending(targetId);
      }
    },
    [editForm, editingReseller, updateMutation, clearPending, shouldDisplayReseller]
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="rounded-lg border bg-transparent border-none shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-3">
            <div className="relative w-full md:max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search resellers"
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
              onValueChange={(value) =>
                setStatus(value as 'all' | 'active' | 'inactive')
              }
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              placeholder="Status"
              disabled={isLoading}
            />
            {canManage ? (
              <Button type="button" onClick={() => setInviteOpen(true)}>
                <IconPlus className="mr-2 h-4 w-4" />
                New reseller
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <DataTableContent
          table={table}
          isLoading={isInitialLoading && resellers.length === 0}
        />
      </div>

      <div className="flex flex-col gap-4">
        {isSyncing ? (
          <span className="flex items-center gap-1">
            <IconLoader2 className="size-sm animate-spin" />
            Syncing…
          </span>
        ) : (
          <span className='text-sm text-muted-foreground'>{totalKnown} resellers</span>
        )}
        <DataTablePagination table={table} />
      </div>

      <Sheet
        open={isInviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteForm(DEFAULT_FORM_STATE);
          }
        }}
      >
        <SheetContent side="right" className="max-w-xl">
          <SheetHeader>
            <SheetTitle>New reseller</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={inviteForm.name}
                onChange={(event) =>
                  setInviteForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  placeholder="reseller@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  value={inviteForm.phone}
                  onChange={(event) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="08xxxxxxxx"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                value={inviteForm.address}
                onChange={(event) =>
                  setInviteForm((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-note">Notes</Label>
              <Input
                id="new-note"
                value={inviteForm.note}
                onChange={(event) =>
                  setInviteForm((prev) => ({
                    ...prev,
                    note: event.target.value,
                  }))
                }
              />
            </div>
            <SheetFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating…' : 'Create reseller'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(editingReseller)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingReseller(null);
          }
        }}
      >
        <SheetContent side="right" className="max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit reseller</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleEdit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">Notes</Label>
              <Input
                id="edit-note"
                value={editForm.note}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, note: event.target.value }))
                }
              />
            </div>
            <SheetFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
