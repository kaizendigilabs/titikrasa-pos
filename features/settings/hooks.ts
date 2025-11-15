import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SettingsPayload, SettingsUpdateInput } from "./types";
import { settingsQueryKey, settingsQueryOptions } from "./queries";

const UPDATE_ERROR = "Gagal memperbarui pengaturan";

export function useSettings() {
  return useQuery(settingsQueryOptions());
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SettingsUpdateInput) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? UPDATE_ERROR);
      }

      return payload?.data?.settings as SettingsPayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(settingsQueryKey, data);
    },
  });
}
