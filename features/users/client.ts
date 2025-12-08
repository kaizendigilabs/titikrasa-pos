import { apiClient } from "@/lib/api/client";
import { AppError, ERR } from "@/lib/utils/errors";

import type { UserListItem } from "./types";

export type ListUsersParams = {
  page?: number;
  pageSize?: number;
  status?: "all" | "active" | "inactive";
  role?: "admin" | "manager" | "staff" | null;
  search?: string;
};

type ListUsersResponse = {
  items: UserListItem[];
};

type RolesResponse = {
  roles: Array<{ id: string; name: string }>;
};

export type UserProfileResponse = {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
};

type CreateUserInput = {
  email: string;
  name: string;
  phone: string;
  role: "admin" | "manager" | "staff";
  password: string;
};

type UpdateUserInput = Partial<{
  name: string;
  phone: string;
  role: "admin" | "manager" | "staff";
  isActive: boolean;
}>;

type UpdateProfileInput = Partial<{
  name: string;
  email: string;
  phone: string | null;
  password: string;
  avatar: string | null;
}>;

/**
 * Fetches a paginated list of users
 */
export async function listUsers(params: ListUsersParams = {}) {
  const queryParams: Record<string, string> = {};
  
  if (params.page) queryParams.page = String(params.page);
  if (params.pageSize) queryParams.pageSize = String(params.pageSize);
  if (params.status) queryParams.status = params.status;
  if (params.role) queryParams.role = params.role;
  if (params.search) queryParams.search = params.search;

  const { data, meta } = await apiClient.get<ListUsersResponse>(
    "/api/users",
    queryParams
  );
  
  return {
    items: data.items,
    meta,
  };
}

/**
 * Fetches available roles
 */
export async function fetchRoles() {
  const { data } = await apiClient.get<RolesResponse>("/api/users/roles");
  return data.roles;
}

/**
 * Creates a new user
 */
export async function createUser(input: CreateUserInput) {
  const { data } = await apiClient.post<UserListItem>("/api/users", input);
  return data;
}

/**
 * Updates an existing user
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  const { data } = await apiClient.patch<UserListItem>(
    `/api/users/${userId}`,
    input
  );
  return data;
}

/**
 * Fetches a single user by ID
 */
export async function getUser(userId: string) {
  try {
    const { data } = await apiClient.get<UserListItem>(`/api/users/${userId}`);
    return data;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === ERR.NOT_FOUND.statusCode) {
      return null;
    }
    throw error;
  }
}

/**
 * Sets user active status
 */
export async function setUserActiveStatus(userId: string, isActive: boolean) {
  return updateUser(userId, { isActive });
}

/**
 * Deletes a user
 */
export async function deleteUser(userId: string) {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/api/users/${userId}`
  );
  return data;
}

/**
 * Resets user password and returns reset link
 */
export async function resetUserPassword(
  userId: string,
  input: { redirectTo?: string | null } = {},
) {
  const { data } = await apiClient.post<{
    resetLink: string | null;
    expiresAt: string | null;
  }>(`/api/users/${userId}/reset-password`, input);
  return data;
}

/**
 * Updates user profile
 */
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const { data } = await apiClient.patch<UserProfileResponse>(
    `/api/profile/${userId}`,
    input
  );
  return data;
}
