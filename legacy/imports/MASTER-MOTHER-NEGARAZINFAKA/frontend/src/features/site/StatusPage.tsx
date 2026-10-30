import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { RequestBoundary } from '../../components/RequestBoundary';
import { State } from '../../components/State';
import { StatusChip } from '../../components/StatusChip';
import { useContract } from '../../lib/useContract';
import { usePlatformCall } from '../../lib/usePlatformCall';
import { platformApi } from '../../lib/http/platform';
import { TOKEN_ENDPOINT, toPersianDigits } from '../catalog/modules';

interface Probe {
  readonly label: string;
  readonly path: string;
  readonly probe: (signal: AbortSignal) => Promise<string>;
}

/**
 * The anonymous probes, each rendering exactly what the host answered.
 *
 * The response body is shown rather than a paraphrase, so an operator can tell a `200 Healthy` from a `200`
 * that returned something else.
 */
const PROBES: readonly Probe[] = [
  {
    label: 'سرویس نسخه‌دار',
    path: 'GET /api/v1/ping',
    probe: async (signal) => JSON.stringify(await platformApi.ping(signal)),
  },
  {
    label: 'زنده بودن فرایند',
    path: 'GET /health/live',
    probe: async (signal) => JSON.stringify(await platformApi.liveness(signal)),
  },
  {
    label: 'آمادگی و پایگاه داده',
    path: 'GET /health/ready',
    probe: async (signal) => JSON.stringify(await platformApi.readiness(signal)),
  },
  {
    label: 'هویت جاری بدون توکن',
    path: 'GET /api/v1/me',
    probe: (signal) => platformApi.me(signal).then(() => 'پاسخ داده شد'),
  },
];

/**
 * Live platform status.
 *
 * Every line is the result of a call made when the page loaded; nothing is asserted from configuration. The
 * contract listing at the bottom is the same document the module statuses are derived from, so this page and
 * the homepage can never disagree about what the host serves.
 */
export function StatusPage() {
  return (
    <div className="container portal">
      <PageHeader
        title="وضعیت سرویس"
        lead="بررسی زنده نقاط دسترسی پلتفرم. هر مقدار از پاسخ واقعی سرور خوانده می‌شود و هیچ‌کدام پیش‌فرض رابط کاربری نیست."
      />

      <div className="portal__grid">
        {PROBES.map((entry) => (
          <ProbePanel key={entry.path} entry={entry} />
        ))}
      </div>

      <PublishedOperations />
    </div>
  );
}

function ProbePanel({ entry }: { readonly entry: Probe }) {
  const call = usePlatformCall((signal) => entry.probe(signal), [entry.path]);

  return (
    <Panel
      title={entry.label}
      actions={
        <StatusChip
          label={
            call.state.status === 'loading'
              ? 'در حال بررسی'
              : call.state.status === 'ready'
                ? 'پاسخ داد'
                : 'پاسخ نداد'
          }
          tone={
            call.state.status === 'loading' ? 'neutral' : call.state.status === 'ready' ? 'positive' : 'critical'
          }
          dot
        />
      }
    >
      <p className="code-chip" style={{ marginBlockEnd: '0.5rem' }}>
        {entry.path}
      </p>
      <RequestBoundary
        call={call}
        rows={2}
        render={(value) => (
          <pre className="text-ltr text-sm" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {value}
          </pre>
        )}
      />
    </Panel>
  );
}

/** The full published route list, read from the same contract the module statuses come from. */
function PublishedOperations() {
  const contract = useContract();

  return (
    <Panel
      title="مسیرهای منتشرشده روی میزبان"
      hint="خوانده‌شده از سند OpenAPI خود سرویس. وضعیت ماژول‌ها در صفحه اصلی دقیقاً از همین فهرست محاسبه می‌شود."
      actions={<StatusChip label="GET /openapi/v1.json" tone="info" />}
    >
      <RequestBoundary
        call={contract}
        rows={6}
        render={(document) => {
          const hasTokenRoute = document.operations.some(
            (operation) => operation.method === TOKEN_ENDPOINT.method && operation.path === TOKEN_ENDPOINT.path,
          );

          return (
            <div className="stack stack--tight">
              <p className="text-muted text-sm">
                سند «{document.title}» نسخه {document.version}، شامل {toPersianDigits(document.operations.length)}{' '}
                عملیات منتشرشده.
              </p>

              {!hasTokenRoute && (
                <State
                  tone="gap"
                  title="میزبان مسیر صدور توکن را منتشر نمی‌کند"
                  body={`بنابراین مسیرهای پشت احراز هویت تا پیش از افزودن ${TOKEN_ENDPOINT.method} ${TOKEN_ENDPOINT.path} پاسخ ۴۰۱ می‌دهند و نشستی از سمت کاربر ساخته نمی‌شود.`}
                />
              )}

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>متد</th>
                      <th>مسیر</th>
                      <th>برچسب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {document.operations.map((operation) => (
                      <tr key={`${operation.method} ${operation.path}`}>
                        <td>
                          <span className="code-chip">{operation.method}</span>
                        </td>
                        <td>
                          <span className="code-chip">{operation.path}</span>
                        </td>
                        <td className="text-muted">{operation.tags.join('، ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }}
        emptyTitle="میزبان هیچ مسیری منتشر نکرده است"
        emptyBody="سند قرارداد خوانده شد اما فهرست عملیات آن خالی است."
      />
    </Panel>
  );
}
