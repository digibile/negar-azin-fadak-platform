import type { ReactNode } from 'react';
import { ApiError, TransportError, type ProblemError } from '../lib/http/client';

export type StateTone = 'empty' | 'gap' | 'error' | 'unauthorized' | 'forbidden' | 'offline';

const TONE_LABELS: Readonly<Record<StateTone, string>> = {
  empty: 'خالی',
  gap: 'بدون قرارداد سرویس',
  error: 'خطای سرویس',
  unauthorized: 'نیازمند ورود',
  forbidden: 'دسترسی غیرمجاز',
  offline: 'قطع ارتباط',
};

interface StateProps {
  readonly tone: StateTone;
  readonly title: string;
  readonly body: ReactNode;
  /** A correlation id or status code, shown in a Latin monospaced run so it can be copied into a report. */
  readonly meta?: string | null;
  readonly action?: ReactNode;
}

/**
 * What a screen shows when it has nothing to show.
 *
 * The tones are deliberately distinct, because collapsing them into one "no data" message hides the
 * difference that decides what the operator does next:
 *
 * - `empty`       the platform answered and there is nothing in it.
 * - `gap`         the platform has not built this yet; the screen needs a contract that does not exist.
 * - `unauthorized` no usable access token was presented.
 * - `forbidden`   the token is valid but the caller's role lacks the permission.
 * - `offline`     the platform could not be reached at all.
 * - `error`       the platform answered with a failure.
 *
 * A screen that cannot tell those apart invites somebody to enter data that already exists, or to report a
 * missing feature that is really a permission problem.
 */
export function State({ tone, title, body, meta, action }: StateProps) {
  return (
    <div className={`state state--${tone}`} role={tone === 'error' || tone === 'offline' ? 'alert' : 'status'}>
      <div className="cluster cluster--tight">
        <p className="state__title">{title}</p>
        <span className="chip">{TONE_LABELS[tone]}</span>
      </div>
      <div className="state__body">{body}</div>
      {meta !== undefined && meta !== null && <p className="state__meta">{meta}</p>}
      {action !== undefined && <div className="cluster cluster--tight">{action}</div>}
    </div>
  );
}

/** The stable machine-readable codes the platform returns, for display beside a failure. */
function problemCodes(problem: ApiError['problem']): readonly ProblemError[] {
  return problem?.errors ?? [];
}

/**
 * Turns a thrown platform call into the right state.
 *
 * A 401 and a 403 are not both "an error": one means the session must be established and the other means
 * the session is not enough. Rendering them the same way is how a user ends up re-logging in forever.
 */
export function stateForFailure(failure: unknown): {
  readonly tone: StateTone;
  readonly title: string;
  readonly body: string;
  readonly meta: string | null;
} {
  if (failure instanceof TransportError) {
    return {
      tone: 'offline',
      title: 'سرویس پلتفرم در دسترس نیست',
      body: 'درخواست به سرویس پلتفرم نرسید. اتصال شبکه، نشانی سرویس و وضعیت اجرای API را بررسی کنید.',
      meta: failure.correlationId,
    };
  }

  if (failure instanceof ApiError) {
    const codes = problemCodes(failure.problem);

    if (failure.isUnauthorized) {
      return {
        tone: 'unauthorized',
        title: 'برای این بخش باید وارد شوید',
        body:
          'این مسیر یک توکن دسترسی معتبر می‌خواهد. پلتفرم هنوز سرویس ورود (احراز هویت) ارائه نمی‌کند، ' +
          'بنابراین داده این بخش در حال حاضر قابل خواندن نیست. هیچ اطلاعات ساختگی نمایش داده نمی‌شود.',
        meta: failure.correlationId ?? `HTTP ${failure.status}`,
      };
    }

    if (failure.isForbidden) {
      return {
        tone: 'forbidden',
        title: 'مجوز کافی در نقش شما وجود ندارد',
        body:
          'توکن معتبر است اما نقش جاری مجوز لازم برای این عملیات را ندارد. این یک پاسخ درست پلتفرم است، ' +
          'نه خطا. برای مشاهده، مجوز مورد نیاز باید به نقش شما داده شود.',
        meta: failure.correlationId ?? `HTTP ${failure.status}`,
      };
    }

    const described = codes.map((entry) => entry.description).filter((value) => value.length > 0);
    const codeText = codes.map((entry) => entry.code).join('، ');

    return {
      tone: 'error',
      title: failure.isNotFound ? 'این مسیر روی پلتفرم وجود ندارد' : 'پلتفرم در پاسخ به درخواست با خطا مواجه شد',
      body:
        described.length > 0
          ? described.join(' ')
          : failure.status >= 500
            ? 'خطای داخلی سرور. جزئیات در لاگ‌های پلتفرم ثبت شده است.'
            : `پاسخ سرویس با وضعیت ${failure.status} بازگشت.`,
      meta: codeText.length > 0 ? codeText : (failure.correlationId ?? `HTTP ${failure.status}`),
    };
  }

  return {
    tone: 'error',
    title: 'خطای پیش‌بینی‌نشده',
    body: 'در پردازش پاسخ سرویس خطایی رخ داد.',
    meta: null,
  };
}
