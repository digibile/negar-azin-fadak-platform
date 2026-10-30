import { useState, type ReactNode } from 'react';
import { Pager } from '../../components/Pager';
import { Panel } from '../../components/Panel';
import { RequestBoundary } from '../../components/RequestBoundary';
import { StatusChip } from '../../components/StatusChip';
import {
  AUDIT_OUTCOME_LABELS,
  ROLE_STATUS_LABELS,
  UNIT_STATUS_LABELS,
  categoryLabel,
  formatDateTime,
  formatNumber,
  shortGuid,
  statusLabel,
} from '../../lib/format';
import {
  UNIT_LEVEL_LABELS,
  platformApi,
  type CurrentPrincipal,
  type OrganizationalUnit,
  type UnitLevel,
} from '../../lib/http/platform';
import { usePlatformCall } from '../../lib/usePlatformCall';
import { useIsSignedIn } from '../../lib/useSession';

/**
 * The screens that read real platform data.
 *
 * Every one of them goes through `RequestBoundary`, so the loading, empty, unauthorized, forbidden, offline
 * and error states are handled by construction rather than per screen. None of them invents a row, and none
 * of them treats a permission problem as a crash.
 */

/* ---------- anonymous: works without a session ---------- */

interface Probe {
  readonly label: string;
  readonly path: string;
  readonly probe: (signal: AbortSignal) => Promise<boolean>;
}

const PROBES: readonly Probe[] = [
  { label: 'سرویس نسخه‌دار', path: '/api/v1/ping', probe: (signal) => platformApi.ping(signal).then((p) => p.status === 'ok') },
  { label: 'زنده بودن فرایند', path: '/health/live', probe: (signal) => platformApi.liveness(signal) },
  { label: 'آمادگی و پایگاه داده', path: '/health/ready', probe: (signal) => platformApi.readiness(signal) },
];

/**
 * Live service health.
 *
 * These three routes are the only part of the platform a browser can read without a token, which is why they
 * are the one thing an anonymous visitor is shown as working.
 */
