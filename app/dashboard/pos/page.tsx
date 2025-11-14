import { redirect } from "next/navigation";

import { PosScreen } from "./PosScreen";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";
import { getPosBootstrap } from "@/features/pos/server";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  let actor: Awaited<ReturnType<typeof requireActor>>;
  try {
    actor = await requireActor();
    ensureStaffOrAbove(actor.roles);
  } catch (error) {
    if (
      error instanceof AppError &&
      error.statusCode === ERR.FORBIDDEN.statusCode
    ) {
      redirect(
        "/dashboard?status=forbidden&message=Anda%20tidak%20memiliki%20akses%20ke%20POS",
      );
    }
    redirect("/dashboard");
  }

  const bootstrap = await getPosBootstrap(actor);

  return (
    <PosScreen
      initialMenus={bootstrap.menus}
      initialResellers={bootstrap.resellers}
      initialOrderData={bootstrap.orders}
      defaultTaxRate={bootstrap.defaultTaxRate}
    />
  );
}
