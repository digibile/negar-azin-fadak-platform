import { describe, expect, it } from 'vitest';
import { resolveModules, summarize } from '../src/features/catalog/modules';
import type { Contract } from '../src/lib/http/openapi';
import captured from './platform-responses.json';

/**
 * The same classification, run against the contract the deployed host actually published.
 *
 * The synthetic cases in `modules.test.ts` prove the rule; this proves the rule agrees with reality. It is
 * the test that would fail if a route were added, retired or renamed without the client being updated.
 */
const document = captured.captured.openapi.body as { paths: Record<string, unknown>; info: { title: string; version: string } };

const contract: Contract = {
  source: '/openapi/v1.json',
  title: document.info.title,
  version: document.info.version,
  operations: Object.entries(document.paths).flatMap(([path, methods]) =>
    Object.entries(methods as Record<string, unknown>)
      .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method))
      .map(([method]) => ({
        method: method.toUpperCase(),
        path,
        operationId: null,
        summary: null,
        tags: [],
      })),
  ),
};

describe('the live platform contract', () => {
  it('publishes no token route, so authenticated reads cannot be reached yet', () => {
    expect(summarize(contract).issuesTokens).toBe(false);
  });

  it('publishes every route the management centre uses, reads and writes alike', () => {
    const management = resolveModules(contract).find((module) => module.to === '/management');

    expect(management).toBeDefined();
    expect(management?.availability).toBe('connected');
    expect(management?.publishedCount).toBe(management?.requiredCount);
  });

  it('names a permission on exactly the operations the platform gates', () => {
    const management = resolveModules(contract).find((module) => module.to === '/management');

    // `/api/v1/ping` is anonymous and `/api/v1/me` is authenticated but deliberately not permission-gated;
    // every other operation the management centre uses carries a permission the client must name.
    const ungated = new Set(['/api/v1/ping', '/api/v1/me']);
    expect(management?.available.length).toBeGreaterThan(0);

    for (const endpoint of management?.available ?? []) {
      if (ungated.has(endpoint.path)) {
        expect(endpoint.permission, endpoint.path).toBeUndefined();
        continue;
      }
      expect(endpoint.permission, endpoint.path).toBeDefined();
    }
  });

  it('publishes the store route the marketplace screen reads, and no catalogue route', () => {
    const marketplace = resolveModules(contract).find((module) => module.to === '/management/marketplace');

    expect(marketplace?.availability).toBe('connected');
    expect(marketplace?.missing.map((item) => item.path)).toContain('/api/v1/marketplace/listings');
  });

  it('leaves the landtech and customer domains entirely unpublished', () => {
    const modules = resolveModules(contract);

    for (const to of ['/management/landtech', '/management/customers']) {
      const card = modules.find((module) => module.to === to);
      expect(card?.availability, to).toBe('gap');
      expect(card?.publishedCount, to).toBe(0);
    }
  });

  it('refuses every authenticated route without a token', () => {
    // Recorded from the running host, not assumed.
    for (const key of [
      'meAnonymous',
      'mePermissionsAnonymous',
      'rolesAnonymous',
      'unitsCompanyAnonymous',
      'unitsStoreAnonymous',
      'permissionsAnonymous',
      'tenantConfigurationAnonymous',
      'auditAnonymous',
    ] as const) {
      expect(captured.captured[key].status, key).toBe(401);
    }
  });

  it('serves the anonymous probes successfully', () => {
    expect(captured.captured.ping.status).toBe(200);
    expect(captured.captured.healthLive.status).toBe(200);
    expect(captured.captured.healthReady.status).toBe(200);
  });
});
