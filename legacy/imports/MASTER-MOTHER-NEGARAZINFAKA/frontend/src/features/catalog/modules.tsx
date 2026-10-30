import { StatusChip } from '../../components/StatusChip';
import type { Contract } from '../../lib/http/openapi';

/**
 * How much of a module the running host actually serves.
 *
 * - `connected` every route the screen reads is published by the host.
 * - `partial`   some are published, so the screen shows what is real and names the rest.
 * - `gap`       none are published, so the screen is a named gap with the contract it needs.
 *
 * This replaces a hand-maintained list of availability flags, which could only be correct on the day it was
 * written: when a route was added the client kept telling the operator the service was missing, and when a
 * route was retired the client kept promising it. Deriving the answer from `/openapi/v1.json` makes the
 * homepage a report of the deployed host rather than an opinion about it.
 *
 * Note what this does *not* say. `connected` means the route is published, not that it is callable: a route
 * behind bearer authentication answers 401 until the platform can issue a token. The two facts are reported
 * separately, because collapsing them is how a published route ends up described as a missing feature.
 */
export type ModuleAvailability = 'connected' | 'partial' | 'gap';

export interface ModuleEndpoint {
  /** Method and path exactly as the host publishes them. */
  readonly method: string;
  readonly path: string;
  /**
   * The permission the host's authorization policy requires, taken from the real catalog.
   *
   * Only codes that exist in the platform's permission catalog may appear here. Naming a code the platform
   * does not define would state a requirement the authorization layer cannot enforce, which is worse than
   * naming none.
   */
  readonly permission?: string;
}

export interface ModuleCard {
  readonly to: string;
  readonly title: string;
  readonly short: string;
  readonly description: string;
  readonly monogram: string;
  /** True when the screen needs an access token, which the platform cannot yet issue. */
  readonly requiresToken: boolean;
  readonly availability: ModuleAvailability;
  /** Routes the screen reads today, and how many of them the host publishes. */
  readonly requiredCount: number;
  readonly publishedCount: number;
  readonly available: readonly ModuleEndpoint[];
  /**
   * Routes the screen verifies by calling rather than by finding in the contract.
   *
   * The health endpoints are registered outside the versioned API group, so they are real and callable but
   * genuinely absent from `/openapi/v1.json`. Reporting them as contract routes was a factual error, and
   * omitting them entirely would hide a working part of the platform.
   */
  readonly probes: readonly ModuleEndpoint[];
  /** What the screen still needs, in the host's own path and permission style. */
  readonly missing: readonly ModuleEndpoint[];
}

interface ModuleDefinition {
  readonly to: string;
  readonly title: string;
  readonly short: string;
  readonly description: string;
  readonly monogram: string;
  readonly requiresToken: boolean;
  /** Operations the screen reads today. */
  readonly reads: readonly ModuleEndpoint[];
  /** Routes verified by calling, which sit outside the versioned document. */
  readonly probes?: readonly ModuleEndpoint[];
  /** Contracts the module needs beyond `reads`, which the host does not publish. */
  readonly needs: readonly ModuleEndpoint[];
}

function endpoint(method: string, path: string, permission?: string): ModuleEndpoint {
  return { method: method.toUpperCase(), path, ...(permission === undefined ? {} : { permission }) };
}

/**
 * The navigation model.
 *
 * `reads` is what a screen consumes today and `needs` is what it would consume once the backend grows. Both
 * are written in the host's existing path and permission style, so a backend developer can add a missing
 * contract and watch the screen light up without changing any logic in this file.
 */
