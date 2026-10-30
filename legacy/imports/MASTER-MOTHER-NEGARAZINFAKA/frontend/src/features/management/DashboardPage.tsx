import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { RequestBoundary } from '../../components/RequestBoundary';
import { StatusChip } from '../../components/StatusChip';
import { summarize, toPersianDigits } from '../catalog/modules';
import { useContract } from '../../lib/useContract';
import { useIsSignedIn } from '../../lib/useSession';
import {
  AuditPanel,
  CurrentPermissionsPanel,
  IdentityPanel,
  PermissionCatalogPanel,
  RolesPanel,
  ServiceStatusPanel,
  TenantConfigurationPanel,
  UnitsPanel,
} from './panels';

const LEVELS = ['company', 'brand', 'branch', 'store'] as const;

/**
 * The management home.
 *
 * It leads with what genuinely works without a session — health and the published contract — and then reports
 * everything behind bearer authentication through the six-state boundary, so an anonymous visitor sees an
 * accurate "session required" rather than a screen of failures.
 */
export function DashboardPage() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('company');
  const signedIn = useIsSignedIn();

  return (
    <div className="stack stack--loose">
      <PageHeader
        title="داشبورد مرکز مدیریت"
        lead="نمای کلی سالم بودن سرویس، قرارداد منتشرشده، هویت کاربر جاری و ساختار سازمانی. هر عدد و هر وضعیت این صفحه از خود سرویس خوانده می‌شود."
      />

      <div className="portal__grid">
        <ServiceStatusPanel />
        <ContractSummary />
      </div>

      <div className="portal__grid">
        <IdentityPanel />
        <CurrentPermissionsPanel />
      </div>

      <Panel
        title="ساختار سازمانی"
        hint="هر سطح از مسیر مستقل خودش روی میزبان منتشر شده است؛ سطح را انتخاب کنید تا همان مسیر خوانده شود."
        actions={
          <div className="cluster cluster--tight">
            {LEVELS.map((entry) => (
              <button
                key={entry}
                type="button"
                className="segmented__item"
                aria-pressed={level === entry}
                onClick={() => {
                  setLevel(entry);
                }}
              >
                {{ company: 'شرکت', brand: 'برند', branch: 'شعبه', store: 'فروشگاه' }[entry]}
              </button>
            ))}
          </div>
        }
      >
        <UnitsPanel level={level} />
      </Panel>

      <div className="portal__grid">
        <RolesPanel />
        <PermissionCatalogPanel />
      </div>

      <div className="portal__grid">
        <TenantConfigurationPanel />
        <AuditPanel />
      </div>

      {!signedIn && (
        <p className="text-subtle text-sm">
          این نشست توکنی ندارد، بنابراین بخش‌های نیازمند احراز هویت وضعیت «نیازمند ورود» نشان می‌دهند. سرویس
          هنوز مسیری برای صدور توکن منتشر نمی‌کند.
        </p>
      )}
    </div>
  );
}

/** The published contract, with the fact that decides how every other figure reads. */
function ContractSummary() {
  const contract = useContract();

  return (
    <Panel
      title="قرارداد منتشرشده"
      hint="خوانده‌شده از سند OpenAPI خود میزبان. وضعیت هر ماژول از همین سند محاسبه می‌شود."
      actions={<StatusChip label="GET /openapi/v1.json" tone="info" />}
    >
      <RequestBoundary
        call={contract}
        rows={4}
        render={(document) => {
          const summary = summarize(document);

          return (
            <div className="stack stack--tight">
              <dl className="definition-list">
                <dt>عنوان سند</dt>
                <dd>{summary.title}</dd>
                <dt>نسخه</dt>
                <dd>
                  <span className="code-chip">{summary.version}</span>
                </dd>
                <dt>تعداد عملیات منتشرشده</dt>
                <dd>{toPersianDigits(summary.publishedOperations)}</dd>
                <dt>ماژول متصل / ناقص / بدون قرارداد</dt>
                <dd>
                  <div className="cluster cluster--tight">
                    <StatusChip label={`${toPersianDigits(summary.connected)} متصل`} tone="positive" />
                    <StatusChip label={`${toPersianDigits(summary.partial)} ناقص`} tone="caution" />
                    <StatusChip label={`${toPersianDigits(summary.gap)} بدون قرارداد`} tone="neutral" />
                  </div>
                </dd>
                <dt>صدور توکن</dt>
                <dd>
                  <StatusChip
                    label={summary.issuesTokens ? 'میزبان مسیر صدور توکن را منتشر می‌کند' : 'میزبان مسیر صدور توکن منتشر نمی‌کند'}
                    tone={summary.issuesTokens ? 'positive' : 'caution'}
                    dot
                  />
                </dd>
              </dl>
              {!summary.issuesTokens && (
                <p className="text-muted text-sm">
                  مسیرهای منتشرشده پشت احراز هویت قرار دارند، اما پلتفرم نمی‌تواند نشستی بسازد. بنابراین آن‌ها تا
                  پیش از انتشار <span className="code-chip">POST /api/v1/auth/token</span> پاسخ ۴۰۱ می‌دهند.
                </p>
              )}
            </div>
          );
        }}
      />
    </Panel>
  );
}
