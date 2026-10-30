import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { StatusChip } from '../../components/StatusChip';
import { AllModules, PlatformSummaryPanel } from '../catalog/ModuleCards';
import { brand } from '../../lib/brand';
import { platformApi } from '../../lib/http/platform';
import { useIsSignedIn } from '../../lib/useSession';

type ProbeState = 'checking' | 'healthy' | 'unhealthy' | 'unreachable';

interface Probe {
  readonly label: string;
  readonly path: string;
  readonly state: ProbeState;
}

const PROBES: readonly {
  readonly label: string;
  readonly path: string;
  readonly probe: (signal: AbortSignal) => Promise<boolean>;
}[] = [
  {
    label: 'سرویس نسخه‌دار',
    path: '/api/v1/ping',
    probe: (signal) => platformApi.ping(signal).then((ping) => ping.status === 'ok'),
  },
  { label: 'زنده بودن فرایند', path: '/health/live', probe: (signal) => platformApi.liveness(signal) },
  { label: 'آمادگی و پایگاه داده', path: '/health/ready', probe: (signal) => platformApi.readiness(signal) },
];

const CHIP: Readonly<Record<ProbeState, { label: string; tone: 'positive' | 'critical' | 'neutral' }>> = {
  healthy: { label: 'پاسخ‌گو', tone: 'positive' },
  unhealthy: { label: 'پاسخ غیرسالم', tone: 'critical' },
  unreachable: { label: 'در دسترس نیست', tone: 'critical' },
  checking: { label: 'در حال بررسی', tone: 'neutral' },
};

/** Public landing page. Every status on it is read from the running host, never asserted by the client. */
export function HomePage() {
  const signedIn = useIsSignedIn();
  const [probes, setProbes] = useState<readonly Probe[]>(() =>
    PROBES.map((probe) => ({ label: probe.label, path: probe.path, state: 'checking' })),
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void Promise.all(
      PROBES.map(async (probe): Promise<Probe> => {
        try {
          const healthy = await probe.probe(controller.signal);
          return { label: probe.label, path: probe.path, state: healthy ? 'healthy' : 'unhealthy' };
        } catch (failure: unknown) {
          if (failure instanceof DOMException && failure.name === 'AbortError') {
            return { label: probe.label, path: probe.path, state: 'checking' };
          }
          return { label: probe.label, path: probe.path, state: 'unreachable' };
        }
      }),
    ).then((results) => {
      if (active) {
        setProbes(results);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const allHealthy = probes.every((probe) => probe.state === 'healthy');

  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="hero__eyebrow">
              <Brand compact />
            </span>
            <h1 className="hero__title">{brand.productName}</h1>
            <p className="hero__lead">
              {brand.tagline}. همه ماژول‌های کسب‌وکار روی یک هویت مرکزی سوارند: یک کاربر، یک پرونده، یک دامنه
              دسترسی مشخص در هر لحظه.
            </p>
            <div className="hero__actions">
              <Link to={signedIn ? '/management' : '/status'} className="button">
                {signedIn ? 'ورود به مرکز مدیریت' : 'وضعیت سرویس'}
              </Link>
              <Link to="/modules" className="button button--secondary">
                مشاهده ماژول‌ها
              </Link>
            </div>
            <div className="hero__meta">
              <span>معماری یکپارچه ماژولار</span>
              <span>PostgreSQL و SQLite</span>
              <span>مبتنی بر هویت مرکزی</span>
            </div>
          </div>

          <div className="hero__card">
            <div className="stack stack--tight">
              <div className="cluster">
                <h2 className="panel__heading">وضعیت سرویس</h2>
                <span className="spacer" />
                <StatusChip
                  label={allHealthy ? 'همه سرویس‌ها پاسخ‌گو' : 'بررسی نشده'}
                  tone={allHealthy ? 'positive' : 'caution'}
                  dot
                />
              </div>
              <p className="text-subtle">
                این وضعیت از خود سرویس خوانده می‌شود، نه از مقدار ثابتی در رابط کاربری.
              </p>
              <ul className="stack stack--tight">
                {probes.map((probe) => (
                  <li key={probe.label} className="cluster cluster--tight">
                    <StatusChip label={CHIP[probe.state].label} tone={CHIP[probe.state].tone} />
                    <span className="text-sm">{probe.label}</span>
                    <span className="spacer" />
                    <span className="code-chip">{probe.path}</span>
                  </li>
                ))}
              </ul>
              <Link to="/status" className="text-sm">
                صفحه وضعیت تفصیلی
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <header className="section__header">
            <h2>آنچه پلتفرم امروز واقعاً ارائه می‌دهد</h2>
            <p className="section__lead">
              این اعداد از سند قرارداد خود سرویس خوانده می‌شوند، نه از فهرست ثابتی در رابط کاربری؛ بنابراین
              هر مسیری که روی میزبان منتشر شده باشد اینجا شمرده می‌شود.
            </p>
          </header>
          <PlatformSummaryPanel />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <header className="section__header">
            <h2>ماژول‌های پلتفرم</h2>
            <p className="section__lead">
              وضعیت هر ماژول از روی همان قرارداد سنجیده می‌شود: مسیر منتشرشده یعنی متصل، بخشی از مسیرها
              یعنی ناقص، و هیچ مسیری یعنی بدون قرارداد سرویس. هیچ داده ساختگی نمایش داده نمی‌شود.
            </p>
          </header>
          <AllModules />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="panel">
            <div className="panel__body stack">
              <h2>اصلاحات پایه‌ای پلتفرم</h2>
              <div className="portal__grid">
                <article className="stack stack--tight">
                  <h3>هویت مرکزی واحد</h3>
                  <p className="text-muted text-sm">
                    مشتری، فروشنده، نماینده، کارمند و کاربر داخلی همگی به یک رکورد کاربر مرکزی اشاره می‌کنند.
                    هیچ ماژولی جدول کاربری موازی نمی‌سازد.
                  </p>
                </article>
                <article className="stack stack--tight">
                  <h3>سند ناشناس تا تأیید</h3>
                  <p className="text-muted text-sm">
                    خروجی متن‌خوانی همیشه «در انتظار راستی‌آزمایی» است و تنها پس از نرمال‌سازی، اعتبارسنجی،
                    تطبیق و تأیید کاربر به داده اصلی تبدیل می‌شود.
                  </p>
                </article>
                <article className="stack stack--tight">
                  <h3>جداسازی مستأجر</h3>
                  <p className="text-muted text-sm">
                    دامنه هر درخواست از توکن معتبر کاربر استخراج می‌شود، نه از بدنه درخواست؛ بنابراین یک خطای
                    کلاینت نمی‌تواند به داده مستأجر دیگر دسترسی پیدا کند.
                  </p>
                </article>
                <article className="stack stack--tight">
                  <h3>اسناد خصوصی، دسترسی ممیزی‌شده</h3>
                  <p className="text-muted text-sm">
                    فایل اسناد هرگز در مسیر عمومی وب قرار نمی‌گیرد؛ هر دسترسی از مسیر مجاز، ثبت‌شده و دارای
                    تاریخ انقضا انجام می‌شود.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
