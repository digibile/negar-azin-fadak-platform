import { formatNumber } from '../lib/format';

interface PagerProps {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly onPage: (page: number) => void;
  readonly busy?: boolean;
}

/**
 * Page controls for a platform list.
 *
 * The figures come from the server's own `totalCount`, never from the length of the rows on screen, so the
 * control reports what the platform holds rather than what happened to fit.
 */
export function Pager({ page, pageSize, totalCount, onPage, busy = false }: PagerProps) {
  const totalPages = pageSize <= 0 ? 0 : Math.ceil(totalCount / pageSize);

  if (totalCount === 0) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);

  return (
    <nav className="pager" aria-label="صفحه‌بندی">
      <p className="text-sm text-muted">
        نمایش {formatNumber(first)}–{formatNumber(last)} از {formatNumber(totalCount)} رکورد
      </p>
      <div className="pager__controls">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            onPage(page - 1);
          }}
          disabled={busy || page <= 1}
        >
          صفحه قبل
        </button>
        <span className="text-sm text-muted">
          صفحه {formatNumber(page)} از {formatNumber(Math.max(totalPages, 1))}
        </span>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            onPage(page + 1);
          }}
          disabled={busy || page >= totalPages}
        >
          صفحه بعد
        </button>
      </div>
    </nav>
  );
}
