import { queryOptions } from "@tanstack/react-query";

import type { SettingsPayload } from "./types";

const SETTINGS_ERROR = "Gagal memuat pengaturan";

async function fetchSettings(): Promise<SettingsPayload> {
  const response = await fetch("/api/settings", { cache: "no-store" });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? SETTINGS_ERROR);
  }

  return payload?.data?.settings as SettingsPayload;
}

export const settingsQueryKey = ["settings"] as const;

export function settingsQueryOptions() {
  return queryOptions({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000,
  });
}