export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    to: '/management',
    title: 'مرکز مدیریت',
    short: 'سلامت سرویس، هویت جاری و ساختار سازمانی',
    description:
      'وضعیت زنده سرویس، هویت و دامنه دسترسی کاربر جاری، شرکت‌ها و شعب، نقش‌ها، کاتالوگ مجوزها، پیکربندی مستأجر و رد ممیزی.',
    monogram: 'م',
    requiresToken: true,
    probes: [endpoint('GET', '/health/live'), endpoint('GET', '/health/ready')],
    reads: [
      endpoint('GET', '/api/v1/ping'),
      endpoint('GET', '/api/v1/me'),
      endpoint('GET', '/api/v1/me/permissions', 'platform.access.administer'),
      endpoint('GET', '/api/v1/organization/units/{level}', 'organization.unit.read'),
      endpoint('GET', '/api/v1/roles', 'authorization.role.read'),
      endpoint('GET', '/api/v1/permissions', 'authorization.permission.read'),
      endpoint('GET', '/api/v1/tenant/configuration', 'tenant.configuration.read'),
      endpoint('GET', '/api/v1/audit', 'platform.audit.read'),
      endpoint('POST', '/api/v1/tenants', 'platform.access.administer'),
      endpoint('POST', '/api/v1/tenants/lifecycle/activate', 'platform.access.administer'),
      endpoint('POST', '/api/v1/tenants/lifecycle/suspend', 'platform.access.administer'),
      endpoint('POST', '/api/v1/tenants/lifecycle/close', 'platform.access.administer'),
      endpoint('POST', '/api/v1/organization/units/{level}', 'organization.unit.write'),
      endpoint('PUT', '/api/v1/organization/units/{level}/{unitId}', 'organization.unit.write'),
      endpoint('POST', '/api/v1/tenants/lifecycle/{level}/{unitId}/activate', 'organization.unit.write'),
      endpoint('POST', '/api/v1/tenants/lifecycle/{level}/{unitId}/suspend', 'organization.unit.write'),
      endpoint('POST', '/api/v1/roles', 'authorization.role.write'),
      endpoint('PUT', '/api/v1/roles/{roleId}', 'authorization.role.write'),
      endpoint('POST', '/api/v1/roles/{roleId}/permissions', 'authorization.role.write'),
      endpoint('DELETE', '/api/v1/roles/{roleId}/permissions/{permissionCode}', 'authorization.role.write'),
      endpoint('POST', '/api/v1/roles/{roleId}/retire', 'authorization.role.write'),
      endpoint('POST', '/api/v1/roles/{roleId}/activate', 'authorization.role.write'),
      endpoint('POST', '/api/v1/permissions/publish', 'authorization.permission.publish'),
      endpoint('PUT', '/api/v1/tenant/configuration/settings/{code}', 'tenant.configuration.write'),
      endpoint('DELETE', '/api/v1/tenant/configuration/settings/{code}', 'tenant.configuration.write'),
    ],
    needs: [
      endpoint('POST', '/api/v1/auth/token'),
      endpoint('GET', '/api/v1/identity/users', 'identity.user.read'),
    ],
  },
  {
    to: '/management/users',
    title: 'کاربران',
    short: 'هویت مرکزی پلتفرم',
    description:
      'کاربران، نمایندگان و کارکنان همگی روی یک هویت مرکزی ثبت می‌شوند. هویت کاربر جاری از سرویس واقعی خوانده می‌شود؛ فهرست کامل هنوز قرارداد ندارد.',
    monogram: 'ک',
    requiresToken: true,
    reads: [endpoint('GET', '/api/v1/me')],
    needs: [
      endpoint('GET', '/api/v1/identity/users', 'identity.user.read'),
      endpoint('GET', '/api/v1/identity/users/{userId}', 'identity.user.read'),
      endpoint('POST', '/api/v1/identity/users', 'identity.user.write'),
      endpoint('GET', '/api/v1/identity/users/{userId}/documents', 'identity.document.read'),
    ],
  },
  {
    to: '/management/customers',
    title: 'مشتریان',
    short: 'پرونده مشتریان و اسناد',
    description:
      'پرونده هر مشتری باید به هویت مرکزی متصل باشد و اسناد آن تنها پس از راستی‌آزمایی به داده اصلی تبدیل شود.',
    monogram: 'م',
    requiresToken: true,
    reads: [],
    needs: [
      endpoint('GET', '/api/v1/customers', 'identity.user.read'),
      endpoint('GET', '/api/v1/customers/{customerId}', 'identity.user.read'),
      endpoint('GET', '/api/v1/customers/{customerId}/documents', 'identity.document.read'),
    ],
  },
  {
    to: '/management/sellers',
    title: 'فروشندگان',
    short: 'حساب و نقش فروشندگان',
    description:
      'نقش‌های واقعی پلتفرم از سرویس خوانده می‌شوند، چون نقش فروشنده یک نقش سازمانی است. خودِ موجودیت فروشنده هنوز در مدل داده پلتفرم تعریف نشده است.',
    monogram: 'ف',
    requiresToken: true,
    reads: [endpoint('GET', '/api/v1/roles', 'authorization.role.read')],
    needs: [
      endpoint('GET', '/api/v1/sellers', 'identity.user.read'),
      endpoint('POST', '/api/v1/sellers', 'identity.user.write'),
      endpoint('GET', '/api/v1/sellers/{sellerId}/documents', 'identity.document.read'),
    ],
  },
  {
    to: '/management/marketplace',
    title: 'بازارگاه',
    short: 'کاتالوگ، سفارش و تسویه',
    description:
      'فروشگاه‌های واقعی از مسیر سازمانی خوانده می‌شوند، چون فروشگاه یک واحد سازمانی است و پرچم خرده‌فروشی را از همان‌جا می‌گیرد. کالا و سفارش هنوز در مدل داده پلتفرم وجود ندارند.',
    monogram: 'ب',
    requiresToken: true,
    reads: [endpoint('GET', '/api/v1/organization/units/{level}', 'organization.unit.read')],
    needs: [
      endpoint('GET', '/api/v1/marketplace/listings'),
      endpoint('GET', '/api/v1/marketplace/categories'),
      endpoint('GET', '/api/v1/marketplace/inventory'),
      endpoint('GET', '/api/v1/marketplace/orders'),
      endpoint('GET', '/api/v1/marketplace/orders/{orderId}'),
      endpoint('POST', '/api/v1/marketplace/checkout'),
      endpoint('GET', '/api/v1/marketplace/payments'),
    ],
  },
  {
    to: '/management/customer-portal',
    title: 'پنل مشتری',
    short: 'تجربه خودسرویس مشتری',
    description:
      'هویت و دامنه دسترسی کاربر جاری از سرویس واقعی خوانده می‌شود. سفارش، پرداخت و مانده حساب مشتری هنوز قرارداد ندارد.',
    monogram: 'پ',
    requiresToken: true,
    reads: [
      endpoint('GET', '/api/v1/me'),
      endpoint('GET', '/api/v1/tenant/configuration', 'tenant.configuration.read'),
    ],
    needs: [
      endpoint('GET', '/api/v1/portal/customer/summary', 'identity.self.read'),
      endpoint('GET', '/api/v1/portal/customer/orders', 'identity.self.read'),
      endpoint('GET', '/api/v1/portal/customer/payments', 'identity.self.read'),
    ],
  },
  {
    to: '/management/seller-portal',
    title: 'پنل فروشنده',
    short: 'تجربه خودسرویس فروشنده',
    description:
      'دامنه دسترسی و نقش فروشنده از سرویس واقعی خوانده می‌شود. فروش، پورسانت، موجودی و تسویه هنوز در پلتفرم تعریف نشده‌اند.',
    monogram: 'ف',
    requiresToken: true,
    reads: [
      endpoint('GET', '/api/v1/me'),
      endpoint('GET', '/api/v1/roles', 'authorization.role.read'),
    ],
    needs: [
      endpoint('GET', '/api/v1/portal/seller/summary', 'identity.self.read'),
      endpoint('GET', '/api/v1/portal/seller/listings', 'identity.self.read'),
      endpoint('GET', '/api/v1/portal/seller/orders', 'identity.self.read'),
      endpoint('GET', '/api/v1/portal/seller/settlement', 'identity.self.read'),
    ],
  },
  {
    to: '/management/landtech',
    title: 'لندتک',
    short: 'خدمات فناوری و اعتبار',
    description:
      'هیچ‌یک از دامنه‌های اعتبار و خدمات فناوری (متقاضی، درخواست، اعتبارسنجی، وام، قسط، قرارداد) در مدل داده پلتفرم وجود ندارد.',
    monogram: 'ل',
    requiresToken: true,
    reads: [],
    needs: [
      endpoint('GET', '/api/v1/landtech/applicants'),
      endpoint('GET', '/api/v1/landtech/applications'),
      endpoint('GET', '/api/v1/landtech/credit/eligibility'),
      endpoint('GET', '/api/v1/landtech/loans'),
      endpoint('GET', '/api/v1/landtech/loans/{loanId}/installments'),
      endpoint('GET', '/api/v1/landtech/loans/{loanId}/payments'),
      endpoint('GET', '/api/v1/landtech/contracts'),
    ],
  },
];

