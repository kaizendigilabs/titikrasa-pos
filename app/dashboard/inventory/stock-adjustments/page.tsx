import { redirect } from "next/navigation";

import { StockOpnameForm } from "./stock-opname-form";
import { adminClient, requireActor } from "@/features/users/server";
import type { Tables } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type IngredientSnapshot = {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  baseUom: Tables<"store_ingredients">["base_uom"];
};

export default async function StockAdjustmentsPage() {
  try {
    const actor = await requireActor();
    const admin = adminClient();

    const { data, error } = await admin
      .from("store_ingredients")
      .select("id, name, current_stock, min_stock, base_uom, is_active")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const ingredients: IngredientSnapshot[] =
      data
        ?.filter((row) => row.is_active)
        .map((row) => ({
          id: row.id,
          name: row.name,
          currentStock: row.current_stock ?? 0,
          minStock: row.min_stock ?? 0,
          baseUom: row.base_uom,
        })) ?? [];

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Stock Opname</h1>
            <p className="text-sm text-muted-foreground">
              Record physical counts, highlight discrepancies, and request approval for stock adjustments.
            </p>
          </div>
        </div>
        <StockOpnameForm
          ingredients={ingredients}
          canApprove={actor.roles.isAdmin || actor.roles.isManager}
        />
      </div>
    );
  } catch (error) {
    console.error("[STOCK_OPNAME_PAGE_ERROR]", error);
    redirect("/dashboard/inventory");
  }
}
