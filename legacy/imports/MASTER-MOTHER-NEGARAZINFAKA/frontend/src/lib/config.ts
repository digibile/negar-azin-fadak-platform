/**
 * Where the client sends its requests.
 *
 * An empty value means "same origin as this document", which is how the client is deployed: served behind
 * the same reverse proxy as the API, so no cross-origin allowance is needed. The Vite dev server proxies
 * `/api`, `/health` and `/openapi` to the API host for exactly the same reason.
 *
 * The value is public by construction — anything in a `VITE_`-prefixed variable is inlined into the
 * bundle — so it must never carry a credential.
 */
const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

export const apiBaseUrl = configured.replace(/\/+$/, '');

/** Builds an absolute-or-relative URL for a platform path such as `/api/v1/ping`. */
export function platformUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalized}`;
}