/** The contract the platform would need in order to hand out a session at all. */
export const TOKEN_ENDPOINT: ModuleEndpoint = endpoint('POST', '/api/v1/auth/token');

/** Resolves every module against the running host's contract, in navigation order. */
export function resolveModules(contract: Contract): readonly ModuleCard[] {
  const published = new Set(contract.operations.map((operation) => `${operation.method} ${operation.path}`));

  return MODULE_DEFINITIONS.map((definition) => {
    const available = definition.reads.filter((item) => published.has(`${item.method} ${item.path}`));
    const missing = [
      ...definition.reads.filter((item) => !published.has(`${item.method} ${item.path}`)),
      ...definition.needs,
    ];

    const availability: ModuleAvailability =
      available.length === 0 ? 'gap' : available.length < definition.reads.length ? 'partial' : 'connected';

    return {
      to: definition.to,
      title: definition.title,
      short: definition.short,
      description: definition.description,
      monogram: definition.monogram,
      requiresToken: definition.requiresToken,
      availability,
      requiredCount: definition.reads.length,
      publishedCount: available.length,
      available,
      probes: definition.probes ?? [],
      missing,
    };
  });
}

/** Finds one resolved module, for the screens that render a single one. */
export function resolveModule(contract: Contract, to: string): ModuleCard | null {
  return resolveModules(contract).find((card) => card.to === to) ?? null;
}

