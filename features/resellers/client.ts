import type { ResellerListItem } from "./types";
import type {
  CreateResellerPayload,
  ResellerFilters,
  UpdateResellerPayload,
} from "./schemas";
import { parseContact, parseTerms } from "./types";
import { AppError, ERR } from "@/lib/utils/errors";

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

export type ResellerListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters?: Record<string, unknown> | null;
};

export type ResellerListResponse = {
  items: ResellerListItem[];
};

function transformListItem(payload: any): ResellerListItem {
  return {
    id: payload.id,
    name: payload.name,
    contact: parseContact(payload.contact),
    terms: parseTerms(payload.terms),
    is_active: payload.is_active,
    created_at: payload.created_at,
  };
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
      error instanceof Error ? error.message : "Unexpected response from server",
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

export async function listResellers(
  filters: ResellerFilters,
): Promise<{ items: ResellerListItem[]; meta: ResellerListMeta | null }> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));
  if (filters.search) {
    searchParams.set("search", filters.search);
  }
  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }

  const response = await request<ResellerListResponse>(
    `/api/resellers?${searchParams.toString()}`,
    { method: "GET" },
  );

  return {
    items: response.data.items.map(transformListItem),
    meta: (response.meta as ResellerListMeta | null) ?? null,
  };
}

export async function createReseller(
  input: CreateResellerPayload,
): Promise<ResellerListItem> {
  const { data } = await request<{ reseller: ResellerListItem }>(
    "/api/resellers",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return transformListItem(data.reseller);
}

export async function updateReseller(
  resellerId: string,
  input: UpdateResellerPayload,
): Promise<ResellerListItem> {
  const { data } = await request<{ reseller: ResellerListItem }>(
    `/api/resellers/${resellerId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return transformListItem(data.reseller);
}

export async function toggleResellerStatus(resellerId: string, isActive: boolean) {
  const { data } = await request<{ reseller: ResellerListItem }>(
    `/api/resellers/${resellerId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
  );
  return transformListItem(data.reseller);
}

export async function deleteReseller(resellerId: string): Promise<void> {
  await request<{ success: boolean }>(`/api/resellers/${resellerId}`, {
    method: "DELETE",
  });
}
