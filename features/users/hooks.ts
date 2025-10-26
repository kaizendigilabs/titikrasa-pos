import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import {
  createUser,
  deleteUser,
  fetchRoles,
  getUser,
  listUsers,
  resetUserPassword,
  setUserActiveStatus,
  updateUser,
  type ListUsersParams,
} from "./client";
import type { UserListItem } from "./types";
import { createBrowserClient } from "@/lib/supabase/client";

const USERS_QUERY_KEY = "users";
const ROLES_QUERY_KEY = "users-roles";

type UseUsersOptions = {
  initialData?: Awaited<ReturnType<typeof listUsers>>;
};

type UsersQueryData = Awaited<ReturnType<typeof listUsers>>;

function sortUsersByCreatedAt(users: UserListItem[]) {
  return [...users].sort((a, b) => {
    const aTime = a.created_at ? Date.parse(a.created_at) : 0;
    const bTime = b.created_at ? Date.parse(b.created_at) : 0;
    return bTime - aTime;
  });
}

function upsertUserInList(list: UserListItem[], user: UserListItem) {
  const index = list.findIndex((item) => item.user_id === user.user_id);
  if (index === -1) {
    return sortUsersByCreatedAt([...list, user]);
  }

  const next = [...list];
  next[index] = user;
  return sortUsersByCreatedAt(next);
}

function removeUserFromList(list: UserListItem[], userId: string) {
  return list.filter((item) => item.user_id !== userId);
}

function adjustMetaTotal(
  meta: UsersQueryData["meta"],
  delta: number,
): UsersQueryData["meta"] {
  if (!meta) return meta;
  const pagination = (meta as {
    pagination?: { total?: number };
  }).pagination;
  const total = pagination?.total;
  if (typeof total !== "number") {
    return meta;
  }

  return {
    ...meta,
    pagination: {
      ...pagination,
      total: Math.max(total + delta, 0),
    },
  };
}

export function useUsers(
  filters: ListUsersParams,
  options: UseUsersOptions = {},
) {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, filters],
    queryFn: () => listUsers(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    ...(options.initialData !== undefined
      ? { initialData: options.initialData }
      : {}),
  });
}

type UseRolesOptions = {
  initialData?: Awaited<ReturnType<typeof fetchRoles>>;
};

export function useRoles(options: UseRolesOptions = {}) {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: () => fetchRoles(),
    staleTime: 1000 * 60 * 5,
    ...(options.initialData !== undefined
      ? { initialData: options.initialData }
      : {}),
  });
}

export function useCreateUserMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useUpdateUserMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: Parameters<typeof updateUser>[1];
    }) => updateUser(userId, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useToggleUserStatusMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => setUserActiveStatus(userId, isActive),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useDeleteUserMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({
      userId,
      redirectTo,
    }: {
      userId: string;
      redirectTo?: string | null;
    }) => resetUserPassword(userId, { redirectTo }),
  });
}

export function useUsersQueryKey() {
  return useCallback((filters: ListUsersParams = {}) => {
    return [USERS_QUERY_KEY, filters] as const;
  }, []);
}

type UseUsersRealtimeOptions = {
  enabled?: boolean;
  onUserUpsert?: (user: UserListItem) => void;
  onUserDelete?: (userId: string) => void;
};

export function useUsersRealtime(
  filters: ListUsersParams,
  options: UseUsersRealtimeOptions = {},
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (options.enabled === false) return;

    const supabase = createBrowserClient();
    const queryKey = [USERS_QUERY_KEY, filters] as const;
    const pending = new Set<string>();

    const upsertUser = (user: UserListItem) => {
      queryClient.setQueryData<UsersQueryData | undefined>(
        queryKey,
        (current) => {
          if (!current) return current;
          const existed = current.items.some(
            (item) => item.user_id === user.user_id,
          );
          const items = upsertUserInList(current.items, user);
          const meta =
            existed || !current.meta
              ? current.meta
              : adjustMetaTotal(current.meta, 1);
          return { ...current, items, meta };
        },
      );
      options.onUserUpsert?.(user);
    };

    const removeUser = (userId: string) => {
      queryClient.setQueryData<UsersQueryData | undefined>(
        queryKey,
        (current) => {
          if (!current) return current;
          const existed = current.items.some(
            (item) => item.user_id === userId,
          );
          if (!existed) {
            return current;
          }
          const items = removeUserFromList(current.items, userId);
          const meta = current.meta
            ? adjustMetaTotal(current.meta, -1)
            : current.meta;
          return { ...current, items, meta };
        },
      );
      options.onUserDelete?.(userId);
    };

    const refreshUser = async (userId: string) => {
      if (!userId || pending.has(userId)) return;
      pending.add(userId);
      try {
        const user = await getUser(userId);
        if (user) {
          upsertUser(user);
        } else {
          removeUser(userId);
        }
      } catch (error) {
        console.error("[USERS_REALTIME_SYNC_ERROR]", error);
      } finally {
        pending.delete(userId);
      }
    };

    const channelName = `users-dashboard-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          const userId =
            (payload.new as { user_id?: string } | null)?.user_id ??
            (payload.old as { user_id?: string } | null)?.user_id;

          if (!userId) return;

          if (payload.eventType === "DELETE") {
            removeUser(userId);
          } else {
            void refreshUser(userId);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        (payload) => {
          const userId =
            (payload.new as { user_id?: string } | null)?.user_id ??
            (payload.old as { user_id?: string } | null)?.user_id;
          if (!userId) return;
          void refreshUser(userId);
        },
      );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [filters, options, options.enabled, options.onUserDelete, options.onUserUpsert, queryClient]);
}
