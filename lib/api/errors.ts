import { AppError, ERR, appError } from "@/lib/utils/errors";

export { AppError, ERR, appError };

export type ApiErrorPayload = {
  message: string;
  code?: number;
  details?: Record<string, unknown> | null;
};

export function toAppError(
  status: number,
  payload: ApiErrorPayload | null,
  fallbackMessage: string,
) {
  if (!payload) {
    return new AppError(status, fallbackMessage);
  }

  return new AppError(status, payload.message ?? fallbackMessage, {
    code: payload.code,
    details: payload.details ?? undefined,
  });
}
