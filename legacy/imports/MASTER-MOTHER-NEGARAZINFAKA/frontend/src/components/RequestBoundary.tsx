import type { ReactNode } from 'react';
import { LoadingRows } from './LoadingRows';
import { State } from './State';
import type { Call } from '../lib/usePlatformCall';

interface RequestBoundaryProps<T> {
  readonly call: Call<T>;
  /**
   * Turns a successful value into content, or into `null` to render the empty state.
   *
   * Returning `null` is what keeps "the call worked and the collection is empty" from being rendered as a
   * failure, which is the difference between a real record and a missing feature.
   */
  readonly render: (value: T) => ReactNode;
  readonly emptyTitle?: string;
  readonly emptyBody?: string;
  readonly rows?: number;
  /** Controls offered by the failure or empty state, e.g. a retry. */
  readonly action?: ReactNode;
}

/**
 * Renders the right state for a platform call, so no screen has to remember all six.
 *
 * Every screen that reads the platform goes through this, which makes "loading, empty, error, unauthorized,
 * forbidden and network failure are all handled" a property of the design system rather than something each
 * page re-implements — and forgets.
 */
export function RequestBoundary<T>({
  call,
  render,
  emptyTitle = 'رکوردی وجود ندارد',
  emptyBody = 'سرویس پاسخ داد و نتیجه‌ای برنگرداند. این وضعیت خطا نیست.',
  rows = 4,
  action,
}: RequestBoundaryProps<T>) {
  if (call.state.status === 'loading') {
    return <LoadingRows rows={rows} />;
  }

  if (call.state.status === 'failed') {
    const { failure } = call.state;
    return (
      <State tone={failure.tone} title={failure.title} body={failure.body} meta={failure.meta} action={action} />
    );
  }

  const content = render(call.state.value);
  return content === null ? <State tone="empty" title={emptyTitle} body={emptyBody} action={action} /> : <>{content}</>;
}
