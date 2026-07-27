import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton so AuthContext can clear cached data on sign-out/session-expiry
 * without threading the client through props (mirrors configureAuthClient's
 * module-level hook pattern in api/client.ts).
 *
 * staleTime is 0 by default, which means every remount/refocus refetches even
 * data that's a few seconds old — on a slow backend that's a real cost. 30s
 * keeps incidental refetches (a screen remounting, a fast tab switch) off the
 * network, while every explicit invalidateQueries call (mutations, the
 * focus-refetch screens) still forces a fresh fetch regardless of staleness.
 * retry is capped at 1 (down from the default 3) so a genuine failure surfaces
 * after one retry instead of stacking exponential-backoff delays on top of an
 * already-slow host.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});
