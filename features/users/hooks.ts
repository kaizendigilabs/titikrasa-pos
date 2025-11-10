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
  listUsers,
  resetUserPassword,
  setUserActiveStatus,
  updateUser,
  type ListUsersParams,
} from "./client";
import { createBrowserClient } from "@/lib/supabase/client";

const USERS_QUERY_KEY = "users";
const ROLES_QUERY_KEY = "users-roles";

type UseUsersOptions = {
  initialData?: Awaited<ReturnType<typeof listUsers>>;
};

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
    const filterKey = JSON.stringify(filters ?? {});
    const channelName = `users-dashboard-${filterKey}-${Date.now()}`;
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        invalidate,
      );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [filters, options.enabled, queryClient]);
}
