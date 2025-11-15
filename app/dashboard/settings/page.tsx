import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { createQueryClient } from "@/lib/query";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { getSettings } from "@/features/settings/server";
import { settingsQueryKey } from "@/features/settings/queries";
import { SettingsScreen } from "./SettingsScreen";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const actor = await requireActor();
  ensureAdminOrManager(actor.roles);

  const settings = await getSettings(actor);
  const queryClient = createQueryClient();
  queryClient.setQueryData(settingsQueryKey, settings);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsScreen />
    </HydrationBoundary>
  );
}
