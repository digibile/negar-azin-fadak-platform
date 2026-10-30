import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManagementShell } from '../src/features/management/ManagementShell';
import { setAccessToken } from '../src/lib/session';
import type { EffectiveMenuTree } from '../src/lib/http/platform';

/**
 * The management menu, rendered against what the platform answers.
 *
 * The point of reading navigation from `/api/v1/menu/tree` is that the client's own list of links stops being
 * authoritative. These tests therefore assert both halves: the shell shows what the platform published, and —
 * when the platform published nothing, or refused — it shows no links at all rather than falling back to a
 * list compiled into the bundle.
 */
const IDENTITY = {
  userId: '11111111-1111-1111-1111-111111111111',
  scope: {
    organizationId: '22222222-2222-2222-2222-222222222222',
    companyId: null,
    brandId: null,
    branchId: null,
    storeId: null,
  },
  roles: ['platform.admin'],
  permissions: ['platform.access.administer'],
};

const PUBLISHED: EffectiveMenuTree = {
  menus: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      code: 'management',
      title: 'مدیریت',
      englishTitle: 'Management',
      level: 'Tenant',
      isActive: true,
      isPlatformDefined: true,
      sections: [
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          parentId: null,
          code: 'operations',
          title: 'عملیات',
          englishTitle: 'Operations',
          icon: null,
          route: null,
          sortOrder: 1,
          permission: null,
          module: 'platform',
          depth: 0,
          level: 'Tenant',
          isActive: true,
          isPlatformDefined: true,
          isLeaf: false,
          children: [
            {
              id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              parentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              code: 'users',
              title: 'کاربران',
              englishTitle: 'Users',
              icon: null,
              route: '/management/users',
              sortOrder: 1,
              permission: 'identity.user.read',
              module: 'identity',
              depth: 1,
              level: 'Tenant',
              isActive: true,
              isPlatformDefined: true,
              isLeaf: true,
              children: [],
            },
          ],
        },
      ],
    },
  ],
  sectionCount: 2,
};

type Stub = { status: number; body: unknown };

function installFetch(table: Record<string, Stub>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const [path] = String(input).split('?');
    const stub = table[path];

    if (stub === undefined) {
      return new Response(JSON.stringify({ title: 'Not Found', status: 404 }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(stub.body), {
      status: stub.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

function renderShell(path = '/management') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ManagementShell />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAccessToken('a-valid-token');
  vi.stubGlobal(
    'fetch',
    installFetch({
      '/api/v1/me': { status: 200, body: IDENTITY },
      '/api/v1/menu/tree': { status: 200, body: PUBLISHED },
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the management menu', () => {
  it('links to what the platform published, and nothing else', async () => {
    renderShell();

    const link = await screen.findByRole('link', { name: 'کاربران' });
    expect(link.getAttribute('href')).toBe('/management/users');

    // A section the platform published without a route stays a heading: clicking it would promise a page
    // the platform never registered.
    const heading = screen.getByText('عملیات');
    expect(heading.tagName).toBe('P');
    expect(screen.queryByRole('link', { name: 'عملیات' })).toBeNull();
  });

  it('names the current address with the section that owns it', async () => {
    renderShell('/management/users');

    await screen.findByRole('link', { name: 'کاربران' });
    await waitFor(() => {
      expect(screen.getAllByText('کاربران').length).toBeGreaterThan(1);
    });
  });

  it('says the session has no menu instead of showing a built-in list', async () => {
    vi.stubGlobal(
      'fetch',
      installFetch({
        '/api/v1/me': { status: 200, body: IDENTITY },
        '/api/v1/menu/tree': { status: 200, body: { menus: [], sectionCount: 0 } },
      }),
    );

    renderShell();

    expect(await screen.findByText('منویی برای این نشست وجود ندارد')).toBeDefined();

    // The catalog used to stand in for navigation. If any of its titles is still clickable, the shell is
    // offering sections the platform never published.
    expect(screen.queryByRole('link', { name: 'فروشندگان' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'کاربران' })).toBeNull();
  });

  it('reports a refused read as a failure, not as an empty menu', async () => {
    vi.stubGlobal(
      'fetch',
      installFetch({
        '/api/v1/me': { status: 200, body: IDENTITY },
        '/api/v1/menu/tree': { status: 401, body: { title: 'Unauthorized', status: 401 } },
      }),
    );

    renderShell();

    expect(await screen.findByText('منو در دسترس نیست')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'کاربران' })).toBeNull();
  });
});