/** A whole-platform roll-up for the homepage, counting what the host really publishes. */
export interface PlatformSummary {
  readonly modules: readonly ModuleCard[];
  readonly connected: number;
  readonly partial: number;
  readonly gap: number;
  readonly publishedOperations: number;
  readonly totalOperations: number;
  readonly title: string;
  readonly version: string;
  /** Whether the host can hand out a session, which decides if authenticated routes are callable. */
  readonly issuesTokens: boolean;
}

export function summarize(contract: Contract): PlatformSummary {
  const modules = resolveModules(contract);

  return {
    modules,
    connected: modules.filter((module) => module.availability === 'connected').length,
    partial: modules.filter((module) => module.availability === 'partial').length,
    gap: modules.filter((module) => module.availability === 'gap').length,
    publishedOperations: contract.operations.length,
    totalOperations: contract.operations.length,
    title: contract.title,
    version: contract.version,
    issuesTokens: contract.operations.some(
      (operation) =>
        operation.method === TOKEN_ENDPOINT.method && operation.path === TOKEN_ENDPOINT.path,
    ),
  };
}

const AVAILABILITY: Readonly<
  Record<ModuleAvailability, { readonly label: string; readonly tone: 'positive' | 'caution' | 'neutral' }>
> = {
  connected: { label: 'متصل به سرویس', tone: 'positive' },
  partial: { label: 'سرویس ناقص', tone: 'caution' },
  gap: { label: 'بدون قرارداد سرویس', tone: 'neutral' },
};

export function availabilityLabel(availability: ModuleAvailability): string {
  return AVAILABILITY[availability].label;
}

export function availabilityChip(availability: ModuleAvailability) {
  return <StatusChip label={AVAILABILITY[availability].label} tone={AVAILABILITY[availability].tone} dot />;
}

/** Persian digits, because every figure on these screens is read by a Persian-speaking operator. */
export function toPersianDigits(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}
