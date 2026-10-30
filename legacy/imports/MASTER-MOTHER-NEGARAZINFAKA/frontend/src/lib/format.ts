/** Formatting helpers shared by the screens. All of them take a value the server sent. */

/** Renders an ISO timestamp in the Persian locale, without pretending the browser knows Tehran time. */
export function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tehran',
  }).format(parsed);
}

/** Renders a number in the Persian locale with Persian digits. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}

/** Renders a machine code such as an identifier in a monospaced, non-folding run. */
export function formatGuid(value: string): string {
  return value;
}

/** Shortens an identifier for a narrow column, keeping both ends so it stays recognisable. */
export function shortGuid(value: string): string {
  return value.length <= 13 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

/** Turns a domain status word into a Persian label, falling back to the server's own word. */
export function statusLabel(status: string, known: Readonly<Record<string, string>>): string {
  return known[status] ?? status;
}

/** Renders a lifecycle status on the screens that show one. */
export const UNIT_STATUS_LABELS: Readonly<Record<string, string>> = {
  Active: 'فعال',
  Suspended: 'تعلیق',
  Closed: 'بسته',
  Draft: 'پیش‌نویس',
};

export const ROLE_STATUS_LABELS: Readonly<Record<string, string>> = {
  Active: 'فعال',
  Retired: 'بازنشسته',
  Draft: 'پیش‌نویس',
};

export const AUDIT_OUTCOME_LABELS: Readonly<Record<string, string>> = {
  Success: 'موفق',
  Denied: 'رد شده',
  Failed: 'ناموفق',
};

/** Renders a permission code's category as a Persian label. */
export function categoryLabel(category: string): string {
  const known: Readonly<Record<string, string>> = {
    platform: 'پلتفرم',
    identity: 'هویت',
    organization: 'سازمان',
    authorization: 'مجوزدهی',
    tenant: 'مستأجر',
  };
  return known[category.toLowerCase()] ?? category;
}
