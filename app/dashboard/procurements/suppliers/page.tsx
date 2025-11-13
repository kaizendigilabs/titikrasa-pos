import { redirect } from "next/navigation";

import { SuppliersTable } from "./data-table";
import { getSuppliersTableBootstrap } from "@/features/procurements/suppliers/server";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;

export default async function SuppliersPage() {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null;
  let bootstrap: Awaited<ReturnType<typeof getSuppliersTableBootstrap>> | null = null;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    bootstrap = await getSuppliersTableBootstrap(actor, { pageSize: DEFAULT_PAGE_SIZE });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === ERR.FORBIDDEN.statusCode) {
      redirect(
        "/dashboard?status=forbidden&message=You%20do%20not%20have%20permission%20to%20access%20this%20resource",
      );
    }
    console.error("[SUPPLIERS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }

  if (!actor || !bootstrap) {
    return null;
  }

  const { initialSuppliers, initialMeta } = bootstrap;
  const canManage = actor.roles.isAdmin || actor.roles.isManager;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="text-sm text-muted-foreground">
          Manage suppliers, their purchasing catalog, and keep procurement aligned with inventory.
        </p>
      </div>
      <SuppliersTable
        initialSuppliers={initialSuppliers}
        initialMeta={initialMeta}
        canManage={canManage}
      />
    </div>
  );
}
