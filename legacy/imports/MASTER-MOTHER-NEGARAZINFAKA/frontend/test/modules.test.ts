import { describe, expect, it } from 'vitest';
import { resolveModules, summarize, type ModuleCard } from '../src/features/catalog/modules';
import type { Contract, ContractOperation } from '../src/lib/http/openapi';

/**
 * The classification of a module is the one piece of logic that decides what an operator is told about the
 * platform, so it is tested against hand-built contracts. The cases that matter are the ones that were
 * wrong before: a route that exists must never read as missing, and a route that does not exist must never
 * read as present.
 */
function contractOf(...operations: readonly string[]): Contract {
  const parsed: ContractOperation[] = operations.map((entry) => {
    const [method, path] = entry.split(' ');
    return { method: method!, path: path!, operationId: null, summary: null, tags: [] };
  });

  return { source: '/openapi/v1.json', title: 'Test', version: '1.0.0', operations: parsed };
}

function cardFor(modules: readonly ModuleCard[], to: string): ModuleCard {
  const card = modules.find((module) => module.to === to);
  if (card === undefined) {
    throw new Error(`no module resolved for ${to}`);
  }
  return card;
}

describe('module classification', () => {
  it('reports a module whose routes are all published as connected', () => {
    const modules = resolveModules(contractOf('GET /api/v1/me'));

    expect(cardFor(modules, '/management/users').availability).toBe('connected');
    expect(cardFor(modules, '/management/users').publishedCount).toBe(1);
  });

  it('reports a module with no published route as a gap, and lists what it needs', () => {
    const modules = resolveModules(contractOf('GET /api/v1/me'));

    const landtech = cardFor(modules, '/management/landtech');
    expect(landtech.availability).toBe('gap');
    expect(landtech.publishedCount).toBe(0);
    expect(landtech.available).toHaveLength(0);
    expect(landtech.missing.map((item) => item.path)).toContain('/api/v1/landtech/loans');
  });

  it('reports a module with only some of its routes published as partial', () => {
    const modules = resolveModules(contractOf('GET /api/v1/ping', 'GET /api/v1/me'));

    const management = cardFor(modules, '/management');
    expect(management.availability).toBe('partial');
    expect(management.publishedCount).toBe(2);
    expect(management.requiredCount).toBeGreaterThan(2);
    expect(management.missing.length).toBeGreaterThan(0);
  });

  it('matches the templated units route the host actually publishes', () => {
    const modules = resolveModules(contractOf('GET /api/v1/organization/units/{level}'));

    const marketplace = cardFor(modules, '/management/marketplace');
    expect(marketplace.available.map((item) => item.path)).toEqual(['/api/v1/organization/units/{level}']);
    expect(marketplace.availability).toBe('connected');
  });

  it('does not count a level path as satisfying the templated route the host publishes', () => {
    // The host publishes `{level}`, not one route per level, so a client asserting `.../company` would
    // report the hierarchy as missing while the platform serves it.
    const modules = resolveModules(contractOf('GET /api/v1/organization/units/company'));

    expect(cardFor(modules, '/management/marketplace').publishedCount).toBe(0);
  });

  it('keeps health probes out of the contract coverage, since they sit outside the versioned document', () => {
    const management = cardFor(resolveModules(contractOf('GET /api/v1/ping')), '/management');

    expect(management.probes.map((item) => item.path)).toEqual(['/health/live', '/health/ready']);
    expect(management.available.map((item) => item.path)).not.toContain('/health/live');
  });

  it('does not match a deeper path against a shallower pattern', () => {
    // A path segment of `*` matches exactly one segment, so an invented deeper route cannot satisfy a read.
    const modules = resolveModules(contractOf('GET /api/v1/identity/users/deeper/nested/route'));

    expect(cardFor(modules, '/management/users').publishedCount).toBe(0);
  });

  it('reports the token route as absent when the host does not publish it', () => {
    expect(summarize(contractOf('GET /api/v1/ping')).issuesTokens).toBe(false);
    expect(summarize(contractOf('POST /api/v1/auth/token')).issuesTokens).toBe(true);
  });

  it('counts modules by availability so the roll-up adds up to the module list', () => {
    const summary = summarize(contractOf('GET /api/v1/ping', 'GET /api/v1/me'));

    expect(summary.connected + summary.partial + summary.gap).toBe(summary.modules.length);
  });

  it('only ever names permission codes the platform catalog defines', () => {
    const known = new Set([
      'platform.access.administer',
      'platform.audit.read',
      'identity.self.read',
      'identity.user.read',
      'identity.user.write',
      'identity.document.read',
      'identity.document.write',
      'identity.document.verify',
      'organization.unit.read',
      'organization.unit.write',
      'authorization.role.read',
      'authorization.role.write',
      'authorization.permission.read',
      'authorization.permission.publish',
      'tenant.configuration.read',
      'tenant.configuration.write',
    ]);

    for (const card of resolveModules(contractOf())) {
      for (const endpoint of [...card.available, ...card.missing]) {
        if (endpoint.permission !== undefined) {
          expect(known, `${endpoint.path} names an unknown permission`).toContain(endpoint.permission);
        }
      }
    }
  });
});
