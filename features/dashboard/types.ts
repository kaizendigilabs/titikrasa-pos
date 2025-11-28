import type { DateRangeType } from "@/lib/utils/date-helpers";

export type DashboardRangePayload = {
  range: DateRangeType;
  start: string;
  end: string;
  granularity: "hourly" | "daily" | "monthly";
  limits?: {
    orders?: number;
    transactions?: number;
    lowStock?: number;
    receivables?: number;
    pendingPurchaseOrders?: number;
  };
  includeLowStock?: boolean;
  includeReceivables?: boolean;
  includePendingPurchaseOrders?: boolean;
  includeTransactions?: boolean;
};

export type DashboardMetricSummary = {
  revenue: number;
  expenses: number;
  aov: number;
  netProfit: number;
  totalOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  voidOrders: number;
  kdsPending: number;
  lowStockCount: number;
  resellerReceivables: number;
  pendingPurchaseOrders: number;
};

export type DashboardChartPoint = {
  date: string;
  revenue: number;
};

export type DashboardTransaction = {
  id: string;
  number: string;
  channel: string;
  paymentStatus: string;
  createdAt: string;
  grandTotal: number;
};

export type DashboardLowStock = {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  baseUom: string;
};

export type DashboardReceivable = {
  id: string;
  number: string;
  resellerName: string | null;
  dueDate: string | null;
  grandTotal: number;
};

export type DashboardPendingPO = {
  id: string;
  status: string;
  issuedAt: string | null;
  totals: number;
};

export type DashboardSummary = {
  metrics: DashboardMetricSummary;
  chart: DashboardChartPoint[];
  transactions: DashboardTransaction[];
  lowStock: DashboardLowStock[];
  receivables: DashboardReceivable[];
  pendingPurchaseOrders: DashboardPendingPO[];
  generatedAt: string;
};

export type DashboardSummaryResponse = {
  data: {
    summary: DashboardSummary;
  };
  meta: {
    range: DateRangeType;
    start: string;
    end: string;
    generatedAt: string;
  };
};

export type DashboardOrdersListResult = {
  items: DashboardTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};
