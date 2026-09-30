const API_URL = __APP_API_URL__;

type TokenResponse = { accessToken: string; expiresIn: number };
export type ApiStatus = 'checking' | 'ok' | 'error';

let accessToken: string | null = null;
let expiresAt = 0;
let tokenPromise: Promise<string> | null = null;

async function requestAccessToken(signal?: AbortSignal): Promise<string> {
  if (accessToken && Date.now() < expiresAt - 30_000) return accessToken;
  if (tokenPromise) return tokenPromise;

  tokenPromise = fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': __APP_API_KEY__ },
    body: JSON.stringify({
      keyServer: 'local-web',
      bucket: 'face-recognition-poc',
      expiresIn: '1h',
      serverIp: '127.0.0.1',
    }),
    signal,
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Token API returned ${response.status}`);
    const token = (await response.json()) as TokenResponse;
    accessToken = token.accessToken;
    expiresAt = Date.now() + token.expiresIn * 1000;
    return token.accessToken;
  }).finally(() => { tokenPromise = null; });

  return tokenPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await requestAccessToken(init.signal ?? undefined);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const detail = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
    throw new Error(detail || `API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function checkApiHealth(signal?: AbortSignal): Promise<void> {
  await apiRequest('/health', { signal });
}
