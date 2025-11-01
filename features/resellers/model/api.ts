import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/client";

import { mapResellerRow, type RawResellerRow } from "../data/dto";
import type { ResellerListItem } from "../types";
import type {
  CreateResellerPayload,
  ResellerFilters,
  UpdateResellerPayload,
} from "./forms/schema";

export type ResellerListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters?: Record<string, unknown> | null;
};

export type ResellerListResponse = {
  items: RawResellerRow[];
};

type ResellerPayload = {
  reseller: RawResellerRow;
};

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

  const { data, meta } = await apiRequest<ResellerListResponse>(
    `/api/resellers?${searchParams.toString()}`,
    { method: "GET" },
  );

  return {
    items: data.items.map(mapResellerRow),
    meta: (meta as ResellerListMeta | null) ?? null,
  };
}

export async function createReseller(
  input: CreateResellerPayload,
): Promise<ResellerListItem> {
  const { data }: ApiResult<ResellerPayload> = await apiRequest(
    "/api/resellers",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return mapResellerRow(data.reseller);
}

export async function updateReseller(
  resellerId: string,
  input: UpdateResellerPayload,
): Promise<ResellerListItem> {
  const { data }: ApiResult<ResellerPayload> = await apiRequest(
    `/api/resellers/${resellerId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return mapResellerRow(data.reseller);
}

export async function toggleResellerStatus(
  resellerId: string,
  isActive: boolean,
): Promise<ResellerListItem> {
  const { data }: ApiResult<ResellerPayload> = await apiRequest(
    `/api/resellers/${resellerId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
  );

  return mapResellerRow(data.reseller);
}

export async function deleteReseller(resellerId: string): Promise<void> {
  await apiRequest(`/api/resellers/${resellerId}` as const, {
    method: "DELETE",
    parseJson: false,
  });
}
