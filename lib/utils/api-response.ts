import { NextResponse } from "next/server";

import { AppError, ERR } from "@/lib/utils/errors";

type ErrorBody = {
  message: string;
  code?: number;
  details?: Record<string, unknown>;
};

type ApiEnvelope<TData> = {
  data: TData | null;
  error: ErrorBody | null;
  meta: Record<string, unknown> | null;
};

const DEFAULT_ERROR_MESSAGE = ERR.SERVER_ERROR.message;

export function ok<T>(
  data: T,
  {
    status = 200,
    meta = null,
  }: { status?: number; meta?: Record<string, unknown> | null } = {},
) {
  const body: ApiEnvelope<T> = {
    data,
    error: null,
    meta,
  };

  return NextResponse.json(body, { status });
}

export function fail(
  error: unknown,
  options: { meta?: Record<string, unknown> | null } = {},
) {
  let status = ERR.SERVER_ERROR.statusCode;
  let message = DEFAULT_ERROR_MESSAGE;
  let details: Record<string, unknown> | undefined;

  if (error instanceof AppError) {
    status = error.statusCode;
    message = error.message;
    if ("details" in error && typeof error.details === "object") {
      details = error.details as Record<string, unknown>;
    }
  } else if (error instanceof Error) {
    message = error.message || DEFAULT_ERROR_MESSAGE;
  }

  const body: ApiEnvelope<null> = {
    data: null,
    error: {
      message,
      code: status,
      ...(details ? { details } : {}),
    },
    meta: options.meta ?? null,
  };

  if (status >= 500) {
    console.error("[API_ERROR]", error);
  }

  return NextResponse.json(body, { status });
}

export function assert(condition: unknown, error: AppError) {
  if (!condition) {
    throw error;
  }
}
