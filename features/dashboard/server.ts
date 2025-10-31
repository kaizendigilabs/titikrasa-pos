import { format, startOfDay, startOfHour, startOfMonth } from "date-fns";

import type { ActorContext } from "@/features/users/server";
import { parseTicketItems, parseTotals } from "@/features/orders/types";
import type { Json, Database } from "@/lib/types/database";
import type {
  DashboardSummary,
  DashboardMetricSummary,
  DashboardChartPoint,
  DashboardTransaction,
  DashboardLowStock,
  DashboardReceivable,
  DashboardPendingPO,
  DashboardRangePayload,
} from "./types";

type RawDashboardOrder = Database["public"]["Tables"]["orders"]["Row"] & {
  resellers?: { id: string; name: string } | null;
  kds_tickets: Array<{ items: Json; created_at: string }>;
};

function createEmptyMetrics(): DashboardMetricSummary {
  return {
    revenue: 0,
    expenses: 0,
    aov: 0,
    netProfit: 0,
    totalOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0,
    voidOrders: 0,
    kdsPending: 0,
    lowStockCount: 0,
    resellerReceivables: 0,
    pendingPurchaseOrders: 0,
  };
}

export async function fetchDashboardSummary(
  actor: ActorContext,
  payload: DashboardRangePayload,
): Promise<DashboardSummary> {
  const metrics = createEmptyMetrics();
  const [ordersData, completedPoData, pipelinePoData, lowStockData, receivablesData] = await Promise.all([
    actor.supabase
      .from("orders")
      .select(
        `
        id,
        number,
        channel,
        payment_status,
        status,
        totals,
        created_at,
        due_date,
        reseller_id,
        resellers ( id, name ),
        kds_tickets ( items, created_at )
      `,
      )
      .gte("created_at", payload.start)
      .lte("created_at", payload.end)
      .order("created_at", { ascending: false })
      .limit(200),
    actor.supabase
      .from("purchase_orders")
      .select("id, status, completed_at, totals")
      .eq("status", "complete")
      .gte("completed_at", payload.start)
      .lte("completed_at", payload.end),
    actor.supabase
      .from("purchase_orders")
      .select("id, status, issued_at, totals")
      .in("status", ["pending", "draft"])
      .order("issued_at", { ascending: false })
      .limit(10),
    actor.supabase
      .from("store_ingredients")
      .select("id, name, current_stock, min_stock, base_uom")
      .eq("is_active", true)
      .order("current_stock", { ascending: true })
      .limit(10),
    actor.supabase
      .from("orders")
      .select("id, number, totals, due_date, reseller_id, resellers ( id, name ), payment_status, created_at")
      .eq("channel", "reseller")
      .eq("payment_status", "unpaid")
      .order("due_date", { ascending: true })
      .limit(20),
  ]);

  if (ordersData.error) {
    throw ordersData.error;
  }
  if (completedPoData.error) {
    throw completedPoData.error;
  }
  if (pipelinePoData.error) {
    throw pipelinePoData.error;
  }
  if (lowStockData.error) {
    throw lowStockData.error;
  }
  if (receivablesData.error) {
    throw receivablesData.error;
  }

  const orders = (ordersData.data ?? []) as RawDashboardOrder[];

  const chartBucket = new Map<string, { label: string; date: Date; revenue: number }>();
  const transactions: DashboardTransaction[] = [];

  metrics.totalOrders = orders.length;

  for (const order of orders) {
    const totals = parseTotals(order.totals as Json);
    const createdAt = new Date(order.created_at);
    transactions.push({
      id: order.id,
      number: order.number,
      channel: order.channel,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      grandTotal: totals.grand,
    });

    if (order.payment_status === "paid") {
      metrics.paidOrders += 1;
      metrics.revenue += totals.grand;
    } else if (order.payment_status === "unpaid") {
      metrics.unpaidOrders += 1;
    } else if (order.payment_status === "void") {
      metrics.voidOrders += 1;
    }

    const bucketDate = getBucketDate(createdAt, payload.granularity);
    const key = bucketDate.toISOString();
    const label = formatBucketLabel(bucketDate, payload.granularity);
    const bucket = chartBucket.get(key) ?? { label, date: bucketDate, revenue: 0 };
    bucket.revenue += totals.grand;
    chartBucket.set(key, bucket);

    const tickets = order.kds_tickets ?? [];
    for (const ticket of tickets) {
      const items = parseTicketItems(ticket.items);
      metrics.kdsPending += items.filter((item) => item.status !== "served").length;
    }
  }

  metrics.aov = metrics.paidOrders > 0 ? Math.round(metrics.revenue / metrics.paidOrders) : 0;

  const chart: DashboardChartPoint[] = Array.from(chartBucket.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({ date: entry.label, revenue: entry.revenue }));

  const completedPurchaseOrders = completedPoData.data ?? [];
  for (const entry of completedPurchaseOrders) {
    const totals = parseTotals(entry.totals as Json);
    metrics.expenses += totals.grand;
  }

  const pipelinePurchaseOrders = pipelinePoData.data ?? [];
  metrics.pendingPurchaseOrders = pipelinePurchaseOrders.length;

  metrics.netProfit = metrics.revenue - metrics.expenses;

  const lowStock: DashboardLowStock[] = (lowStockData.data ?? [])
    .filter((item) => item.min_stock > 0 && item.current_stock <= item.min_stock)
    .map((item) => ({
      id: item.id,
      name: item.name,
      currentStock: item.current_stock,
      minStock: item.min_stock,
      baseUom: item.base_uom,
    }));

  metrics.lowStockCount = lowStock.length;

  const receivables: DashboardReceivable[] = (receivablesData.data ?? []).map((order) => ({
    id: order.id,
    number: order.number,
    resellerName: order.resellers?.name ?? null,
    dueDate: order.due_date,
    grandTotal: parseTotals(order.totals as Json).grand,
  }));

  metrics.resellerReceivables = receivables.reduce((sum, item) => sum + item.grandTotal, 0);

  const pendingPOs: DashboardPendingPO[] = pipelinePurchaseOrders
    .slice(0, 5)
    .map((po) => ({
      id: po.id,
      status: po.status,
      issuedAt: po.issued_at,
      totals: parseTotals(po.totals as Json).grand,
    }));

  const summary: DashboardSummary = {
    metrics,
    chart,
    transactions: transactions.slice(0, 8),
    lowStock: lowStock.slice(0, 6),
    receivables: receivables.slice(0, 6),
    pendingPurchaseOrders: pendingPOs,
  };

  return summary;
}

function getBucketDate(date: Date, granularity: DashboardRangePayload["granularity"]): Date {
  switch (granularity) {
    case "hourly":
      return startOfHour(date);
    case "monthly":
      return startOfMonth(date);
    default:
      return startOfDay(date);
  }
}

function formatBucketLabel(date: Date, granularity: DashboardRangePayload["granularity"]): string {
  switch (granularity) {
    case "hourly":
      return format(date, "HH:00");
    case "monthly":
      return format(date, "MMM yyyy");
    default:
      return format(date, "dd MMM");
  }
}
