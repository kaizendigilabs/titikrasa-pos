import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

import { listTickets, updateTicketItem } from "./client";
import type { KdsTicketView } from "./types";
import type { UpdateTicketItemInput } from "@/features/orders/schemas";
import { createBrowserClient } from "@/lib/supabase/client";

const KDS_QUERY_KEY = "kds-tickets";

export function useKdsTickets(options: { initialData?: KdsTicketView[] } = {}) {
  return useQuery({
    queryKey: [KDS_QUERY_KEY],
    queryFn: () => listTickets(),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

export function useUpdateTicketItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, input }: { ticketId: string; input: UpdateTicketItemInput }) =>
      updateTicketItem(ticketId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [KDS_QUERY_KEY] });
    },
  });
}

export function useKdsRealtime(options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (options.enabled === false) return;

    const supabase = createBrowserClient();
    const channel = supabase.channel("kds-tickets-realtime");

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "kds_tickets" },
      () => {
        void queryClient.invalidateQueries({ queryKey: [KDS_QUERY_KEY] });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => {
        void queryClient.invalidateQueries({ queryKey: [KDS_QUERY_KEY] });
      },
    );

    void channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [options.enabled, queryClient]);
}
