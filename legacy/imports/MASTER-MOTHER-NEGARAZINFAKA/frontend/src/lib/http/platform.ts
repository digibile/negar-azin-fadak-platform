import { send, type QueryValue } from './client';

/** Route prefix of the current API version. */
const V1 = '/api/v1';

/** One page of results as the platform returns it from every list endpoint. */
export interface Page<TItem> {
  readonly items: readonly TItem[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

/** The tenant coordinates the platform resolved for the caller. */
export interface TenantScope {
  readonly organizationId: string;
  readonly companyId: string | null;
  readonly brandId: string | null;
  readonly branchId: string | null;
  readonly storeId: string | null;
}

/** The caller's resolved identity, as `GET /api/v1/me` reports it. */
export interface CurrentPrincipal {
  readonly userId: string;
  readonly scope: TenantScope;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

/** An organizational unit: company, brand, branch or store. */
export interface OrganizationalUnit {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly legalName: string;
  readonly status: string;
  readonly isActive: boolean;
  readonly isRetail: boolean | null;
}

/** A role, with the permission codes it currently grants. */
export interface Role {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: string;
  readonly isActive: boolean;
  readonly isBuiltIn: boolean;
  readonly permissions: readonly string[];
}

/** One entry of the platform-wide permission catalog. */
export interface Permission {
  readonly code: string;
  readonly category: string;
  readonly title: string;
  readonly description: string | null;
  readonly isActive: boolean;
}

/** A tenant setting. Sensitive values arrive masked, and the client never asks for the real one. */
export interface TenantSetting {
  readonly code: string;
  readonly kind: string;
  readonly isSensitive: boolean;
  readonly value: string;
  readonly rangeMinimum: number;
  readonly rangeMaximum: number;
}

/** One line of the audit trail of the caller's own organization. */
export interface AuditRecord {
  readonly id: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly outcome: string;
  readonly actorUserId: string | null;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly reasonCode: string | null;
}

/** The answer of `GET /api/v1/ping`. */
export interface PingResult {
  readonly status: string;
  readonly version: number;
}

/**
 * One section of a navigation menu, as `GET /api/v1/menu/tree` reports it.
 *
 * The platform already filters this tree by the caller's permissions and withholds anything withdrawn, so a
 * client renders it as given. `permission` is the requirement behind the section's presence, and it is
 * informational here: its absence from this tree is the enforcement, not something to re-check locally.
 */
export interface MenuNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly title: string;
  readonly englishTitle: string | null;
  readonly icon: string | null;
  readonly route: string | null;
  readonly sortOrder: number;
  readonly permission: string | null;
  readonly module: string;
  readonly depth: number;
  readonly level: string;
  readonly isActive: boolean;
  readonly isPlatformDefined: boolean;
  readonly isLeaf: boolean;
  readonly children: readonly MenuNode[];
}

/** One menu of the caller's own level, with its sections. */
export interface MenuSummary {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly englishTitle: string | null;
  readonly level: string;
  readonly isActive: boolean;
  readonly isPlatformDefined: boolean;
  readonly sections: readonly MenuNode[];
}

/** The caller's navigation: every menu that applies to the level they act in. */
export interface EffectiveMenuTree {
  readonly menus: readonly MenuSummary[];
  readonly sectionCount: number;
}

/** What one run of the base-structure installer did. */
export interface MenuPublicationResult {
  readonly menuId: string | null;
  readonly sectionsAdded: number;
  readonly sectionsKept: number;
  readonly sectionsSkipped: number;
}

/** The organizational levels the platform exposes as addressable routes. */
export const UNIT_LEVELS = ['company', 'brand', 'branch', 'store'] as const;

export type UnitLevel = (typeof UNIT_LEVELS)[number];

/** Persian labels for the levels, in the order a reader thinks about them. */
export const UNIT_LEVEL_LABELS: Readonly<Record<UnitLevel, string>> = {
  company: 'شرکت',
  brand: 'برند',
  branch: 'شعبه',
  store: 'فروشگاه',
};

function query(page: number, pageSize: number): Record<string, QueryValue> {
  return { page, pageSize };
}

/** Body of a tenant-provisioning request. */
export interface ProvisionTenantBody {
  readonly code: string;
  readonly name: string;
  readonly legalName?: string | null;
  readonly currencyCode?: string | null;
  readonly economicCode?: string | null;
  readonly nationalRegistrationNumber?: string | null;
}

/** What provisioning created. */
export interface ProvisionTenantResult {
  readonly organizationId: string;
  readonly configurationId: string;
  readonly roleIds: readonly string[];
  readonly isActive: boolean;
}

/** Body of an organizational-unit creation or rename. */
export interface OrganizationalUnitBody {
  readonly code: string;
  readonly name: string;
  readonly legalName?: string | null;
}

/** Body of a role definition or rename. */
export interface RoleBody {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
}

/** Body of a permission grant. */
export interface PermissionGrantBody {
  readonly permissionCode: string;
}

/** Body of a tenant-setting write. */
export interface TenantSettingBody {
  readonly value?: string | null;
  readonly kind: string;
  readonly isSensitive: boolean;
  readonly rangeMinimum?: number | null;
  readonly rangeMaximum?: number | null;
}

/** What publishing the permission catalog changed. */
export interface PublishCatalogResult {
  readonly added: number;
  readonly total: number;
}

export const platformApi = {
  /* ---------- public probes: no token required ---------- */

  ping(signal?: AbortSignal): Promise<PingResult> {
    return send<PingResult>({ method: 'GET', path: `${V1}/ping`, authenticated: false }, signal);
  },

  liveness(signal?: AbortSignal): Promise<boolean> {
    return send<string>({ method: 'GET', path: '/health/live', authenticated: false }, signal).then(
      (body) => body === 'Healthy',
    );
  },

  readiness(signal?: AbortSignal): Promise<boolean> {
    return send<string>({ method: 'GET', path: '/health/ready', authenticated: false }, signal).then(
      (body) => body === 'Healthy',
    );
  },

  /* ---------- the caller's own identity ---------- */

  me(signal?: AbortSignal): Promise<CurrentPrincipal> {
    return send<CurrentPrincipal>({ method: 'GET', path: `${V1}/me` }, signal);
  },

  /**
   * The caller's permissions, through the endpoint that requires `platform.access.administer`.
   *
   * This is the platform's own demonstration that authorization fails closed, so a client that shows the
   * user's permission list from the token would be hiding a real behaviour. A 403 here is a correct answer,
   * not a defect, and the screens treat it as one.
   */
  myPermissions(signal?: AbortSignal): Promise<readonly string[]> {
    return send<{ permissions: readonly string[] }>({ method: 'GET', path: `${V1}/me/permissions` }, signal).then(
      (body) => body.permissions,
    );
  },

  /* ---------- navigation ---------- */

  /**
   * The caller's own navigation.
   *
   * This is the client's only navigation source. The alternative — a list of links compiled into the bundle —
   * can only ever agree with the platform on the day it was written, and it disagrees in the direction that
   * matters: it keeps offering sections an operator's roles no longer open.
   */
  menuTree(signal?: AbortSignal): Promise<EffectiveMenuTree> {
    return send<EffectiveMenuTree>({ method: 'GET', path: `${V1}/menu/tree` }, signal);
  },

  /**
   * The whole structure of the caller's own level, unfiltered and including what is withdrawn.
   *
   * Answered only to callers holding the menu administration permission, because it describes sections the
   * caller cannot open — which is what makes it the right input for an administration screen and the wrong
   * one for navigation.
   */
  listMenus(signal?: AbortSignal): Promise<readonly MenuSummary[]> {
    return send<readonly MenuSummary[]>({ method: 'GET', path: `${V1}/menus` }, signal);
  },

  publishBaseMenu(signal?: AbortSignal): Promise<MenuPublicationResult> {
    return send<MenuPublicationResult>({ method: 'POST', path: `${V1}/menu/publish` }, signal);
  },

  /* ---------- organizational hierarchy ---------- */

  listUnits(
    level: UnitLevel,
    paging: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal,
  ): Promise<Page<OrganizationalUnit>> {
    return send<Page<OrganizationalUnit>>(
      {
        method: 'GET',
        path: `${V1}/organization/units/${level}`,
        query: query(paging.page ?? 1, paging.pageSize ?? 20),
      },
      signal,
    );
  },

  /* ---------- authorization ---------- */

  listRoles(paging: { page?: number; pageSize?: number } = {}, signal?: AbortSignal): Promise<Page<Role>> {
    return send<Page<Role>>({ method: 'GET', path: `${V1}/roles`, query: query(paging.page ?? 1, paging.pageSize ?? 20) }, signal);
  },

  listPermissions(paging: { page?: number; pageSize?: number } = {}, signal?: AbortSignal): Promise<Page<Permission>> {
    return send<Page<Permission>>(
      { method: 'GET', path: `${V1}/permissions`, query: query(paging.page ?? 1, paging.pageSize ?? 50) },
      signal,
    );
  },

  /* ---------- tenant configuration ---------- */

  listTenantConfiguration(signal?: AbortSignal): Promise<readonly TenantSetting[]> {
    return send<readonly TenantSetting[]>({ method: 'GET', path: `${V1}/tenant/configuration` }, signal);
  },

  /* ---------- audit ---------- */

  queryAudit(paging: { page?: number; pageSize?: number } = {}, signal?: AbortSignal): Promise<Page<AuditRecord>> {
    return send<Page<AuditRecord>>({ method: 'GET', path: `${V1}/audit`, query: query(paging.page ?? 1, paging.pageSize ?? 20) }, signal);
  },

  /* ---------- writes: every one of these is a real published operation ---------- */

  /**
   * Provisions a tenant.
   *
   * The path is written as the host publishes it, `/api/v1/tenants`, because the host maps the group's root
   * and the trailing slash is what the document records.
   */
  provisionTenant(body: ProvisionTenantBody, signal?: AbortSignal): Promise<ProvisionTenantResult> {
    return send<ProvisionTenantResult>({ method: 'POST', path: `${V1}/tenants`, body }, signal);
  },

  suspendTenant(reason: string | null, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'POST', path: `${V1}/tenants/lifecycle/suspend`, body: { reason } }, signal);
  },

