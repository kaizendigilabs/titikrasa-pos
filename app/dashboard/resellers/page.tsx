import { redirect } from "next/navigation";

import { ResellersTable } from "./data-table";
import { getResellersTableBootstrap } from "@/features/resellers/server";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;

export default async function ResellersPage() {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null;
  let bootstrap: Awaited<ReturnType<typeof getResellersTableBootstrap>> | null = null;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    bootstrap = await getResellersTableBootstrap(actor, { pageSize: DEFAULT_PAGE_SIZE });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === ERR.FORBIDDEN.statusCode) {
      redirect("/dashboard?error=forbidden");
    }
    console.error("[RESELLERS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }

  if (!actor || !bootstrap) {
    return null;
  }

  const { initialResellers, initialMeta } = bootstrap;
  const canManage = actor.roles.isAdmin || actor.roles.isManager;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Resellers</h1>
        <p className="text-sm text-muted-foreground">
          Manage reseller partners, their contact information, and payment terms.
        </p>
      </div>
      <ResellersTable
        initialResellers={initialResellers}
        initialMeta={initialMeta}
        canManage={canManage}
      />
    </div>
  );
}
