import { API_URL } from '@/config';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function _fetch<T>(path: string, options: RequestInit, headers: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

/** JWT-authenticated request — used only for POST /auth/me (Auth0 token exchange). */
export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return _fetch<T>(path, options, headers);
}

/** User-key-authenticated request — used for all /mgmt/* endpoints (x-api-key header). */
export async function mgmtRequest<T>(
  path: string,
  options: RequestInit = {},
  userKey?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userKey) headers['x-api-key'] = userKey;
  try {
    return await _fetch<T>(path, options, headers);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      window.dispatchEvent(new CustomEvent('mgmt-auth-error'));
    }
    throw err;
  }
}
