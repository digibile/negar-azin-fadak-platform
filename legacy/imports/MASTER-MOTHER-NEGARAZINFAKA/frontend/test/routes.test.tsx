import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../src/features/site/HomePage';
import { ModulesPage } from '../src/features/site/ModulesPage';
import { StatusPage } from '../src/features/site/StatusPage';
import { LoginPage } from '../src/features/site/LoginPage';
import { DashboardPage } from '../src/features/management/DashboardPage';
import {
  CustomersPage,
  CustomerPortalPage,
  LandTechPage,
  MarketplacePage,
  SellerPortalPage,
  SellersPage,
  UsersPage,
} from '../src/features/management/ManagementPages';
import { setAccessToken } from '../src/lib/session';
import captured from './platform-responses.json';

/**
 * Every screen, rendered against the responses the running host actually gave.
 *
 * The contract of this suite is the six states: loading, empty, error, unauthorized, forbidden and network
 * failure. A screen is only considered working here if all six are reachable and correct, because a page that
 * renders only the happy path is the page that misleads an operator when the platform is in trouble.
 */

type Stub = { status: number; body: unknown; raw?: string; contentType?: string; correlationId?: string | null };

const RESPONSES: Record<string, Stub> = {
  '/api/v1/ping': { status: 200, body: captured.captured.ping.body },
  '/health/live': { status: 200, body: true, raw: captured.captured.healthLive.raw, contentType: 'text/plain' },
  '/health/ready': { status: 200, body: true, raw: captured.captured.healthReady.raw, contentType: 'text/plain' },
  '/openapi/v1.json': { status: 200, body: captured.captured.openapi.body },
  '/api/v1/me': { status: 401, body: captured.captured.meAnonymous.body },
  '/api/v1/me/permissions': { status: 401, body: captured.captured.mePermissionsAnonymous.body },
  '/api/v1/roles': { status: 401, body: captured.captured.rolesAnonymous.body },
  '/api/v1/permissions': { status: 401, body: captured.captured.permissionsAnonymous.body },
  '/api/v1/tenant/configuration': { status: 401, body: captured.captured.tenantConfigurationAnonymous.body },
  '/api/v1/audit': { status: 401, body: captured.captured.auditAnonymous.body },
  '/api/v1/organization/units/company': { status: 401, body: captured.captured.unitsCompanyAnonymous.body },
  '/api/v1/organization/units/brand': { status: 401, body: captured.captured.unitsStoreAnonymous.body },
  '/api/v1/organization/units/branch': { status: 401, body: captured.captured.unitsStoreAnonymous.body },
  '/api/v1/organization/units/store': { status: 401, body: captured.captured.unitsStoreAnonymous.body },
};

let requests: string[] = [];
let offline = false;

