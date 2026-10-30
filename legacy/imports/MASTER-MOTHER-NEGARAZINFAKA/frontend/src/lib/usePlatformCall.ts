import { useCallback, useEffect, useRef, useState } from 'react';
import { stateForFailure, type StateTone } from '../components/State';

/** A classified failure, ready to render without re-deriving anything. */
export interface CallFailure {
  readonly tone: StateTone;
  readonly title: string;
  readonly body: string;
  /** A stable platform error code, a correlation id, or an HTTP status, for a report. */
  readonly meta: string | null;
  /** True when re-issuing the same call could plausibly succeed. */
  readonly retryable: boolean;
}

/** The states a screen that calls the platform can be in. */
export type CallState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'failed'; readonly failure: CallFailure };

export interface Call<T> {
  readonly state: CallState<T>;
  /** Re-runs the call, cancelling the one in flight. */
  readonly reload: () => void;
}

/**
 * Runs one platform call for as long as the screen is mounted.
 *
 * The abort controller is tied to the effect, so a screen that unmounts or re-runs does not resolve into
 * state that is no longer on display — which is how a slow list ends up showing the counts of the request
 * it issued two filters ago.
 *
 * A failure is classified once, here, into the state a screen renders. Doing it at the call site means every
 * page would have to distinguish "unreachable" from "unauthorized" from "forbidden" on its own, and the
 * first page that forgot would show a permission problem as a crash.
 */
export function usePlatformCall<T>(run: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]): Call<T> {
  const [state, setState] = useState<CallState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState({ status: 'loading' });
    runRef
      .current(controller.signal)
      .then((value) => {
        if (active) {
          setState({ status: 'ready', value });
        }
      })
      .catch((failure: unknown) => {
        if (!active || (failure instanceof DOMException && failure.name === 'AbortError')) {
          return;
        }
        const classified = stateForFailure(failure);
        setState({
          status: 'failed',
          failure: { ...classified, retryable: classified.tone === 'offline' || classified.tone === 'error' },
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [...deps, attempt]);

  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { state, reload };
}
