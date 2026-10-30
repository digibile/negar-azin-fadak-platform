import { Link } from 'react-router-dom';
import { Panel } from '../../components/Panel';
import { RequestBoundary } from '../../components/RequestBoundary';
import { StatusChip } from '../../components/StatusChip';
import { useContract } from '../../lib/useContract';
import { availabilityChip, resolveModule, resolveModules, summarize, toPersianDigits, type ModuleCard } from './modules';

interface ModuleCardViewProps {
  readonly card: ModuleCard;
}

/**
 * One module, described by what the running host really serves.
 *
 * The card prints the live route count beside the status, because the status alone is the claim that used to
 * be wrong: a module serving two of its nine routes was still labelled as waiting for a service.
 */
function ModuleCardView({ card }: ModuleCardViewProps) {
  return (
    <Link to={card.to} className="module-card">
      <div className="module-card__head">
        <span className="module-card__icon" aria-hidden="true">
          {card.monogram}
        </span>
        <div className="cluster cluster--tight">
          {availabilityChip(card.availability)}
          {card.requiresToken && <StatusChip label="نیازمند توکن" tone="info" />}
        </div>
      </div>
      <div className="module-card__body">
        <h3 className="module-card__title">{card.title}</h3>
        <p className="text-sm text-muted">{card.description}</p>
      </div>
      <div className="module-card__foot">
        <span className="text-sm text-subtle">
          {card.requiredCount === 0
            ? 'هیچ مسیر خواندنی برای این ماژول روی سرویس تعریف نشده است'
            : `${toPersianDigits(card.publishedCount)} از ${toPersianDigits(card.requiredCount)} مسیر خواندنی موجود است`}
        </span>
        <span className="text-sm text-subtle">
          {card.missing.length === 0 ? 'بدون کمبود' : `${toPersianDigits(card.missing.length)} مورد نیازمند سرویس`}
        </span>
      </div>
    </Link>
  );
}

interface AllModulesProps {
  /** Renders the whole list, or only the modules the host publishes at least one route for. */
  readonly filter?: 'all' | 'connected';
}

/** Every module, with its status resolved from the running host's contract rather than from a hardcoded flag. */
export function AllModules({ filter = 'all' }: AllModulesProps) {
  const contract = useContract();

  return (
    <RequestBoundary
      call={contract}
      rows={6}
      render={(document) => {
        const modules = resolveModules(document);
        const shown = filter === 'connected' ? modules.filter((card) => card.availability !== 'gap') : modules;

        return shown.length === 0 ? null : (
          <div className="module-grid">
            {shown.map((card) => (
              <ModuleCardView card={card} key={card.to} />
            ))}
          </div>
        );
      }}
      emptyTitle="سرویسی روی پلتفرم منتشر نشده است"
      emptyBody="سند قرارداد پلتفرم خوانده شد اما هیچ مسیری در آن نیست."
    />
  );
}

/**
 * The contract of one module, resolved from the running host.
 *
 * Used by every module screen so each one states, in the same place, which routes back it and which it is
 * still waiting on — instead of each page inventing its own idea of what exists.
 */
export function ModuleContractPanel({ to }: { readonly to: string }) {
  const contract = useContract();

  return (
    <RequestBoundary
      call={contract}
      rows={3}
      render={(document) => {
        const card = resolveModule(document, to);
        return card === null ? null : <ModuleContract card={card} />;
      }}
      emptyTitle="این ماژول در فهرست پلتفرم تعریف نشده است"
      emptyBody="سند قرارداد خوانده شد اما مسیری برای این ماژول وجود ندارد."
    />
  );
}

/** The routes backing a module, and the contracts it still needs. */
export function ModuleContract({ card }: { readonly card: ModuleCard }) {
  return (
    <div className="portal__grid">
      <Panel
        title="مسیرهای موجود روی سرویس"
        hint="این مسیرها را میزبان در حال حاضر منتشر می‌کند و همین‌ها منبع داده این صفحه هستند."
        actions={<StatusChip label={`${toPersianDigits(card.available.length)} مسیر`} tone="positive" dot />}
      >
        {card.available.length === 0 ? (
          <p className="text-muted text-sm">
            میزبان هیچ‌یک از مسیرهای خواندنی این ماژول را منتشر نکرده است.
          </p>
        ) : (
          <EndpointList endpoints={card.available} />
        )}
      </Panel>

      <Panel
        title="قراردادهای مورد نیاز"
        hint="تا وقتی این مسیرها روی میزبان منتشر نشوند، صفحه داده ساختگی نشان نمی‌دهد."
        actions={
          <StatusChip
            label={card.missing.length === 0 ? 'کامل' : `${toPersianDigits(card.missing.length)} مسیر`}
            tone={card.missing.length === 0 ? 'positive' : 'caution'}
            dot
          />
        }
      >
        {card.missing.length === 0 ? (
          <p className="text-muted text-sm">این ماژول از نظر قرارداد کامل است.</p>
        ) : (
          <EndpointList endpoints={card.missing} />
        )}
      </Panel>
    </div>
  );
}

/**
 * The roll-up the homepage leads with: real figures read from the contract.
 *
 * `issuesTokens` is the fact that decides how every other figure may be read, so it is stated next to them
 * rather than in a footnote: a published route that returns 401 is not a working module.
 */
export function PlatformSummaryPanel() {
  const contract = useContract();

  return (
    <RequestBoundary
      call={contract}
      rows={4}
      render={(document) => {
        const summary = summarize(document);

        return (
          <div className="metric-grid">
            <Metric label="ماژول متصل" value={toPersianDigits(summary.connected)} tone="ok" />
            <Metric label="ماژول ناقص" value={toPersianDigits(summary.partial)} tone="wait" />
            <Metric label="ماژول بدون قرارداد" value={toPersianDigits(summary.gap)} />
            <Metric
              label="مسیرهای منتشرشده"
              value={`${toPersianDigits(summary.publishedOperations)} / ${toPersianDigits(summary.totalOperations)}`}
              tone="ok"
            />
          </div>
        );
      }}
    />
  );
}

function EndpointList({ endpoints }: { readonly endpoints: ModuleCard['available'] }) {
  return (
    <ul className="stack stack--tight">
      {endpoints.map((item) => (
        <li key={`${item.method} ${item.path}`} className="cluster cluster--tight">
          <span className="code-chip">
            {item.method} {item.path}
          </span>
          <span className="spacer" />
          {item.permission !== undefined && <span className="code-chip">{item.permission}</span>}
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'ok' | 'wait' | 'plain' }) {
  return (
    <div className={`metric${tone === 'ok' ? ' metric--ok' : tone === 'wait' ? ' metric--wait' : ''}`}>
      <p className="metric__label">{label}</p>
      <p className="metric__value">{value}</p>
    </div>
  );
}
