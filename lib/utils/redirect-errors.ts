/**
 * Redirect Error Codes
 * Digunakan untuk redirect dengan error message yang singkat
 */
export const REDIRECT_ERRORS = {
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not-found",
} as const;

export type RedirectErrorCode = (typeof REDIRECT_ERRORS)[keyof typeof REDIRECT_ERRORS];

/**
 * Mapping error code ke pesan yang ditampilkan
 */
export const ERROR_MESSAGES: Record<RedirectErrorCode, string> = {
  forbidden: "Anda tidak memiliki akses ke halaman ini",
  "not-found": "Data tidak ditemukan",
};

/**
 * Build redirect URL dengan error code
 */
export function buildRedirectUrl(basePath: string, errorCode: RedirectErrorCode): string {
  return `${basePath}?error=${errorCode}`;
}
