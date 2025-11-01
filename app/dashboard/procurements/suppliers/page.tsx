import { redirect } from "next/navigation";

import { SuppliersTableScreen } from "@/features/procurements/suppliers/ui/components/suppliers-table";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { supplierFiltersSchema } from "@/features/procurements/suppliers/model/forms/schema";
import { mapSupplierRow } from "@/features/procurements/suppliers/data/dto";
import type { SupplierListItem } from "@/features/procurements/suppliers/types";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;

export default async function SuppliersPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const filters = supplierFiltersSchema.parse({
      page: "1",
      pageSize: String(DEFAULT_PAGE_SIZE),
      status: "all",
    });

    const { data, error, count } = await actor.supabase
      .from("suppliers")
      .select("*, supplier_catalog_items(count)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, filters.pageSize - 1);

    if (error) {
      throw error;
    }

    const suppliers: SupplierListItem[] =
      data?.map((row) => mapSupplierRow(row as any)) ?? [];

    const initialMeta = {
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? suppliers.length,
      },
      filters: {
        search: null as string | null,
        status: filters.status,
      },
    };

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Kelola mitra pemasok dan katalog pembelian untuk menjaga proses procurement tetap rapi.
          </p>
        </div>
        <SuppliersTableScreen
          initialItems={suppliers}
          initialMeta={initialMeta}
          canManage={actor.roles.isAdmin || actor.roles.isManager}
        />
      </div>
    );
  } catch (error) {
    console.error("[SUPPLIERS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }
}
