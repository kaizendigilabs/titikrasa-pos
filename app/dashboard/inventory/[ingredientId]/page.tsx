import { redirect } from "next/navigation";

import { PurchaseHistoryTable } from "./purchase-history-table";
import { fetchPurchaseHistory, fetchStoreIngredientDetail } from "@/features/inventory/store-ingredients/server";
import { purchaseHistoryFiltersSchema } from "@/features/inventory/store-ingredients/model/forms/schema";
import { adminClient } from "@/features/users/server";
import { requireActor } from "@/features/users/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;

type SupplierOption = {
  id: string;
  name: string;
};

export default async function StoreIngredientDetailPage({
  params,
}: {
  params: Promise<{ ingredientId: string }>;
}) {
  try {
    await requireActor();
    const { ingredientId } = await params;

    if (!ingredientId) {
      redirect("/dashboard/inventory");
    }

    const detail = await fetchStoreIngredientDetail(ingredientId);

    const historyFilters = purchaseHistoryFiltersSchema.parse({
      page: "1",
      pageSize: String(DEFAULT_PAGE_SIZE),
    });

    const history = await fetchPurchaseHistory(ingredientId, historyFilters);

    const admin = adminClient();
    const { data: supplierRows, error: supplierError } = await admin
      .from("suppliers")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (supplierError) {
      throw supplierError;
    }

    const suppliers: SupplierOption[] =
      supplierRows?.map((row) => ({ id: row.id, name: row.name })) ?? [];

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <p className="text-sm text-muted-foreground">
              Monitor stock movement, purchasing history, and thresholds for this ingredient.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SKU</span>
                <span>{detail.sku ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Base UOM</span>
                <span className="uppercase font-medium">{detail.baseUom}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Min Stock</span>
                <span>{formatNumber(detail.minStock, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Stock</span>
                <span className="font-semibold">{formatNumber(detail.currentStock, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average Cost</span>
                <span>{formatCurrency(detail.avgCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                {detail.isActive ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-muted text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-medium">Latest Purchase</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span>{detail.lastSupplierName ?? "No purchase recorded"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Purchase Price</span>
                <span>
                  {detail.lastPurchasePrice !== null
                    ? formatCurrency(detail.lastPurchasePrice)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Purchase Date</span>
                <span>
                  {detail.lastPurchaseAt ? formatDateTime(detail.lastPurchaseAt) : "—"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created At</span>
                <span>{formatDateTime(detail.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <PurchaseHistoryTable
          ingredientId={ingredientId}
          suppliers={suppliers}
          initialHistory={{
            items: history.items,
            meta: {
              pagination: {
                page: historyFilters.page,
                pageSize: history.limit,
                total: history.total,
              },
              filters: {
                supplierId: historyFilters.supplierId ?? null,
                from: historyFilters.from ?? null,
                to: historyFilters.to ?? null,
              },
            },
          }}
        />
      </div>
    );
  } catch (error) {
    console.error("[INVENTORY_DETAIL_ERROR]", error);
    redirect("/dashboard/inventory");
  }
}
