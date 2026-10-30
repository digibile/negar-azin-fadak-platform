import { platformUrl } from '../config';
import { currentAccessToken, setAccessToken, setLastCorrelationId } from '../session';

/** One machine-readable failure inside an RFC 7807 problem response. */
export interface ProblemError {
  readonly code: string;
  readonly description: string;
}

/** The problem response body the platform returns for an expected business outcome. */
export interface ProblemDetails {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly traceId?: string;
  readonly errors?: readonly ProblemError[];
}

/**
 * A failed call, carrying the parts of the problem response a screen can act on.
 *
 * The `code` of the first error is the stable identifier to branch on. `title` and `description` are
 * human-oriented and can change, and a 500's description is withheld server-side on purpose, so nothing in
 * this client decides behaviour from them.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;
  readonly correlationId: string | null;

  constructor(status: number, problem: ProblemDetails | null, correlationId: string | null) {
    super(problem?.title ?? `درخواست با وضعیت ${status} پایان یافت.`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    this.correlationId = correlationId;
  }

  /** True when the platform refused because no usable access token was presented. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the platform refused because the caller lacks the required permission. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** True when the endpoint or route does not exist yet on the platform. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** The first stable error code, when the platform reported one. */
  get code(): string | null {
    return this.problem?.errors?.[0]?.code ?? null;
  }

  /** A sentence a Persian-speaking operator can act on, derived from the status rather than the message. */
  get reason(): string {
    if (this.problem !== null) {
      const described = this.problem.errors?.map((entry) => entry.description).filter(Boolean);
      if (described !== undefined && described.length > 0) {
        return described.join(' ');
      }
      if (this.problem.title !== undefined && this.problem.title.length > 0) {
        return this.problem.title;
      }
    }

    switch (this.status) {
      case 400:
        return 'درخواست با قالب یا مقادیر نامعتبر ارسال شده است.';
      case 401:
        return 'برای این عملیات باید وارد شوید.';
      case 403:
        return 'مجوز لازم برای این عملیات در نقش شما وجود ندارد.';
      case 404:
        return 'این مسیر یا سرویس روی پلتفرم پیاده‌سازی نشده است.';
      case 409:
        return 'این درخواست با وضعیت فعلی داده‌ها تعارض دارد.';
      case 422:
        return 'درخواست معتبر بود اما قاعده کسب‌وکار آن را رد کرد.';
      case 429:
        return 'تعداد درخواست‌ها از حد مجاز گذشته است.';
      default:
        return this.status >= 500
          ? 'خطای داخلی سرور رخ داد. جزئیات در لاگ‌های پلتفرم موجود است.'
          : `درخواست با وضعیت ${this.status} پایان یافت.`;
    }
  }
}

/** A call that never reached the platform: the API host is down, DNS failed, or the request was aborted. */
export class TransportError extends Error {
  readonly correlationId: string | null;

  constructor(message: string, correlationId: string | null) {
    super(message);
    this.name = 'TransportError';
    this.correlationId = correlationId;
  }

  get reason(): string {
    return 'ارتباط با سرویس پلتفرم برقرار نشد. در دسترس بودن API را بررسی کنید.';
  }
}

export type QueryValue = string | number | boolean | undefined | null;

/** A request the client knows how to send. */
export interface ApiRequest {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly query?: Readonly<Record<string, QueryValue>>;
  readonly body?: unknown;
  /** Set false for a call that must stay anonymous even when a session exists. */
  readonly authenticated?: boolean;
}

function buildQuery(query: Readonly<Record<string, QueryValue>> | undefined): string {
  if (query === undefined) {
    return '';
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.set(key, String(value));
  }

  const rendered = search.toString();
  return rendered.length > 0 ? `?${rendered}` : '';
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate['title'] === 'string' || typeof candidate['status'] === 'number';
}

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    const parsed: unknown = await response.json();
    return isProblemDetails(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const TRANSPORT_FAILURE = 'ارتباط با سرویس پلتفرم برقرار نشد.';

/**
 * Sends one request to the platform and returns its parsed body.
 *
 * A failed response becomes an {@link ApiError} and a failed connection a {@link TransportError}; neither is
 * thrown as a surprise further up, so a feature can tell "the platform said no" from "the platform was not
 * there" without parsing a message. A 401 clears the session, because a token the platform will not accept
 * is worse than no token: keeping it would make every later screen look signed in while failing.
 */
export async function send<T>(request: ApiRequest, signal?: AbortSignal): Promise<T> {
  const url = `${platformUrl(request.path)}${buildQuery(request.query)}`;
  const headers = new Headers({ Accept: 'application/json' });
  const authenticated = request.authenticated ?? true;
  const token = currentAccessToken();

  if (authenticated && token !== null) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let payload: string | undefined;
  if (request.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    payload = JSON.stringify(request.body);
  }

  const init: RequestInit = { method: request.method, headers, ...(signal !== undefined ? { signal } : {}) };
  if (payload !== undefined) {
    init.body = payload;
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new TransportError(TRANSPORT_FAILURE, null);
  }

  const correlationId = response.headers.get('X-Correlation-Id');
  setLastCorrelationId(correlationId);

  if (response.status === 401 && authenticated) {
    setAccessToken(null);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response), correlationId);
  }

  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return undefined as T;
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/** Turns any thrown value into the sentence a screen should show. */
export function describeFailure(failure: unknown): string {
  if (failure instanceof ApiError || failure instanceof TransportError) {
    return failure.reason;
  }
  return 'خطای پیش‌بینی‌نشده‌ای رخ داد.';
}

/** Turns any thrown value into the correlation id to show beside an error, when the platform supplied one. */
export function failureCorrelationId(failure: unknown): string | null {
  if (failure instanceof ApiError || failure instanceof TransportError) {
    return failure.correlationId;
  }
  return null;
}
