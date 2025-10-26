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
import { useQueryClient } from '@tanstack/react-query';
import { IconEye, IconEyeOff, IconLoader2, IconPlus, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';

import { DataTableContent } from '@/components/tables/data-table-content';
import { DataTablePagination } from '@/components/tables/data-table-pagination';
import { DataTableSelectFilter } from '@/components/tables/data-table-select-filter';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { createUserColumns } from './columns';
import type { UserListItem } from '@/features/users/types';
import type { ListUsersParams } from '@/features/users/client';
import { listUsers } from '@/features/users/client';
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useResetPasswordMutation,
  useRoles,
  useToggleUserStatusMutation,
  useUpdateUserMutation,
  useUsers,
  useUsersRealtime,
  useUsersQueryKey,
} from '@/features/users/hooks';

const MANAGED_ROLES = ['admin', 'manager', 'staff'] as const;
const MAX_FETCH_PAGE_SIZE = 1000;

function sortUsersByCreated(users: UserListItem[]) {
  return [...users].sort((a, b) => {
    const aTime = a.created_at ? Date.parse(a.created_at) : 0;
    const bTime = b.created_at ? Date.parse(b.created_at) : 0;
    return bTime - aTime;
  });
}

function mergeUserLists(
  current: UserListItem[],
  updates: UserListItem[]
): UserListItem[] {
  if (updates.length === 0) {
    return current;
  }
  const map = new Map<string, UserListItem>();
  for (const user of current) {
    map.set(user.user_id, user);
  }
  for (const user of updates) {
    map.set(user.user_id, user);
  }
  return sortUsersByCreated([...map.values()]);
}

function upsertUserLocally(
  list: UserListItem[],
  user: UserListItem
): UserListItem[] {
  const index = list.findIndex((item) => item.user_id === user.user_id);
  if (index === -1) {
    return sortUsersByCreated([...list, user]);
  }
  const next = [...list];
  next[index] = user;
  return sortUsersByCreated(next);
}

type StatusFilter = 'all' | 'active' | 'inactive';
type ManagedRole = (typeof MANAGED_ROLES)[number];
type RoleFilter = 'all' | ManagedRole;

function isManagedRole(role: string | null | undefined): role is ManagedRole {
  return !!role && MANAGED_ROLES.includes(role as ManagedRole);
}

type UsersTableProps = {
  initialUsers: UserListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: StatusFilter;
      role: string | null;
      search: string | null;
    };
  };
  initialRoles: Array<{ id: string; name: string }>;
  currentUserId: string;
  canManage: boolean;
};

const DEFAULT_ROLE: ManagedRole = 'staff';

type InviteFormState = {
  email: string;
  name: string;
  phone: string;
  role: ManagedRole;
  password: string;
};

type EditFormState = {
  name: string;
  phone: string;
  role: ManagedRole;
  isActive: boolean;
};

