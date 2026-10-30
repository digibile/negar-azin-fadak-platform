/**
 * A reader for the platform's own OpenAPI document.
 *
 * The client uses the document as a capability source rather than as documentation. A module's status on
 * screen is derived from the operations the running host actually publishes, so the UI cannot claim a
 * service is missing while the host serves it, and cannot claim it is present while the host does not.
 * That removes the class of bug where a hand-maintained list of "available modules" drifts from the
 * deployed API.
 */

const CONTRACTS = ['/openapi/v1.json'] as const;

export interface ContractOperation {
  readonly method: string;
  readonly path: string;
  readonly operationId: string | null;
  readonly summary: string | null;
  readonly tags: readonly string[];
}

export interface Contract {
  /** Absolute URL the document came from, for error messages. */
  readonly source: string;
  readonly title: string;
  readonly version: string;
  readonly operations: readonly ContractOperation[];
}

interface RawOperation {
  operationId?: unknown;
  summary?: unknown;
  tags?: unknown;
}

interface RawDocument {
  openapi?: unknown;
  info?: { title?: unknown; version?: unknown };
  paths?: Record<string, Record<string, RawOperation> | undefined>;
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const;

function isOperation(value: unknown): value is RawOperation {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readTags(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((tag): tag is string => typeof tag === 'string');
}

/**
 * Fetches and parses the contract.
 *
 * The document is served by the platform itself, so an unreachable contract is a real signal rather than a
 * missing local file: it is reported as a failure so the caller can distinguish "the platform exposes
 * nothing" from "the platform could not be reached". Only the first contract candidate is used today; the
 * list exists so a second API version can be added without changing every call site.
 */
export async function fetchContract(signal?: AbortSignal): Promise<Contract> {
  const path = CONTRACTS[0];
  let response: Response;

  try {
    response = await fetch(path, { headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new Error(`Contract at ${path} could not be reached.`);
  }

  if (!response.ok) {
    throw new Error(`Contract at ${path} answered ${response.status}.`);
  }

  const raw = (await response.json()) as RawDocument;
  const operations: ContractOperation[] = [];

  for (const [path_, methods] of Object.entries(raw.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods ?? {})) {
      if (!HTTP_METHODS.includes(method as (typeof HTTP_METHODS)[number]) || !isOperation(operation)) {
        continue;
      }
      operations.push({
        method: method.toUpperCase(),
        path: path_,
        operationId: readString(operation.operationId),
        summary: readString(operation.summary),
        tags: readTags(operation.tags),
      });
    }
  }

  operations.sort((left, right) =>
    left.path === right.path ? left.method.localeCompare(right.method) : left.path.localeCompare(right.path),
  );

  return {
    source: path,
    title: readString(raw.info?.title) ?? 'Platform API',
    version: readString(raw.info?.version) ?? 'unknown',
    operations,
  };
}

/** True when the running host publishes an operation whose path matches one of `patterns`. */
export function contractHas(contract: Contract, ...patterns: readonly string[]): boolean {
  return contract.operations.some((operation) => matches(operation.path, patterns));
}

/** Counts the operations whose path matches any of `patterns`, for a real figure rather than a yes/no. */
export function contractCount(contract: Contract, ...patterns: readonly string[]): number {
  return contract.operations.filter((operation) => matches(operation.path, patterns)).length;
}

/** The operations whose path matches any of `patterns`, for listing what is really available. */
export function contractOperations(contract: Contract, ...patterns: readonly string[]): readonly ContractOperation[] {
  return contract.operations.filter((operation) => matches(operation.path, patterns));
}

/**
 * Matches a contract path against a pattern.
 *
 * A pattern segment of `*` matches one segment, so `/api/v1/organization/units/*` matches the four
 * level-addressed routes without also matching a deeper path that does not exist.
 */
function matches(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    const expected = pattern.split('/');
    const actual = path.split('/');
    return (
      expected.length === actual.length &&
      expected.every((segment, index) => segment === '*' || segment === actual[index])
    );
  });
}
