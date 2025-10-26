import { AppError, ERR } from "@/lib/utils/errors";

import type { UserListItem } from "./types";

export type ListUsersParams = {
  page?: number;
  pageSize?: number;
  status?: "all" | "active" | "inactive";
  role?: "admin" | "manager" | "staff" | null;
  search?: string;
};

type ApiResponse<TData> = {
  data: TData;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

type ListUsersResponse = {
  items: UserListItem[];
};

type RolesResponse = {
  roles: Array<{ id: string; name: string }>;
};

export async function listUsers(params: ListUsersParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.status) searchParams.set("status", params.status);
  if (params.role) searchParams.set("role", params.role);
  if (params.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  const url = `/api/users${query ? `?${query}` : ""}`;

  const response = await request<ListUsersResponse>(url, { method: "GET" });
  return {
    items: response.data.items,
    meta: response.meta,
  };
}

export async function fetchRoles() {
  const { data } = await request<RolesResponse>("/api/users/roles", {
    method: "GET",
  });
  return data.roles;
}

export async function createUser(input: {
  email: string;
  name: string;
  phone: string;
  role: "admin" | "manager" | "staff";
  password: string;
}) {
  const { data } = await request<UserListItem>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateUser(
  userId: string,
  input: Partial<{
    name: string;
    phone: string;
    role: "admin" | "manager" | "staff";
    isActive: boolean;
  }>,
) {
  const { data } = await request<UserListItem>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data;
}

export async function getUser(userId: string) {
  try {
    const { data } = await request<UserListItem>(`/api/users/${userId}`, {
      method: "GET",
    });
    return data;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === ERR.NOT_FOUND.statusCode) {
      return null;
    }
    throw error;
  }
}

export async function setUserActiveStatus(userId: string, isActive: boolean) {
  return updateUser(userId, { isActive });
}

export async function deleteUser(userId: string) {
  const { data } = await request<{ success: boolean }>(
    `/api/users/${userId}`,
    {
      method: "DELETE",
    },
  );
  return data;
}

export async function resetUserPassword(
  userId: string,
  input: { redirectTo?: string | null } = {},
) {
  const { data } = await request<{
    resetLink: string | null;
    expiresAt: string | null;
  }>(`/api/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export type UserProfileResponse = {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export async function updateProfile(
  userId: string,
  input: Partial<{
    name: string;
    email: string;
    phone: string | null;
    password: string;
  }>,
) {
  const { data } = await request<UserProfileResponse>(
    `/api/profile/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return data;
}

async function request<T>(input: string, init: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error
        ? error.message
        : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Request failed",
    );
  }

  return {
    data: payload.data,
    meta: payload.meta,
  };
}
