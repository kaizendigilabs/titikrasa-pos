import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_POLICIES } from "@/lib/api/cache-policies";

import type { SettingsUpdateInput } from "./types";
import { fetchSettings, updateSettings } from "./client";
import { settingsQueryKey } from "./keys";

// Re-export query key for external usage
export { settingsQueryKey } from "./keys";

/**
 * Hook for fetching application settings
 */
export function useSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
    ...CACHE_POLICIES.PERMANENT,
  });
}

/**
 * Hook for updating application settings
 */
export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: SettingsUpdateInput) => updateSettings(input),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsQueryKey, data);
    },
  });
}

