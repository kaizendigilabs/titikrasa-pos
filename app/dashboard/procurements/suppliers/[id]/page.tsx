import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import { getSupplierDetail } from "@/features/procurements/suppliers/server";
import type {
  SupplierCatalogWithLinks,
} from "@/features/procurements/suppliers/types";
import { AppError, ERR } from "@/lib/utils/errors";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";

import { SupplierCatalogTable } from "./_components/catalog-table";
import { SupplierInfoCards } from "./_components/info-cards";
import { SupplierSummary } from "./_components/summary";

export const dynamic = "force-dynamic";

type SupplierDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  const { id } = await params;
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null;
  let detail: Awaited<ReturnType<typeof getSupplierDetail>> | null = null;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    detail = await getSupplierDetail(actor, id);
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === ERR.FORBIDDEN.statusCode) {
        redirect("/dashboard?error=forbidden");
      }
      if (error.statusCode === ERR.NOT_FOUND.statusCode) {
        redirect("/dashboard/procurements/suppliers?error=not-found");
      }
    }
    console.error("[SUPPLIER_DETAIL_PAGE_ERROR]", error);
    redirect("/dashboard/procurements/suppliers");
  }

  if (!actor || !detail) {
    return null;
  }

  const canManage = actor.roles.isAdmin || actor.roles.isManager;

  const initialCatalogPageSize = 8;
  const initialCatalogData: DataTableQueryResult<SupplierCatalogWithLinks> = {
    items: detail.catalog.slice(0, initialCatalogPageSize) as SupplierCatalogWithLinks[],
    meta: {
      pagination: {
        page: 1,
        pageSize: initialCatalogPageSize,
        total: detail.catalog.length,
      },
    },
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <SupplierSummary
        name={detail.supplier.name}
        isActive={detail.supplier.is_active}
        stats={detail.stats}
      />

      <SupplierInfoCards
        contact={detail.supplier.contact}
        createdAt={detail.supplier.created_at}
        supplierId={detail.supplier.id}
        recentOrders={detail.orders}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Katalog Supplier</CardTitle>
            <p className="text-sm text-muted-foreground">
              Kelola daftar bahan dan hubungkan dengan Store Ingredient.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <SupplierCatalogTable
            supplierId={detail.supplier.id}
            initialData={initialCatalogData}
            storeIngredients={detail.storeIngredients}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
