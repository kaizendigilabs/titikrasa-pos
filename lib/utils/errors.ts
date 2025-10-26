export class AppError extends Error {
  public statusCode: number;
  public details?: Record<string, unknown>;

  constructor(
    statusCode: number = 400,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const ERR = {
  BAD_REQUEST: new AppError(
    400,
    "The request was invalid or cannot be served",
  ),
  UNAUTHORIZED: new AppError(
    401,
    "You must be logged in to access this resource",
  ),
  FORBIDDEN: new AppError(
    403,
    "You do not have permission to access this resource",
  ),
  NOT_FOUND: new AppError(404, "The requested resource was not found"),
  VALIDATION_ERROR: new AppError(
    422,
    "There was a validation error with your request",
  ),
  SERVER_ERROR: new AppError(
    500,
    "An internal server error occurred",
  ),
};

export function appError(
  template: AppError,
  overrides: {
    message?: string;
    details?: Record<string, unknown>;
    statusCode?: number;
  } = {},
) {
  return new AppError(
    overrides.statusCode ?? template.statusCode,
    overrides.message ?? template.message,
    overrides.details,
  );
}
