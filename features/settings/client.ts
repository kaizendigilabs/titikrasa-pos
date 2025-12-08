import { apiClient } from "@/lib/api/client";

import type { SettingsPayload, SettingsUpdateInput } from "./types";

type SettingsResponse = {
  settings: SettingsPayload;
};

/**
 * Fetches application settings
 */
export async function fetchSettings(): Promise<SettingsPayload> {
  const { data } = await apiClient.get<SettingsResponse>("/api/settings");
  return data.settings;
}

/**
 * Updates application settings
 */
export async function updateSettings(input: SettingsUpdateInput): Promise<SettingsPayload> {
  const { data } = await apiClient.put<SettingsResponse>("/api/settings", input);
  return data.settings;
}
