import { redirect } from "next/navigation";

import { SupplierTransactionsTable } from "./data-table";
import { SupplierTransactionsActions } from "./_components/actions";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { getSupplierTransactionsBootstrap } from "@/features/procurements/suppliers/server";
import { getPurchaseOrderFormOptions } from "@/features/procurements/purchase-orders/server";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";
import type { SupplierOrder } from "@/features/procurements/suppliers/types";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;

type SupplierTransactionsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SupplierTransactionsPage({ params }: SupplierTransactionsPageProps) {
  const { id } = await params;
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null;
  let bootstrap:
    | Awaited<ReturnType<typeof getSupplierTransactionsBootstrap>>
    | null = null;
  let formOptions: Awaited<ReturnType<typeof getPurchaseOrderFormOptions>> | null = null;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    const [transactions, options] = await Promise.all([
      getSupplierTransactionsBootstrap(actor, id, {
        pageSize: DEFAULT_PAGE_SIZE,
      }),
      getPurchaseOrderFormOptions(actor),
    ]);
    bootstrap = transactions;
    formOptions = options;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === ERR.FORBIDDEN.statusCode) {
      redirect(
        "/dashboard?status=forbidden&message=You%20do%20not%20have%20permission%20to%20access%20this%20resource",
      );
    }
    if (error instanceof AppError && error.statusCode === ERR.NOT_FOUND.statusCode) {
      redirect(
        "/dashboard/procurements/suppliers?status=not-found&message=Supplier%20tidak%20ditemukan",
      );
    }
    console.error("[SUPPLIER_TRANSACTIONS_PAGE_ERROR]", error);
    redirect("/dashboard/procurements/suppliers");
  }

  if (!actor || !bootstrap || !formOptions) {
    return null;
  }

  const initialData: DataTableQueryResult<SupplierOrder> = {
    items: bootstrap.initialOrders,
    meta: bootstrap.initialMeta,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">
            {bootstrap.supplier.name} &mdash; Transactions
          </h1>
          <p className="text-sm text-muted-foreground">
            Riwayat purchase order untuk supplier ini.
          </p>
        </div>
        <SupplierTransactionsActions
          supplierId={bootstrap.supplier.id}
          suppliers={formOptions.suppliers}
          catalogItems={formOptions.catalogItems}
        />
      </div>

      <SupplierTransactionsTable
        supplierId={bootstrap.supplier.id}
        initialData={initialData}
      />
    </div>
  );
}
