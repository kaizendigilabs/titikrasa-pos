import { apiClient } from "@/lib/api/client";
import type { Database } from "@/lib/types/database";
import type {
  CashFlow,
  CashFlowCategory,
  CashFlowFilters,
  CashFlowSummary,
} from "./types";
import type { CreateCashFlowSchema, UpdateCashFlowSchema, CreateCategorySchema } from "./schemas";

const API_ENDPOINT = "/api/finance/cash-flows";
const CATEGORIES_ENDPOINT = "/api/finance/categories";


function transformCashFlow(
  row: Database["public"]["Tables"]["cash_flows"]["Row"] & {
    cash_flow_categories: Database["public"]["Tables"]["cash_flow_categories"]["Row"];
  }
): CashFlow {
  return {
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    categoryId: row.category_id,
    categoryName: row.cash_flow_categories.name,
    categoryType: row.cash_flow_categories.type,
    description: row.description,
    orderId: row.order_id,
    purchaseOrderId: row.purchase_order_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function listCashFlows(filters: CashFlowFilters) {
  const params: Record<string, string> = {
    page: String(filters.page || 1),
    pageSize: String(filters.pageSize || 50),
  };

  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.type && filters.type !== "all") params.type = filters.type;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.search) params.search = filters.search;

  const { data, meta } = await apiClient.get<
    (Database["public"]["Tables"]["cash_flows"]["Row"] & {
      cash_flow_categories: Database["public"]["Tables"]["cash_flow_categories"]["Row"];
    })[]
  >(API_ENDPOINT, params);

  return {
    items: data.map(transformCashFlow),
    meta: {
      pagination: meta?.pagination ?? { page: 1, pageSize: 50, total: 0 },
    },
    summary: {
      totalIn: Number((meta as any)?.summary?.total_in || 0),
      totalOut: Number((meta as any)?.summary?.total_out || 0),
      net: Number((meta as any)?.summary?.total_in || 0) - Number((meta as any)?.summary?.total_out || 0),
    } as CashFlowSummary,
  };
}

export async function listCategories() {
  const { data } = await apiClient.get<{
    data: Database["public"]["Tables"]["cash_flow_categories"]["Row"][];
  }>(CATEGORIES_ENDPOINT);

  return data.data.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    isSystem: row.is_system,
    createdAt: row.created_at,
  }) as CashFlowCategory);
}

export async function createCashFlow(payload: CreateCashFlowSchema) {
  const { data } = await apiClient.post<{
    data: Database["public"]["Tables"]["cash_flows"]["Row"];
  }>(API_ENDPOINT, {
    ...payload,
    date: payload.date.toISOString(),
  });
  return data.data;
}

export async function updateCashFlow(id: string, payload: UpdateCashFlowSchema) {
  const { data } = await apiClient.patch<{
    data: Database["public"]["Tables"]["cash_flows"]["Row"];
  }>(`${API_ENDPOINT}/${id}`, {
    ...payload,
    date: payload.date ? payload.date.toISOString() : undefined,
  });
  return data.data;
}

export async function deleteCashFlow(id: string) {
  await apiClient.delete(`${API_ENDPOINT}/${id}`);
}

export async function createCategory(payload: CreateCategorySchema) {
  const { data } = await apiClient.post<{
    data: Database["public"]["Tables"]["cash_flow_categories"]["Row"];
  }>(CATEGORIES_ENDPOINT, payload);
  return data.data;
}

export async function deleteCategory(id: string) {
  await apiClient.delete(`${CATEGORIES_ENDPOINT}/${id}`);
}
