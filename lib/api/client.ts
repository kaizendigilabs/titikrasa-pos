import { AppError } from "@/lib/api/errors";
import { toAppError, type ApiErrorPayload } from "@/lib/api/errors";

export type ApiRequestInit = RequestInit & {
  parseJson?: boolean;
};

export type ApiResult<TData> = {
  data: TData;
  meta: Record<string, unknown> | null;
  status: number;
};

export async function apiRequest<TData>(
  input: RequestInfo | URL,
  init: ApiRequestInit = {},
): Promise<ApiResult<TData>> {
  const { parseJson = true, headers, ...rest } = init;
  const response = await fetch(input, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!parseJson) {
    if (!response.ok) {
      throw new AppError(response.status, response.statusText || "Request failed");
    }
    return {
      data: undefined as TData,
      meta: null,
      status: response.status,
    };
  }

  let payload: {
    data: TData;
    meta?: Record<string, unknown> | null;
    error?: ApiErrorPayload | null;
  } | null = null;

  try {
    payload = (await response.json()) as typeof payload;
  } catch (error) {
    throw new AppError(
      response.status,
      error instanceof Error
        ? error.message
        : "Tidak dapat membaca respon dari server",
    );
  }

  if (!response.ok || payload?.error) {
    throw toAppError(
      response.status,
      payload?.error ?? null,
      payload?.error?.message ?? "Permintaan gagal",
    );
  }

  if (!payload) {
    throw new AppError(response.status, "Respon server kosong");
  }

  return {
    data: payload.data,
    meta: payload.meta ?? null,
    status: response.status,
  };
}