  closeTenant(reason: string | null, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'POST', path: `${V1}/tenants/lifecycle/close`, body: { reason } }, signal);
  },

  activateTenant(signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'POST', path: `${V1}/tenants/lifecycle/activate` }, signal);
  },

  createUnit(level: UnitLevel, body: OrganizationalUnitBody, signal?: AbortSignal): Promise<OrganizationalUnit> {
    return send<OrganizationalUnit>({ method: 'POST', path: `${V1}/organization/units/${level}`, body }, signal);
  },

  renameUnit(level: UnitLevel, unitId: string, body: OrganizationalUnitBody, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'PUT', path: `${V1}/organization/units/${level}/${unitId}`, body }, signal);
  },

  activateUnit(level: UnitLevel, unitId: string, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'POST', path: `${V1}/tenants/lifecycle/${level}/${unitId}/activate` }, signal);
  },

  suspendUnit(level: UnitLevel, unitId: string, reason: string | null, signal?: AbortSignal): Promise<void> {
    return send<void>({
      method: 'POST',
      path: `${V1}/tenants/lifecycle/${level}/${unitId}/suspend`,
      body: { reason },
    }, signal);
  },

  defineRole(body: RoleBody, signal?: AbortSignal): Promise<Role> {
    return send<Role>({ method: 'POST', path: `${V1}/roles`, body }, signal);
  },

  renameRole(roleId: string, body: RoleBody, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'PUT', path: `${V1}/roles/${roleId}`, body }, signal);
  },

  grantRolePermission(roleId: string, permissionCode: string, signal?: AbortSignal): Promise<void> {
    return send<void>(
      { method: 'POST', path: `${V1}/roles/${roleId}/permissions`, body: { permissionCode } satisfies PermissionGrantBody },
      signal,
    );
  },

  revokeRolePermission(roleId: string, permissionCode: string, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'DELETE', path: `${V1}/roles/${roleId}/permissions/${encodeURIComponent(permissionCode)}` }, signal);
  },

  retireRole(roleId: string, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'POST', path: `${V1}/roles/${roleId}/retire` }, signal);
  },

  activateRole(roleId: string, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'POST', path: `${V1}/roles/${roleId}/activate` }, signal);
  },

  publishPermissionCatalog(signal?: AbortSignal): Promise<PublishCatalogResult> {
    return send<PublishCatalogResult>({ method: 'POST', path: `${V1}/permissions/publish` }, signal);
  },

  setTenantSetting(code: string, body: TenantSettingBody, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'PUT', path: `${V1}/tenant/configuration/settings/${encodeURIComponent(code)}`, body }, signal);
  },

  removeTenantSetting(code: string, signal?: AbortSignal): Promise<void> {
    return send<void>({ method: 'DELETE', path: `${V1}/tenant/configuration/settings/${encodeURIComponent(code)}` }, signal);
  },
};