export function ServiceStatusPanel() {
  return (
    <Panel title="سلامت سرویس" hint="خوانده‌شده از خود میزبان؛ این مسیرها به توکن نیاز ندارند.">
      <ul className="stack stack--tight">
        {PROBES.map((entry) => (
          <li key={entry.path} className="cluster cluster--tight">
            <ProbeStatus probe={entry.probe} />
            <span className="text-sm">{entry.label}</span>
            <span className="spacer" />
            <span className="code-chip">{entry.path}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ProbeStatus({ probe }: { readonly probe: Probe['probe'] }) {
  const call = usePlatformCall((signal) => probe(signal), [probe]);

  if (call.state.status === 'loading') {
    return <StatusChip label="در حال بررسی" tone="neutral" dot />;
  }

  if (call.state.status === 'failed') {
    return <StatusChip label="در دسترس نیست" tone="critical" dot />;
  }

  return <StatusChip label={call.state.value ? 'پاسخ‌گو' : 'پاسخ غیرسالم'} tone={call.state.value ? 'positive' : 'critical'} dot />;
}

/* ---------- the caller's own identity ---------- */

export function IdentityPanel() {
  const signedIn = useIsSignedIn();
  const call = usePlatformCall((signal) => platformApi.me(signal), [signedIn]);

  return (
    <Panel title="هویت کاربر جاری" hint="همان چیزی که سرور از روی توکن معتبر استخراج کرده است، نه چیزی که مرورگر حدس می‌زند.">
      <RequestBoundary
        call={call}
        rows={5}
        action={
          <button
            type="button"
            className="button button--secondary"
            onClick={call.reload}
            disabled={call.state.status !== 'failed'}
          >
            تلاش دوباره
          </button>
        }
        render={(principal) => <PrincipalBody principal={principal} />}
      />
    </Panel>
  );
}

function PrincipalBody({ principal }: { readonly principal: CurrentPrincipal }) {
  return (
    <dl className="definition-list">
      <dt>شناسه کاربر</dt>
      <dd>
        <span className="code-chip">{shortGuid(principal.userId)}</span>
      </dd>
      <dt>سازمان</dt>
      <dd>
        <span className="code-chip">{shortGuid(principal.scope.organizationId)}</span>
      </dd>
      <dt>شرکت</dt>
      <dd>{<ScopeValue value={principal.scope.companyId} />}</dd>
      <dt>برند</dt>
      <dd>{<ScopeValue value={principal.scope.brandId} />}</dd>
      <dt>شعبه</dt>
      <dd>{<ScopeValue value={principal.scope.branchId} />}</dd>
      <dt>فروشگاه</dt>
      <dd>{<ScopeValue value={principal.scope.storeId} />}</dd>
      <dt>نقش‌ها</dt>
      <dd>
        <ChipList values={principal.roles} tone="brand" emptyText="بدون نقش" />
      </dd>
      <dt>مجوزهای توکن</dt>
      <dd>
        <ChipList values={principal.permissions} tone="info" emptyText="بدون مجوز" />
      </dd>
    </dl>
  );
}

function ScopeValue({ value }: { readonly value: string | null }) {
  return value === null ? <span className="text-subtle">—</span> : <span className="code-chip">{shortGuid(value)}</span>;
}

function ChipList({
  values,
  tone,
  emptyText,
}: {
  readonly values: readonly string[];
  readonly tone: 'brand' | 'info';
  readonly emptyText: string;
}) {
  if (values.length === 0) {
    return <span className="text-subtle">{emptyText}</span>;
  }

  return (
    <div className="cluster cluster--tight">
      {values.map((value) => (
        <StatusChip key={value} label={value} tone={tone} />
      ))}
    </div>
  );
}

/**
 * The permission list, fetched through the endpoint that requires `platform.access.administer`.
 *
 * This panel exists to make the platform's fail-closed behaviour observable: a caller without the
 * administration permission is refused with 403, and that refusal is shown as the correct answer rather than
 * hidden or worked around. The permissions themselves are never hardcoded here — they come from the server.
 */
export function CurrentPermissionsPanel() {
  const signedIn = useIsSignedIn();
  const call = usePlatformCall((signal) => platformApi.myPermissions(signal), [signedIn]);

  return (
    <Panel
      title="مجوزهای کاربر جاری (سرویس مستقل)"
      hint="این مسیر مجوز «platform.access.administer» را لازم دارد؛ پاسخ ۴۰۳ در اینجا نتیجه درست سرویس است، نه خطا."
      actions={<StatusChip label="GET /api/v1/me/permissions" tone="info" />}
    >
      <RequestBoundary
        call={call}
        rows={2}
        render={(permissions) => (
          permissions.length === 0 ? null : (
            <div className="cluster cluster--tight">
              {permissions.map((permission) => (
                <StatusChip key={permission} label={permission} tone="info" />
              ))}
            </div>
          )
        )}
        emptyTitle="مجوزی برای این نقش ثبت نشده است"
        emptyBody="سرویس فهرست خالی برگرداند؛ این با «سرویس در دسترس نیست» فرق دارد."
      />
    </Panel>
  );
}

/* ---------- organizational hierarchy ---------- */

/** The organizational units of one level, read from the platform's own level-addressed routes. */
export function UnitsPanel({ level }: { readonly level: UnitLevel }) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const signedIn = useIsSignedIn();
  const call = usePlatformCall(
    (signal) => platformApi.listUnits(level, { page, pageSize }, signal),
    [level, page, signedIn],
  );

  const permission = 'organization.unit.read';

  return (
    <Panel
      title={`${UNIT_LEVEL_LABELS[level]}ها`}
      hint={`خوانده‌شده از GET /api/v1/organization/units/${level} با دامنه مستأجر خود سرور. مجوز لازم: ${permission}`}
      flush
      actions={
        <button
          type="button"
          className="button button--secondary"
          onClick={call.reload}
          disabled={call.state.status !== 'failed'}
        >
          تلاش دوباره
        </button>
      }
    >
      <RequestBoundary
        call={call}
        rows={4}
        emptyTitle={`${UNIT_LEVEL_LABELS[level]}ی ثبت نشده است`}
        emptyBody="سرویس پاسخ داد و در دامنه شما رکوردی در این سطح وجود ندارد."
        render={(page_) =>
          page_.items.length === 0 ? null : <UnitTable page={page_} onPage={setPage} busy={call.state.status === 'loading'} />
        }
      />
    </Panel>
  );
}

function UnitTable({
  page,
  onPage,
  busy,
}: {
  readonly page: { items: readonly OrganizationalUnit[]; pageNumber: number; pageSize: number; totalCount: number };
  readonly onPage: (page: number) => void;
  readonly busy: boolean;
}) {
  return (
    <div className="stack stack--tight">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>کد</th>
              <th>نام</th>
              <th>نام حقوقی</th>
              <th>وضعیت</th>
              <th>فعال</th>
              <th>خرده‌فروشی</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((unit) => (
              <tr key={unit.id}>
                <td>
                  <span className="code-chip">{unit.code}</span>
                </td>
                <td>{unit.name}</td>
                <td className="text-muted">{unit.legalName}</td>
                <td>
                  <StatusChip
                    label={statusLabel(unit.status, UNIT_STATUS_LABELS)}
                    tone={unit.isActive ? 'positive' : 'caution'}
                    dot
                  />
                </td>
                <td>{unit.isActive ? 'بله' : 'خیر'}</td>
                <td>{unit.isRetail === null ? <span className="text-subtle">—</span> : unit.isRetail ? 'بله' : 'خیر'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page.pageNumber} pageSize={page.pageSize} totalCount={page.totalCount} onPage={onPage} busy={busy} />
    </div>
  );
}

/* ---------- authorization ---------- */

export function RolesPanel() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const signedIn = useIsSignedIn();
  const call = usePlatformCall((signal) => platformApi.listRoles({ page, pageSize }, signal), [page, signedIn]);

  return (
    <Panel
      title="نقش‌های سازمان"
      hint="خوانده‌شده از GET /api/v1/roles. مجوزهای هر نقش، همان کدهایی است که کاتالوگ مجوز پلتفرم تعریف کرده است."
      flush
    >
      <RequestBoundary
        call={call}
        rows={4}
        emptyTitle="نقشی ثبت نشده است"
        emptyBody="سرویس فهرست خالی برگرداند؛ برای دیدن نقش‌ها به مجوز authorization.role.read نیاز است."
        render={(result) =>
          result.items.length === 0 ? null : (
            <div className="stack stack--tight">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>کد</th>
                      <th>نام</th>
                      <th>توضیح</th>
                      <th>وضعیت</th>
                      <th>پیش‌فرض</th>
                      <th>مجوزهای مؤثر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <span className="code-chip">{role.code}</span>
                        </td>
                        <td>{role.name}</td>
                        <td className="text-muted">{role.description ?? <span className="text-subtle">—</span>}</td>
                        <td>
                          <StatusChip
                            label={statusLabel(role.status, ROLE_STATUS_LABELS)}
                            tone={role.isActive ? 'positive' : 'caution'}
                            dot
                          />
                        </td>
                        <td>{role.isBuiltIn ? 'بله' : 'خیر'}</td>
                        <td>
                          <div className="cluster cluster--tight">
                            {role.permissions.length === 0 ? (
                              <span className="text-subtle">بدون مجوز</span>
                            ) : (
                              <>
                                {role.permissions.slice(0, 2).map((permission) => (
                                  <StatusChip key={permission} label={permission} tone="info" />
                                ))}
                                {role.permissions.length > 2 && (
                                  <span className="text-subtle">
                                    +{formatNumber(role.permissions.length - 2)} مجوز دیگر
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                page={result.pageNumber}
                pageSize={result.pageSize}
                totalCount={result.totalCount}
                onPage={setPage}
                busy={call.state.status === 'loading'}
              />
            </div>
          )
        }
      />
    </Panel>
  );
}

export function PermissionCatalogPanel() {
  const signedIn = useIsSignedIn();
  const call = usePlatformCall((signal) => platformApi.listPermissions({ page: 1, pageSize: 100 }, signal), [signedIn]);

  return (
    <Panel
      title="کاتالوگ مجوزهای پلتفرم"
      hint="خوانده‌شده از GET /api/v1/permissions. این فهرست، مرجع مجوزدهی کل پلتفرم است و هیچ کد مجوزی در رابط کاربری ثابت نشده است."
      flush
    >
      <RequestBoundary
        call={call}
        rows={5}
        emptyTitle="کاتالوگ مجوز خالی است"
        emptyBody="سرویس فهرست خالی برگرداند."
        render={(result) =>
          result.items.length === 0 ? null : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>کد</th>
                    <th>دسته</th>
                    <th>عنوان</th>
                    <th>توضیح</th>
                    <th>فعال</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((permission) => (
                    <tr key={permission.code}>
                      <td>
                        <span className="code-chip">{permission.code}</span>
                      </td>
                      <td>{categoryLabel(permission.category)}</td>
                      <td>{permission.title}</td>
                      <td className="text-muted">
                        {permission.description ?? <span className="text-subtle">—</span>}
                      </td>
                      <td>
                        <StatusChip
                          label={permission.isActive ? 'فعال' : 'بازنشسته'}
                          tone={permission.isActive ? 'positive' : 'neutral'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      />
    </Panel>
  );
}

/* ---------- tenant configuration ---------- */

export function TenantConfigurationPanel() {
  const signedIn = useIsSignedIn();
  const call = usePlatformCall((signal) => platformApi.listTenantConfiguration(signal), [signedIn]);

  return (
    <Panel
      title="پیکربندی مستأجر"
      hint="خوانده‌شده از GET /api/v1/tenant/configuration. مقادیر حساس به‌صورت پوشانده ارسال می‌شوند و این صفحه هرگز مقدار اصلی را درخواست نمی‌کند."
      flush
    >
      <RequestBoundary
        call={call}
        rows={4}
        emptyTitle="تنظیمی ثبت نشده است"
        emptyBody="سرویس فهرست خالی برگرداند."
        render={(settings) =>
          settings.length === 0 ? null : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>کد</th>
                    <th>نوع</th>
                    <th>مقدار</th>
                    <th>حساس</th>
                    <th>بازه</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.code}>
                      <td>
                        <span className="code-chip">{setting.code}</span>
                      </td>
                      <td>{setting.kind}</td>
                      <td>
                        <span className="code-chip">{setting.value}</span>
                      </td>
                      <td>
                        {setting.isSensitive ? <StatusChip label="پوشانده" tone="caution" /> : <span className="text-subtle">خیر</span>}
                      </td>
                      <td className="table__numeric">
                        {formatNumber(Number(setting.rangeMinimum))} – {formatNumber(Number(setting.rangeMaximum))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      />
    </Panel>
  );
}

/* ---------- audit ---------- */

export function AuditPanel() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const signedIn = useIsSignedIn();
  const call = usePlatformCall((signal) => platformApi.queryAudit({ page, pageSize }, signal), [page, signedIn]);

  return (
    <Panel
      title="رد ممیزی"
      hint="خوانده‌شده از GET /api/v1/audit با دامنه مستأجر خود سرور. شناسه همبستگی، همین رکورد را به لاگ درخواست‌های پلتفرم وصل می‌کند."
      flush
    >
      <RequestBoundary
        call={call}
        rows={5}
        emptyTitle="رخدادی ثبت نشده است"
        emptyBody="سرویس پاسخ داد و برای دامنه شما رخدادی در رد ممیزی وجود ندارد."
        render={(result) =>
          result.items.length === 0 ? null : (
            <div className="stack stack--tight">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>اقدام</th>
                      <th>منبع</th>
                      <th>شناسه منبع</th>
                      <th>نتیجه</th>
                      <th>عامل</th>
                      <th>زمان</th>
                      <th>همبستگی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <span className="code-chip">{record.action}</span>
                        </td>
                        <td>{record.resourceType}</td>
                        <td>
                          <span className="table__id">{shortGuid(record.resourceId)}</span>
                        </td>
                        <td>
                          <StatusChip
                            label={AUDIT_OUTCOME_LABELS[record.outcome] ?? record.outcome}
                            tone={record.outcome === 'Success' ? 'positive' : record.outcome === 'Denied' ? 'caution' : 'critical'}
                            dot
                          />
                        </td>
                        <td>
                          {record.actorUserId === null ? (
                            <span className="text-subtle">سامانه</span>
                          ) : (
                            <span className="code-chip">{shortGuid(record.actorUserId)}</span>
                          )}
                        </td>
                        <td className="table__numeric">{formatDateTime(record.occurredAt)}</td>
                        <td>
                          <span className="code-chip">{record.correlationId}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                page={result.pageNumber}
                pageSize={result.pageSize}
                totalCount={result.totalCount}
                onPage={setPage}
                busy={call.state.status === 'loading'}
              />
            </div>
          )
        }
      />
    </Panel>
  );
}

/* ---------- gaps ---------- */

interface GapProps {
  readonly title: string;
  readonly purpose: string;
  readonly needed: readonly { readonly method: string; readonly path: string; readonly permission?: string }[];
  readonly present: readonly string[];
  readonly children?: ReactNode;
}

/**
 * A screen for a domain the platform has not modelled.
 *
 * The point of this component is that it shows the exact contract a developer would have to add, instead of a
 * table of invented rows. Nothing here is a placeholder that looks like data.
 */
export function DomainGap({ title, purpose, needed, present, children }: GapProps) {
  return (
    <div className="stack">
      <div className="state state--gap" role="status">
        <div className="cluster cluster--tight">
          <p className="state__title">{title}</p>
          <StatusChip label="بدون قرارداد سرویس" tone="neutral" dot />
        </div>
        <p className="state__body">{purpose}</p>
        <p className="state__body">
          این دامنه در مدل داده پلتفرم وجود ندارد. به‌جای نمایش داده ساختگی، مسیرهایی را فهرست می‌کنیم که باید
          روی میزبان منتشر شوند تا این صفحه داده واقعی نشان دهد.
        </p>
      </div>

      {children}

      <div className="portal__grid">
        <Panel title="قرارداد مورد نیاز" hint="پس از افزودن این مسیرها، صفحه بدون تغییر در رابط کاربری داده واقعی نمایش می‌دهد.">
          <ul className="stack stack--tight">
            {needed.map((item) => (
              <li key={`${item.method} ${item.path}`} className="cluster cluster--tight">
                <span className="code-chip">
                  {item.method} {item.path}
                </span>
                <span className="spacer" />
                {item.permission !== undefined && <span className="code-chip">{item.permission}</span>}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="آنچه امروز موجود است" hint="سرویس‌هایی که هم‌اکنون در همین حوزه روی پلتفرم فعال‌اند.">
          {present.length === 0 ? (
            <p className="text-muted text-sm">در این حوزه هنوز سرویسی روی پلتفرم فعال نشده است.</p>
          ) : (
            <ul className="stack stack--tight">
              {present.map((item) => (
                <li key={item} className="cluster cluster--tight">
                  <StatusChip label="موجود" tone="positive" dot />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
