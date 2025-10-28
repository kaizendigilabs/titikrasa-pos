import { AppError, ERR } from "@/lib/utils/errors";

import type { KdsTicketView } from "./types";
import type { UpdateTicketItemInput } from "@/features/orders/schemas";

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

type ListTicketsResponse = {
  tickets: KdsTicketView[];
};

export async function listTickets() {
  const { data } = await request<ListTicketsResponse>(`/api/kds/tickets`, {
    method: "GET",
  });
  return data.tickets;
}

export async function updateTicketItem(
  ticketId: string,
  input: UpdateTicketItemInput,
) {
  const { data } = await request<KdsTicketView>(`/api/kds/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data;
}

async function request<T>(input: string, init: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error
        ? error.message
        : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Request failed",
    );
  }

  return {
    data: payload.data,
    meta: payload.meta,
  };
}