export function UsersTable({
  initialUsers,
  initialMeta,
  initialRoles,
  currentUserId,
  canManage,
}: UsersTableProps) {
  const [search, setSearch] = React.useState(initialMeta.filters.search ?? '');
  const [status, setStatus] = React.useState<StatusFilter>(
    initialMeta.filters.status ?? 'all'
  );
  const [role, setRole] = React.useState<RoleFilter>(
    initialMeta.filters.role ? (initialMeta.filters.role as RoleFilter) : 'all'
  );
  const [isInviteOpen, setInviteOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserListItem | null>(
    null
  );
  const [pendingActions, setPendingActions] = React.useState<
    Record<string, 'toggle' | 'delete' | 'update'>
  >({});

  const fetchPageSize = React.useMemo(() => {
    const total = initialMeta.pagination.total ?? initialUsers.length;
    const baseSize = initialMeta.pagination.pageSize;
    const desired = Math.max(total, baseSize, initialUsers.length);
    return Math.min(Math.max(desired, 1), MAX_FETCH_PAGE_SIZE);
  }, [
    initialMeta.pagination.pageSize,
    initialMeta.pagination.total,
    initialUsers.length,
  ]);

  const queryFilters = React.useMemo<ListUsersParams>(
    () => ({
      page: 1,
      pageSize: fetchPageSize,
    }),
    [fetchPageSize]
  );

  const usersQuery = useUsers(queryFilters, {
    initialData: {
      items: initialUsers,
      meta: initialMeta,
    },
  });
  const [users, setUsers] = React.useState<UserListItem[]>(initialUsers);
  const usersRef = React.useRef(users);

  React.useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const queryClient = useQueryClient();
  const getUsersQueryKey = useUsersQueryKey();
  const queryKey = React.useMemo(
    () => getUsersQueryKey(queryFilters),
    [getUsersQueryKey, queryFilters]
  );

  const handleRealtimeUpsert = React.useCallback((user: UserListItem) => {
    setUsers((prev) => upsertUserLocally(prev, user));
  }, []);

  const handleRealtimeDelete = React.useCallback((userId: string) => {
    setUsers((prev) => prev.filter((item) => item.user_id !== userId));
  }, []);

  useUsersRealtime(queryFilters, {
    onUserUpsert: handleRealtimeUpsert,
    onUserDelete: handleRealtimeDelete,
  });
  const rolesQuery = useRoles({ initialData: initialRoles });

  React.useEffect(() => {
    const nextItems = usersQuery.data?.items ?? [];
    if (nextItems.length === 0) return;
    setUsers((prev) => mergeUserLists(prev, nextItems));
  }, [usersQuery.data?.items]);

  const totalUsers = React.useMemo(() => {
    const meta = usersQuery.data?.meta as
      | { pagination?: { total?: number } }
      | null
      | undefined;
    return (
      meta?.pagination?.total ??
      initialMeta.pagination.total ??
      initialUsers.length
    );
  }, [
    initialMeta.pagination.total,
    initialUsers.length,
    usersQuery.data?.meta,
  ]);

  const prefetchStateRef = React.useRef<{
    fetching: boolean;
    lastTotal: number;
  }>({ fetching: false, lastTotal: initialUsers.length });

  React.useEffect(() => {
    if (!totalUsers) return;
    if (totalUsers <= fetchPageSize) return;

    const state = prefetchStateRef.current;
    if (state.fetching) return;
    if (state.lastTotal >= totalUsers) return;

    state.fetching = true;
    let cancelled = false;

    const chunkSize = Math.max(fetchPageSize, 1);
    const totalPages = Math.ceil(totalUsers / chunkSize);

    const load = async () => {
      const merged = new Map<string, UserListItem>();
      for (const user of usersRef.current) {
        merged.set(user.user_id, user);
      }

      for (let page = 2; page <= totalPages; page++) {
        if (cancelled) return merged.size;
        try {
          const response = await listUsers({ page, pageSize: chunkSize });
          if (cancelled) return merged.size;
          for (const item of response.items) {
            merged.set(item.user_id, item);
          }
        } catch (error) {
          console.error('[USERS_PREFETCH_ERROR]', error);
          break;
        }
      }

      const combined = sortUsersByCreated([...merged.values()]);
      if (!cancelled) {
        setUsers(combined);
        queryClient.setQueryData<
          Awaited<ReturnType<typeof listUsers>> | undefined
        >(queryKey, (current) =>
          current ? { ...current, items: combined } : current
        );
      }
      return combined.length;
    };

    void load()
      .then((loadedCount) => {
        if (!cancelled && typeof loadedCount === 'number') {
          state.lastTotal = loadedCount;
        }
      })
      .finally(() => {
        if (!cancelled) {
          state.fetching = false;
        }
      });

    return () => {
      cancelled = true;
      state.fetching = false;
    };
  }, [fetchPageSize, queryClient, queryKey, totalUsers]);

  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const toggleUserStatusMutation = useToggleUserStatusMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  const isInitialLoading = usersQuery.status === 'pending' && !usersQuery.data;
  const isSyncing = usersQuery.isFetching;
  const isLoading = isInitialLoading;
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = React.useMemo(() => {
    return users
      .filter((user) => {
        if (status === 'all') return true;
        return status === 'active' ? user.is_active : !user.is_active;
      })
      .filter((user) => {
        if (role === 'all') return true;
        return user.role === role;
      })
      .filter((user) => {
        if (!normalizedSearch) return true;
        const haystack = [user.name, user.email, user.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }, [normalizedSearch, role, status, users]);

  const handleResetFilters = React.useCallback(() => {
    setSearch('');
    setStatus('all');
    setRole('all');
  }, []);

  const handleResetPassword = React.useCallback(
    async (user: UserListItem) => {
      try {
        const result = await resetPasswordMutation.mutateAsync({
          userId: user.user_id,
        });
        toast.success('Password reset link generated');
        if (result.resetLink) {
          toast.info('Share this reset link with the user', {
            description: result.resetLink,
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to generate reset link'
        );
      }
    },
    [resetPasswordMutation]
  );

  const handleToggleStatus = React.useCallback(
    async (user: UserListItem) => {
      if (pendingActions[user.user_id]) return;
      const nextStatus = !user.is_active;
      if (user.user_id === currentUserId && !nextStatus) {
        toast.error('You cannot deactivate your own account');
        return;
      }

      const actionLabel = nextStatus ? 'activate' : 'deactivate';
      const confirmed = window.confirm(
        `Are you sure you want to ${actionLabel} ${user.name ?? user.email}?`
      );
      if (!confirmed) {
        return;
      }

      setPendingActions((prev) => ({
        ...prev,
        [user.user_id]: 'toggle',
      }));
      try {
        await toggleUserStatusMutation.mutateAsync({
          userId: user.user_id,
          isActive: nextStatus,
        });
        const patchedUser: UserListItem = {
          ...user,
          is_active: nextStatus,
        };
        setUsers((prev) => upsertUserLocally(prev, patchedUser));
        toast.success(`User ${nextStatus ? 'activated' : 'deactivated'}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to ${actionLabel} user`
        );
      } finally {
        setPendingActions((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [user.user_id]: _omit, ...rest } = prev;
          return rest;
        });
      }
    },
    [currentUserId, pendingActions, toggleUserStatusMutation]
  );

  const handleHardDelete = React.useCallback(
    async (user: UserListItem) => {
      if (pendingActions[user.user_id]) return;
      if (user.user_id === currentUserId) {
        toast.error('You cannot delete your own account');
        return;
      }

      const confirmed = window.confirm(
        `This will permanently delete ${user.name ?? user.email}. Continue?`
      );
      if (!confirmed) {
        return;
      }

      setPendingActions((prev) => ({
        ...prev,
        [user.user_id]: 'delete',
      }));
      try {
        await deleteUserMutation.mutateAsync(user.user_id);
        setUsers((prev) => prev.filter((item) => item.user_id !== user.user_id));
        toast.success('User deleted');
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete user'
        );
      } finally {
        setPendingActions((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [user.user_id]: _omit, ...rest } = prev;
          return rest;
        });
      }
    },
    [currentUserId, deleteUserMutation, pendingActions]
  );

  const columns = React.useMemo<ColumnDef<UserListItem>[]>(
    () =>
      createUserColumns({
        onEdit: (user) => {
          if (!canManage) return;
          setEditingUser(user);
        },
        onToggleStatus: (user) => {
          if (!canManage) return;
          void handleToggleStatus(user);
        },
        onDelete: (user) => {
          if (!canManage) return;
          void handleHardDelete(user);
        },
        onResetPassword: (user) => {
          if (!canManage) return;
          void handleResetPassword(user);
        },
        pendingActions,
        canManage,
        currentUserId,
      }),
    [
      canManage,
      currentUserId,
      handleHardDelete,
      handleResetPassword,
      handleToggleStatus,
      pendingActions,
    ]
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: initialMeta.pagination.pageSize,
      },
    },
  });

  React.useEffect(() => {
    table.setPageIndex(0);
  }, [normalizedSearch, role, status, table]);

  const showReset =
    status !== 'all' || role !== 'all' || normalizedSearch.length > 0;

  const roles = (rolesQuery.data ?? initialRoles).filter((item) =>
    isManagedRole(item.name)
  );

  const handleInviteSubmit = React.useCallback(
    async (payload: InviteFormState) => {
      setInviteOpen(false);
      try {
        const created = await createUserMutation.mutateAsync({
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          role: payload.role,
          password: payload.password,
        });
        setUsers((prev) => upsertUserLocally(prev, created));
        toast.success('User created');
      } catch (error) {
        setInviteOpen(true);
        toast.error(
          error instanceof Error ? error.message : 'Failed to create user'
        );
      }
    },
    [createUserMutation]
  );

  const handleUpdateSubmit = React.useCallback(
    async (payload: EditFormState) => {
      if (!editingUser) return;
      if (pendingActions[editingUser.user_id]) return;

      const previous = editingUser;
      const targetId = editingUser.user_id;
      const optimisticUser: UserListItem = {
        ...editingUser,
        name: payload.name,
        phone: payload.phone,
        role: payload.role,
        is_active: payload.isActive,
      };

      setPendingActions((prev) => ({
        ...prev,
        [targetId]: 'update',
      }));
      setEditingUser(null);
      setUsers((prev) => upsertUserLocally(prev, optimisticUser));

      try {
        await updateUserMutation.mutateAsync({
          userId: editingUser.user_id,
          input: {
            name: payload.name,
            phone: payload.phone,
            role: payload.role,
            isActive: payload.isActive,
          },
        });
        toast.success('User updated');
      } catch (error) {
        setUsers((prev) => upsertUserLocally(prev, previous));
        setEditingUser(previous);
        toast.error(
          error instanceof Error ? error.message : 'Failed to update user'
        );
      } finally {
        setPendingActions((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [targetId]: _omit, ...rest } = prev;
          return rest;
        });
      }
    },
    [editingUser, pendingActions, updateUserMutation]
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="w-full px-12">
              <div className="flex items-center py-4">
                <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <Input
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="max-w-sm"
                    disabled={isLoading}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    {isSyncing && !isInitialLoading ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <IconLoader2 className="size-3 animate-spin" />
                        Syncing…
                      </div>
                    ) : null}
                    {showReset ? (
                      <Button
                        variant="outline"
                        className="text-muted-foreground"
                        onClick={handleResetFilters}
                        disabled={isLoading}
                      >
                        <IconX className="size-4" />
                      </Button>
                    ) : null}
                    <DataTableSelectFilter
                      value={status}
                      onValueChange={setStatus}
                      disabled={isLoading}
                      placeholder="Status"
                      options={[
                        { label: 'All Status', value: 'all' },
                        { label: 'Active', value: 'active' },
                        { label: 'Inactive', value: 'inactive' },
                      ]}
                    />
                    <DataTableSelectFilter
                      value={role}
                      onValueChange={setRole}
                      disabled={isLoading}
                      placeholder="Role"
                      options={[
                        { label: 'All Roles', value: 'all' },
                        { label: 'Admin', value: 'admin' },
                        { label: 'Manager', value: 'manager' },
                        { label: 'Staff', value: 'staff' },
                      ]}
                    />
                    {canManage ? (
                      <Button onClick={() => setInviteOpen(true)}>
                        <IconPlus className="size-4" />
                        <span className="hidden lg:inline">Add User</span>
                        <span className="lg:hidden">Add User</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border">
                <DataTableContent
                  table={table}
                  isLoading={isInitialLoading && filteredUsers.length === 0}
                />
              </div>

              <div className="mt-4">
                <DataTablePagination table={table} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {canManage ? (
        <InviteUserSheet
          open={isInviteOpen}
          onOpenChange={setInviteOpen}
          onSubmit={handleInviteSubmit}
          isSubmitting={createUserMutation.isPending}
          roles={roles}
        />
      ) : null}

      {canManage ? (
        <EditUserSheet
          user={editingUser}
          onOpenChange={setEditingUser}
          onSubmit={handleUpdateSubmit}
          isSubmitting={updateUserMutation.isPending}
          roles={roles}
        />
      ) : null}
    </div>
  );
}

type InviteUserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: InviteFormState) => Promise<void>;
  isSubmitting: boolean;
  roles: Array<{ id: string; name: string }>;
};

function InviteUserSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  roles,
}: InviteUserSheetProps) {
  const [formState, setFormState] = React.useState<InviteFormState>({
    email: '',
    name: '',
    phone: '',
    role: DEFAULT_ROLE,
    password: '',
  });
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFormState({
        email: '',
        name: '',
        phone: '',
        role: DEFAULT_ROLE,
        password: '',
      });
      setShowPassword(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentFormState = formState;
    if (!currentFormState) {
      return;
    }
    await onSubmit(currentFormState);
  }

  const roleOptions: ManagedRole[] =
    roles.length > 0
      ? roles.map((role) => role.name).filter(isManagedRole)
      : [...MANAGED_ROLES];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Invite User</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={formState.email}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-name">Full name</Label>
            <Input
              id="invite-name"
              required
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Barista Manager"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-phone">Phone</Label>
            <Input
              id="invite-phone"
              required
              value={formState.phone}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
              placeholder="08xxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formState.role}
              onValueChange={(value) =>
                setFormState((prev) =>
                  isManagedRole(value)
                    ? {
                        ...prev,
                        role: value,
                      }
                    : prev
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((roleName) => (
                  <SelectItem key={roleName} value={roleName}>
                    {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-password">Temporary password</Label>
            <div className="relative">
              <Input
                id="invite-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formState.password}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Minimum 8 characters"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 mr-1 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <SheetFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

type EditUserSheetProps = {
  user: UserListItem | null;
  onOpenChange: (user: UserListItem | null) => void;
  onSubmit: (payload: EditFormState) => Promise<void>;
  isSubmitting: boolean;
  roles: Array<{ id: string; name: string }>;
};

function EditUserSheet({
  user,
  onOpenChange,
  onSubmit,
  isSubmitting,
  roles,
}: EditUserSheetProps) {
  const [formState, setFormState] = React.useState<EditFormState | null>(null);

  React.useEffect(() => {
    if (user) {
      setFormState({
        name: user.name ?? '',
        phone: user.phone ?? '',
        role: isManagedRole(user.role) ? user.role : DEFAULT_ROLE,
        isActive: user.is_active,
      });
    } else {
      setFormState(null);
    }
  }, [user]);

  if (!user || !formState) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentFormState = formState;
    if (!currentFormState) {
      return;
    }
    await onSubmit(currentFormState);
  }

  const roleOptions: ManagedRole[] =
    roles.length > 0
      ? roles.map((role) => role.name).filter(isManagedRole)
      : [...MANAGED_ROLES];

  return (
    <Sheet open={Boolean(user)} onOpenChange={() => onOpenChange(null)}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full name</Label>
            <Input
              id="edit-name"
              required
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) =>
                  prev
                    ? {
                        ...prev,
                        name: event.target.value,
                      }
                    : prev
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={formState.phone}
              onChange={(event) =>
                setFormState((prev) =>
                  prev
                    ? {
                        ...prev,
                        phone: event.target.value,
                      }
                    : prev
                )
              }
              placeholder="08xxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formState.role}
              onValueChange={(value) =>
                setFormState((prev) =>
                  prev && isManagedRole(value)
                    ? {
                        ...prev,
                        role: value,
                      }
                    : prev
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((roleName) => (
                  <SelectItem key={roleName} value={roleName}>
                    {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={formState.isActive}
              onCheckedChange={(checked) =>
                setFormState((prev) =>
                  prev
                    ? {
                        ...prev,
                        isActive: Boolean(checked),
                      }
                    : prev
                )
              }
            />
            Active
          </label>
          <SheetFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
