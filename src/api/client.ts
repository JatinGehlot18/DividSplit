import { AppConfig } from '../config';

/** Base URL for the DividSplit backend (REST under /api, GraphQL at /graphql), set per-env in .env.* — see src/config. */
export const API_BASE_URL = AppConfig.apiUrl;

type SpringError = { message?: string; error?: string };

// ---- Refresh-token wiring -----------------------------------------------
//
// The backend issues single-use refresh tokens: each successful refresh
// rotates both the access and refresh token, immediately revoking the old
// refresh token. Reusing an already-consumed refresh token is treated as
// theft and revokes the *entire* token family — including tokens issued by
// a refresh call that just legitimately succeeded moments earlier.
//
// That means two API calls hitting 401 at the same moment must never both
// call /api/auth/refresh with the same stale refresh token — the second
// call would retroactively kill the tokens the first call just received.
// `refreshAccessToken` below guards against that with a single in-flight
// promise shared by every concurrent caller.

type AuthHooks = {
  getRefreshToken: () => string | null;
  onTokensRefreshed: (accessToken: string, refreshToken: string) => void;
  onSessionExpired: () => void;
};

let authHooks: AuthHooks | null = null;

/** Wired up once by AuthContext so this module can rotate tokens and force a sign-out without importing React. */
export function configureAuthClient(hooks: AuthHooks) {
  authHooks = hooks;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!authHooks) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = authHooks!.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        authHooks!.onSessionExpired();
        return null;
      }
      const json = await res.json();
      authHooks!.onTokensRefreshed(json.accessToken, json.refreshToken);
      return json.accessToken as string;
    } catch {
      // Network hiccup during refresh — leave the session alone, this attempt just fails.
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/** Fetches with the given token; on 401 rotates via refreshAccessToken() and retries exactly once. */
async function fetchWithAuth(url: string, init: RequestInit, token?: string, isRetry = false): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return fetchWithAuth(url, init, newToken, true);
    }
  } else if (res.status === 401 && isRetry) {
    // Retried with a freshly-rotated token and still unauthorized — something
    // deeper is wrong (account disabled, etc). Force a clean sign-out.
    authHooks?.onSessionExpired();
  }

  return res;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const { method = 'GET', body, token } = options;
  const res = await fetchWithAuth(
    `${API_BASE_URL}${path}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    },
    token,
  );

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session has expired — please sign in again.');
    const err = json as SpringError | null;
    throw new Error(err?.message || err?.error || `API ${method} ${path} failed: ${res.status}`);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, { token }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body, token }),
  put: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'PUT', body, token }),
  del: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', token }),
};

/** POSTs a GraphQL query/mutation to /graphql, authenticated with the access token. */
export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  token?: string,
): Promise<T> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/graphql`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    },
    token,
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? 'Your session has expired — please sign in again.'
        : `GraphQL request failed: ${res.status}`,
    );
  }

  const json = text ? JSON.parse(text) : {};
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || 'GraphQL request failed');
  }
  return json.data as T;
}