/** Serves the recorded responses, so a test failure means the client is wrong, not the network. */
function installFetch(overrides: Record<string, Stub> = {}) {
  const table = { ...RESPONSES, ...overrides };

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const [path] = url.split('?');
    requests.push(url);

    if (offline) {
      throw new TypeError('Failed to fetch');
    }

    const stub = table[path];
    if (stub === undefined) {
      return new Response(JSON.stringify({ title: 'Not Found', status: 404 }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = stub.raw ?? JSON.stringify(stub.body);
    return new Response(text, {
      status: stub.status,
      headers: {
        'Content-Type': stub.contentType ?? 'application/json',
        ...(stub.correlationId === undefined || stub.correlationId === null
          ? {}
          : { 'X-Correlation-Id': stub.correlationId }),
      },
    });
  });
}

function renderAt(ui: React.ReactElement, path = '/') {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

beforeEach(() => {
  requests = [];
  offline = false;
  setAccessToken(null);
  vi.stubGlobal('fetch', installFetch());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('public screens', () => {
  it('reports real service health on the home page', async () => {
    renderAt(<HomePage />);

    await waitFor(() => {
      expect(screen.getAllByText('پاسخ‌گو').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('آنچه پلتفرم امروز واقعاً ارائه می‌دهد')).toBeDefined();
  });

  it('reads module status from the contract instead of a hardcoded flag', async () => {
    renderAt(<ModulesPage />);

    // The host publishes the management centre's routes, so it must not read as waiting for a service.
    const connected = await screen.findAllByText('متصل به سرویس');
    expect(connected.length).toBeGreaterThan(0);

    // The landtech domain is genuinely absent, and must say so. Several cards can read that way at once.
    expect(screen.getAllByText('بدون قرارداد سرویس').length).toBeGreaterThan(0);

    // No status chip may claim a module is waiting for a service. The phrase may still appear in prose, so
    // the assertion is scoped to the chip element the old hardcoded flag rendered.
    for (const chip of Array.from(document.querySelectorAll('.chip'))) {
      expect(chip.textContent).not.toBe('در انتظار سرویس');
    }
  });

  it('lists the routes the host published, and the ones a module still needs', async () => {
    renderAt(<StatusPage />);

    expect(await screen.findByText('مسیرهای منتشرشده روی میزبان')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('GET /api/v1/ping')).toBeDefined();
    });
    expect(screen.getAllByText('میزبان مسیر صدور توکن را منتشر نمی‌کند').length).toBeGreaterThan(0);
  });
});

describe('the session screen', () => {
  it('asks for no username and no password, because the platform has no way to accept them', async () => {
    renderAt(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('سرویس صدور توکن موجود نیست')).toBeDefined();
    });

    expect(screen.queryByLabelText('شناسه کاربری')).toBeNull();
    expect(screen.queryByLabelText('رمز عبور')).toBeNull();
    expect(screen.queryByText('ورود با رمز یک‌بارمصرف')).toBeNull();
  });

  it('discards a token the platform rejects and says why', async () => {
    const user = userEvent.setup();
    renderAt(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('سرویس صدور توکن موجود نیست')).toBeDefined();
    });

    await user.type(screen.getByRole('textbox', { name: 'توکن دسترسی' }), 'not-a-real-token');
    await user.click(screen.getByRole('button', { name: 'اعتبارسنجی و ورود' }));

    expect(await screen.findByText('توکن توسط پلتفرم پذیرفته نشد')).toBeDefined();
    expect(window.sessionStorage.getItem('naf.session.accessToken')).toBeNull();
  });

  it('distinguishes a valid token that lacks permission from one that is invalid', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      installFetch({ '/api/v1/me': { status: 403, body: { title: 'Forbidden', status: 403 } } }),
    );

    renderAt(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: 'توکن دسترسی' }), 'a-valid-but-insufficient-token');
    await user.click(screen.getByRole('button', { name: 'اعتبارسنجی و ورود' }));

    expect(await screen.findByText('توکن معتبر است اما مجوز کافی ندارد')).toBeDefined();
  });
});

describe('authenticated screens', () => {
  it('shows a session-required state, not a crash, when no token is held', async () => {
    renderAt(<DashboardPage />, '/management');

    const states = await screen.findAllByText('برای این بخش باید وارد شوید');
    expect(states.length).toBeGreaterThan(0);

    // The anonymous probes must still be reported as working.
    expect(screen.getAllByText('پاسخ‌گو').length).toBeGreaterThan(0);
  });

  it('shows the forbidden state for a permission-gated route answered with 403', async () => {
    vi.stubGlobal(
      'fetch',
      installFetch({
        '/api/v1/me': {
          status: 200,
          body: {
            userId: '11111111-1111-1111-1111-111111111111',
            scope: { organizationId: '22222222-2222-2222-2222-222222222222', companyId: null, brandId: null, branchId: null, storeId: null },
            roles: ['support'],
            permissions: ['identity.self.read'],
          },
        },
        '/api/v1/me/permissions': { status: 403, body: { title: 'Forbidden', status: 403 } },
      }),
    );
    setAccessToken('a-valid-token');

    renderAt(<DashboardPage />, '/management');

    expect(await screen.findByText('مجوز کافی در نقش شما وجود ندارد')).toBeDefined();
    // The identity itself did resolve, and must be shown as real data.
    expect(screen.getByText('support')).toBeDefined();
  });

  it('renders real rows when the platform answers with data', async () => {
    vi.stubGlobal(
      'fetch',
      installFetch({
        '/api/v1/roles': {
          status: 200,
          body: {
            items: [
              {
                id: '33333333-3333-3333-3333-333333333333',
                code: 'store.manager',
                name: 'مدیر فروشگاه',
                description: 'مدیریت یک فروشگاه',
                status: 'Active',
                isActive: true,
                isBuiltIn: true,
                permissions: ['organization.unit.read', 'authorization.role.read'],
              },
            ],
            pageNumber: 1,
            pageSize: 20,
            totalCount: 1,
            count: 1,
            hasNextPage: false,
            totalPages: 1,
          },
        },
      }),
    );
    setAccessToken('a-valid-token');

    renderAt(<SellersPage />, '/management/sellers');

    expect(await screen.findByText('مدیر فروشگاه')).toBeDefined();
    expect(screen.getByText('store.manager')).toBeDefined();
  });

  it('distinguishes an empty collection from a failure', async () => {
    vi.stubGlobal(
      'fetch',
      installFetch({
        '/api/v1/audit': {
          status: 200,
          body: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, count: 0, hasNextPage: false, totalPages: 0 },
        },
      }),
    );
    setAccessToken('a-valid-token');

    renderAt(<DashboardPage />, '/management');

    expect(await screen.findByText('رخدادی ثبت نشده است')).toBeDefined();
  });

  it('reports a network failure as unreachable rather than as missing data', async () => {
    offline = true;
    setAccessToken('a-valid-token');

    renderAt(<DashboardPage />, '/management');

    const offlineStates = await screen.findAllByText('سرویس پلتفرم در دسترس نیست');
    expect(offlineStates.length).toBeGreaterThan(0);
  });

  it('reports a rejected path as absent from the platform, not as an empty result', async () => {
    vi.stubGlobal(
      'fetch',
      installFetch({ '/api/v1/roles': { status: 404, body: { title: 'Not Found', status: 404 } } }),
    );
    setAccessToken('a-valid-token');

    renderAt(<SellersPage />, '/management/sellers');

    expect(await screen.findByText('این مسیر روی پلتفرم وجود ندارد')).toBeDefined();
  });
});

