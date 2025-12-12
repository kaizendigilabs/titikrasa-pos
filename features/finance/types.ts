import type { Database, Tables } from "@/lib/types/database";

export type CashFlowCategoryRow = Tables<"cash_flow_categories">;
export type CashFlowRow = Tables<"cash_flows">;

export type CashFlowType = Database["public"]["Enums"]["cash_flow_type"];

export type CashFlowCategory = {
  id: string;
  name: string;
  type: CashFlowType;
  isSystem: boolean;
  createdAt: string;
};

export type CashFlow = {
  id: string;
  date: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  categoryType: CashFlowType;
  description: string | null;
  orderId: string | null;
  purchaseOrderId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CashFlowFilters = {
  startDate?: string | null;
  endDate?: string | null;
  type?: CashFlowType | "all";
  categoryId?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
};

export type CashFlowSummary = {
  totalIn: number;
  totalOut: number;
  net: number;
};
