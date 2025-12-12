import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";

import { CACHE_POLICIES } from "@/lib/api/cache-policies";

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

const USERS_QUERY_KEY = "users";
const ROLES_QUERY_KEY = "users-roles";

type UseUsersOptions = {
  initialData?: Awaited<ReturnType<typeof listUsers>>;
};

/**
 * Hook for fetching users list
 */
export function useUsers(
  filters: ListUsersParams,
  options: UseUsersOptions = {},
) {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, filters],
    queryFn: () => listUsers(filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.STATIC,
    retry: 1,
    ...(options.initialData !== undefined
      ? { initialData: options.initialData }
      : {}),
  });
}

type UseRolesOptions = {
  initialData?: Awaited<ReturnType<typeof fetchRoles>>;
};

/**
 * Hook for fetching user roles
 */
export function useRoles(options: UseRolesOptions = {}) {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: () => fetchRoles(),
    ...CACHE_POLICIES.PERMANENT,
    ...(options.initialData !== undefined
      ? { initialData: options.initialData }
      : {}),
  });
}

/**
 * Hook for creating a user
 */
/**
 * Hook for creating a user
 */
export function useCreateUserMutation() {
  const client = useQueryClient();
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

/**
 * Hook for updating a user
 */
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
    onMutate: async ({ userId, input }) => {
        await client.cancelQueries({ queryKey: [USERS_QUERY_KEY] });
        
        client.setQueriesData({ queryKey: [USERS_QUERY_KEY] }, (old: any) => {
            if (!old || !old.items) return old;
            return {
                ...old,
                items: old.items.map((item: any) => 
                    item.id === userId ? { ...item, ...input } : item
                )
            };
        });
    },
    onSuccess: () => {
      // confirm
    },
    onError: () => {
        void client.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    }
  });
}

/**
 * Hook for toggling user status
 */
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
    onMutate: async ({ userId, isActive }) => {
        await client.cancelQueries({ queryKey: [USERS_QUERY_KEY] });
        
        client.setQueriesData({ queryKey: [USERS_QUERY_KEY] }, (old: any) => {
            if (!old || !old.items) return old;
            return {
                ...old,
                items: old.items.map((item: any) => 
                    item.id === userId ? { ...item, is_active: isActive } : item
                )
            };
        });
    },
    onSuccess: () => {
      // confirm
    },
    onError: () => {
        void client.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    }
  });
}

/**
 * Hook for deleting a user
 */
export function useDeleteUserMutation() {
  const client = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onMutate: async (userId) => {
        await client.cancelQueries({ queryKey: [USERS_QUERY_KEY] });
        
        client.setQueriesData({ queryKey: [USERS_QUERY_KEY] }, (old: any) => {
            if (!old || !old.items) return old;
            return {
                ...old,
                items: old.items.filter((item: any) => item.id !== userId)
            };
        });
    },
    onSuccess: () => {
      // confirm
    },
    onError: () => {
        void client.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    }
  });
}

/**
 * Hook for resetting user password
 */
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

/**
 * Hook for getting users query key
 */
export function useUsersQueryKey() {
  return useCallback((filters: ListUsersParams = {}) => {
    return [USERS_QUERY_KEY, filters] as const;
  }, []);
}