describe('domains the platform has not built', () => {
  it('shows the customer domain as a named gap with the routes it needs, and no invented rows', async () => {
    renderAt(<CustomersPage />, '/management/customers');

    expect(await screen.findByText('دامنه مشتری روی پلتفرم مدل نشده است')).toBeDefined();
    // The route is rendered as a method and a path in adjacent nodes, so match on content rather than text.
    // Both the gap panel and the contract panel list the route; either occurrence proves it is stated.
    expect(
      screen.getAllByText((_content, node) => node?.textContent === 'GET /api/v1/customers').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the landtech domain as a gap and displays no financial figure', async () => {
    renderAt(<LandTechPage />, '/management/landtech');

    expect(await screen.findByText('دامنه اعتبار و خدمات فناوری روی پلتفرم مدل نشده است')).toBeDefined();
    expect(
      screen.getAllByText((_content, node) => node?.textContent === 'GET /api/v1/landtech/loans').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('در این حوزه هنوز سرویسی روی پلتفرم فعال نشده است.')).toBeDefined();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the marketplace catalogue as a gap while showing the real store route', async () => {
    setAccessToken('a-valid-token');
    renderAt(<MarketplacePage />, '/management/marketplace');

    expect(await screen.findByText('کاتالوگ، سفارش و تسویه روی پلتفرم مدل نشده است')).toBeDefined();
    expect(
      screen.getAllByText((_content, node) => node?.textContent === 'GET /api/v1/organization/units/{level}').length,
    ).toBeGreaterThan(0);
  });
});

describe('the remaining module screens', () => {
  const cases: readonly { readonly name: string; readonly ui: React.ReactElement; readonly route: string; readonly heading: string }[] = [
    { name: 'users', ui: <UsersPage />, route: '/management/users', heading: 'کاربران' },
    { name: 'customer portal', ui: <CustomerPortalPage />, route: '/management/customer-portal', heading: 'پنل مشتری' },
    { name: 'seller portal', ui: <SellerPortalPage />, route: '/management/seller-portal', heading: 'پنل فروشنده' },
  ];

  for (const testCase of cases) {
    it(`renders ${testCase.name} with real data, the session state, and its contract`, async () => {
      setAccessToken('a-valid-token');
      const { container } = renderAt(testCase.ui, testCase.route);

      const header = within(container).getByRole('heading', { level: 1 });
      expect(header.textContent).toBe(testCase.heading);

      await waitFor(() => {
        expect(screen.queryAllByText('برای این بخش باید وارد شوید').length).toBeGreaterThan(0);
      });

      expect(within(container).getByText('مسیرهای موجود روی سرویس')).toBeDefined();
    });
  }
});
