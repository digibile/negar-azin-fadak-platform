import { useCallback, useSyncExternalStore } from 'react';
import { currentAccessToken, setAccessToken, subscribeToSession } from './session';

/** Whether the client currently holds an access token for this tab. */
export function useIsSignedIn(): boolean {
  const token = useSyncExternalStore(subscribeToSession, currentAccessToken, () => null);
  return token !== null;
}

/** Ends the session of this tab. */
export function useSignOut(): () => void {
  return useCallback(() => {
    setAccessToken(null);
  }, []);
}
