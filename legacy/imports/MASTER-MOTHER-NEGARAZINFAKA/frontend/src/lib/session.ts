/**
 * The session a signed-in operator holds, and the storage that keeps it for the life of the tab.
 *
 * The token lives in `sessionStorage` and nowhere else: it is dropped when the tab closes, it is never
 * written to a file, and it is never bundled. No credential is committed to this repository and none is
 * defaulted here — an unauthenticated client simply has no session.
 */
const TOKEN_KEY = 'naf.session.accessToken';
const CORRELATION_KEY = 'naf.session.correlationId';

const listeners = new Set<() => void>();

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    // A browser with storage disabled still has to work, just without a persisted session.
    return null;
  }
}

let accessToken = readStoredToken();

/** The bearer token of the current session, or null when the client is anonymous. */
export function currentAccessToken(): string | null {
  return accessToken;
}

/** Replaces the session token and notifies subscribers. Pass null to sign out. */
export function setAccessToken(token: string | null): void {
  accessToken = token?.trim() ? token.trim() : null;

  try {
    if (accessToken === null) {
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(CORRELATION_KEY);
    } else {
      window.sessionStorage.setItem(TOKEN_KEY, accessToken);
    }
  } catch {
    // Keeping the token in memory only is the degraded-but-working case.
  }

  for (const listener of listeners) {
    listener();
  }
}

/** Subscribes to session changes; returns the unsubscribe function. */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The correlation id of the newest request that carried one.
 *
 * The platform stamps `X-Correlation-Id` on every response and repeats it in its logs and audit records, so
 * surfacing it is what turns "the page showed an error" into a line somebody can find.
 */
let lastCorrelationId: string | null = null;

export function setLastCorrelationId(value: string | null): void {
  lastCorrelationId = value;
  try {
    if (value === null) {
      window.sessionStorage.removeItem(CORRELATION_KEY);
    } else {
      window.sessionStorage.setItem(CORRELATION_KEY, value);
    }
  } catch {
    // Nothing to do: the value is already held in memory.
  }
}

export function readLastCorrelationId(): string | null {
  if (lastCorrelationId !== null) {
    return lastCorrelationId;
  }
  try {
    return window.sessionStorage.getItem(CORRELATION_KEY);
  } catch {
    return null;
  }
}
