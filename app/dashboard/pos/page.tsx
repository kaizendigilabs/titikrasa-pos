import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createQueryClient } from "@/lib/query";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";
import { getPosBootstrap } from "@/features/pos/server";
import {
  posMenusQueryKey,
  posResellersQueryKey,
  posSettingsQueryKey,
  DEFAULT_POS_ORDER_FILTERS,
} from "@/features/pos/keys";
import { ordersQueryKey } from "@/features/orders/keys";
import { PosScreen } from "./PosScreen";

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
      redirect("/dashboard?error=forbidden");
    }
    redirect("/dashboard");
  }

  const bootstrap = await getPosBootstrap(actor);

  const queryClient = createQueryClient();

  // Prefetch all POS data into query cache
  queryClient.setQueryData(posMenusQueryKey(), bootstrap.menus);
  queryClient.setQueryData(posResellersQueryKey(), bootstrap.resellers);
  queryClient.setQueryData(posSettingsQueryKey(), {
    defaultTaxRate: bootstrap.defaultTaxRate,
  });
  queryClient.setQueryData(ordersQueryKey(DEFAULT_POS_ORDER_FILTERS), {
    items: bootstrap.orders.items,
    meta: bootstrap.orders.meta,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PosScreen />
    </HydrationBoundary>
  );
}

