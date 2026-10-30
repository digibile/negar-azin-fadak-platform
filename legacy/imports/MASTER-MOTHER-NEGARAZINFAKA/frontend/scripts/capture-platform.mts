/**
 * Records the platform's real responses so the client tests run against captured facts.
 *
 * Run it while the API is up: `node --experimental-strip-types scripts/capture-platform.mts`.
 *
 * The file it writes is test input, not a mock written from memory: every body is what the host actually
 * returned at the time of capture, including its status code and correlation header. That is what lets a test
 * assert that a 401 renders as a session-required state without inventing a response shape.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env['CAPTURE_BASE'] ?? 'http://127.0.0.1:5000';
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'platform-responses.json');

const ROUTES: readonly { readonly key: string; readonly path: string; readonly method: string }[] = [
  { key: 'ping', path: '/api/v1/ping', method: 'GET' },
  { key: 'healthLive', path: '/health/live', method: 'GET' },
  { key: 'healthReady', path: '/health/ready', method: 'GET' },
  { key: 'meAnonymous', path: '/api/v1/me', method: 'GET' },
  { key: 'mePermissionsAnonymous', path: '/api/v1/me/permissions', method: 'GET' },
  { key: 'rolesAnonymous', path: '/api/v1/roles?page=1&pageSize=20', method: 'GET' },
  { key: 'unitsCompanyAnonymous', path: '/api/v1/organization/units/company?page=1&pageSize=20', method: 'GET' },
  { key: 'unitsStoreAnonymous', path: '/api/v1/organization/units/store?page=1&pageSize=20', method: 'GET' },
  { key: 'permissionsAnonymous', path: '/api/v1/permissions?page=1&pageSize=100', method: 'GET' },
  { key: 'tenantConfigurationAnonymous', path: '/api/v1/tenant/configuration', method: 'GET' },
  { key: 'auditAnonymous', path: '/api/v1/audit?page=1&pageSize=20', method: 'GET' },
  { key: 'openapi', path: '/openapi/v1.json', method: 'GET' },
];

interface Captured {
  readonly status: number;
  readonly correlationId: string | null;
  readonly contentType: string | null;
  readonly body: unknown;
  readonly raw: string;
}

const captured: Record<string, Captured> = {};

for (const route of ROUTES) {
  const response = await fetch(`${BASE}${route.path}`, {
    method: route.method,
    headers: { Accept: 'application/json' },
  });

  const raw = await response.text();
  let body: unknown = raw;

  try {
    body = JSON.parse(raw);
  } catch {
    // A health probe answers plain text; the raw body is the value.
  }

  captured[route.key] = {
    status: response.status,
    correlationId: response.headers.get('X-Correlation-Id'),
    contentType: response.headers.get('Content-Type'),
    body,
    raw,
  };

  console.log(`${String(response.status).padStart(3)} ${route.path}`);
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify({ base: BASE, captured }, null, 2)}\n`, 'utf8');

console.log(`\nrecorded ${Object.keys(captured).length} routes to ${OUTPUT}`);
