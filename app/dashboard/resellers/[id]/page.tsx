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
import { getResellerDetail } from "@/features/resellers/server";
import type { ResellerOrder } from "@/features/resellers/types";
import { AppError, ERR } from "@/lib/utils/errors";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";

import { ResellerInfoCards } from "./_components/info-cards";
import { ResellerSummary } from "./_components/summary";
import { ResellerTransactionsTable } from "./_components/orders-table";

export const dynamic = "force-dynamic";

type ResellerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResellerDetailPage({
  params,
}: ResellerDetailPageProps) {
  const { id } = await params;
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null;
  let detail: Awaited<ReturnType<typeof getResellerDetail>> | null = null;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    detail = await getResellerDetail(actor, id);
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === ERR.FORBIDDEN.statusCode) {
        redirect(
          "/dashboard?status=forbidden&message=You%20do%20not%20have%20permission%20to%20access%20this%20resource",
        );
      }
      if (error.statusCode === ERR.NOT_FOUND.statusCode) {
        redirect(
          "/dashboard/resellers?status=not-found&message=Reseller%20tidak%20ditemukan",
        );
      }
    }
    console.error("[RESELLER_DETAIL_PAGE_ERROR]", error);
    redirect("/dashboard/resellers");
  }

  if (!actor || !detail) {
    return null;
  }

  const initialOrdersData: DataTableQueryResult<ResellerOrder> = {
    items: detail.recentOrders,
    meta: {
      pagination: {
        page: 1,
        pageSize: 10,
        total: detail.stats.totalOrders,
      },
    },
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <ResellerSummary
        name={detail.reseller.name}
        isActive={detail.reseller.is_active}
        stats={detail.stats}
      />

      <ResellerInfoCards
        contact={detail.reseller.contact}
        terms={detail.reseller.terms}
      />

      <div className="grid gap-4 lg:grid-cols-1">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Riwayat Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ResellerTransactionsTable
              resellerId={detail.reseller.id}
              initialData={initialOrdersData}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
