import { StatusChip } from './StatusChip';

export interface FeatureGapExpectation {
  /** The route the backend would have to expose for this screen to have real data. */
  readonly endpoint: string;
  /** The permission a caller's role would need, once the endpoint exists. */
  readonly permission?: string;
}

interface FeatureGapProps {
  /** The name of the module, as the navigation presents it. */
  readonly module: string;
  /** What the module is for, in the operator's words. */
  readonly purpose: string;
  /** The endpoints the module will read, and the permissions those reads need. */
  readonly expectations: readonly FeatureGapExpectation[];
  /** What the platform exposes in this area today, so the operator can see the boundary. */
  readonly available: readonly string[];
}

/**
 * The state of a navigation destination the platform has not built yet.
 *
 * This component is the reason the client ships without fixture data. A module whose endpoints do not exist
 * is shown as a named gap with the exact routes it will need, not as a plausible-looking table of invented
 * rows. Invented rows are worse than an empty screen: they are indistinguishable from real records once they
 * leave the browser, and they make a real data defect look like a working feature.
 */
export function FeatureGap({ module, purpose, expectations, available }: FeatureGapProps) {
  return (
    <div className="stack">
      <div className="state state--gap" role="status">
        <div className="cluster cluster--tight">
          <p className="state__title">{module}</p>
          <StatusChip label="در انتظار پیاده‌سازی" tone="caution" dot />
        </div>
        <p className="state__body">{purpose}</p>
        <p className="state__body">
          این ماژول هنوز روی سرویس‌های پلتفرم پیاده‌سازی نشده است. به‌جای نمایش داده ساختگی، صفحه وضعیت
          واقعی را نشان می‌دهد و مسیرهایی را که برای داده واقعی لازم است فهرست می‌کند.
        </p>
      </div>

      <div className="portal__grid">
        <section className="panel">
          <header className="panel__header">
            <div className="panel__title">
              <h2 className="panel__heading">مسیرهای مورد نیاز روی سرویس</h2>
              <p className="panel__hint">این ماژول پس از افزوده شدن این مسیرها به API، بدون تغییر در رابط کاربری داده واقعی نمایش می‌دهد.</p>
            </div>
          </header>
          <div className="panel__body">
            <ul className="stack stack--tight">
              {expectations.map((expectation) => (
                <li key={expectation.endpoint} className="cluster cluster--tight">
                  <span className="code-chip">{expectation.endpoint}</span>
                  {expectation.permission !== undefined && (
                    <span className="code-chip">{expectation.permission}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <header className="panel__header">
            <div className="panel__title">
              <h2 className="panel__heading">آنچه هم‌اکنون موجود است</h2>
              <p className="panel__hint">سرویس‌هایی که امروز در همین حوزه روی پلتفرم فعال‌اند.</p>
            </div>
          </header>
          <div className="panel__body">
            {available.length === 0 ? (
              <p className="text-muted text-sm">در این حوزه هنوز سرویسی روی پلتفرم فعال نشده است.</p>
            ) : (
              <ul className="stack stack--tight">
                {available.map((item) => (
                  <li key={item} className="cluster cluster--tight">
                    <StatusChip label="فعال" tone="positive" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
