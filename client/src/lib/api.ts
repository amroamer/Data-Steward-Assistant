/**
 * API base path — matches the Vite/router base in vite.config.ts.
 * When deployed behind a reverse proxy (e.g. nginx on Azure),
 * all API calls must include this prefix.
 */
export const API_BASE = "/dataowner";

/**
 * Builds a full API URL by prepending the base path.
 * Usage: apiFetch("/api/entities") → fetch("/dataowner/api/entities")
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
