import { queryOptions } from "@tanstack/react-query";

import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";
import type { DateRangeType } from "@/lib/utils/date-helpers";
import type { DashboardSummary, DashboardTransaction } from "./types";

type DashboardSummaryApiResponse = {
  summary: DashboardSummary;
};

type DashboardOrdersApiMeta = {
  pagination?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
};

export type DashboardOrdersQueryParams = {
  range: DateRangeType;
  page: number;
  pageSize: number;
};

const DASHBOARD_SUMMARY_ERROR = "Gagal memuat ringkasan dashboard";
const DASHBOARD_ORDERS_ERROR = "Gagal memuat riwayat order";

async function fetchJson<T>(url: string, fallbackMessage: string): Promise<{
  data: T;
  meta: Record<string, unknown> | null;
}> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? fallbackMessage);
  }

  return { data: payload?.data as T, meta: payload?.meta ?? null };
}

async function fetchDashboardSummary(range: DateRangeType): Promise<DashboardSummary> {
  const params = new URLSearchParams({ range });
  const { data } = await fetchJson<DashboardSummaryApiResponse>(
    `/api/dashboard/metrics?${params.toString()}`,
    DASHBOARD_SUMMARY_ERROR,
  );
  return data.summary;
}

async function fetchDashboardOrders(
  params: DashboardOrdersQueryParams,
): Promise<DataTableQueryResult<DashboardTransaction>> {
  const searchParams = new URLSearchParams({
    range: params.range,
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
  });

  const { data, meta } = await fetchJson<DashboardTransaction[]>(
    `/api/dashboard/orders?${searchParams.toString()}`,
    DASHBOARD_ORDERS_ERROR,
  );

  const pagination = (meta as DashboardOrdersApiMeta | null)?.pagination ?? null;

  return {
    items: data ?? [],
    meta: pagination
      ? {
          pagination: {
            page: pagination.page ?? params.page,
            pageSize: pagination.pageSize ?? params.pageSize,
            total: pagination.total ?? (data?.length ?? 0),
          },
        }
      : null,
  };
}

export const dashboardSummaryQueryKey = (range: DateRangeType) =>
  ["dashboard-summary", range] as const;

export function dashboardSummaryQueryOptions(range: DateRangeType) {
  return queryOptions({
    queryKey: dashboardSummaryQueryKey(range),
    queryFn: () => fetchDashboardSummary(range),
    staleTime: 60 * 1000,
  });
}

export const dashboardOrdersQueryKey = (params: DashboardOrdersQueryParams) =>
  ["dashboard-orders", params.range, params.page, params.pageSize] as const;

export function dashboardOrdersQueryOptions(params: DashboardOrdersQueryParams) {
  return queryOptions({
    queryKey: dashboardOrdersQueryKey(params),
    queryFn: () => fetchDashboardOrders(params),
    staleTime: 30 * 1000,
  });
}
