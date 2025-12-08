import { apiClient } from "@/lib/api/client";

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

/**
 * Fetches dashboard summary metrics
 */
export async function fetchDashboardSummary(range: DateRangeType): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummaryApiResponse>(
    "/api/dashboard/metrics",
    { range }
  );
  return data.summary;
}

/**
 * Fetches dashboard orders with pagination
 */
export async function fetchDashboardOrders(
  params: DashboardOrdersQueryParams,
): Promise<DataTableQueryResult<DashboardTransaction>> {
  const { data, meta } = await apiClient.get<DashboardTransaction[]>(
    "/api/dashboard/orders",
    {
      range: params.range,
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    }
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
