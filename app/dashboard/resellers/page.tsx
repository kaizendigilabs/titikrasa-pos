import { redirect } from "next/navigation";

import { ResellersTable } from "./data-table";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { getResellersTableBootstrap } from "@/features/resellers/server";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;

export default async function ResellersPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { initialResellers, initialMeta } = await getResellersTableBootstrap(
      actor,
      { pageSize: DEFAULT_PAGE_SIZE },
    );

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Resellers</h1>
          <p className="text-sm text-muted-foreground">
            Manage reseller partners, their contact information, and payment terms.
          </p>
        </div>
        <ResellersTable
          initialResellers={initialResellers}
          initialMeta={initialMeta}
          canManage={actor.roles.isAdmin || actor.roles.isManager}
        />
      </div>
    );
  } catch (error) {
    console.error("[RESELLERS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }
}
