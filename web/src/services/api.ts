const API_URL = __APP_API_URL__;

type TokenResponse = { accessToken: string };
export type ApiStatus = 'checking' | 'ok' | 'error';

export async function checkApiHealth(signal?: AbortSignal): Promise<void> {
  const tokenResponse = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY ?? '' },
    body: JSON.stringify({
      keyServer: 'local-web',
      bucket: 'face-recognition-poc',
      expiresIn: '1h',
      serverIp: '127.0.0.1',
    }),
    signal,
  });
  if (!tokenResponse.ok) throw new Error(`Token API returned ${tokenResponse.status}`);
  const { accessToken } = (await tokenResponse.json()) as TokenResponse;

  const healthResponse = await fetch(`${API_URL}/health`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  if (!healthResponse.ok) throw new Error(`Health API returned ${healthResponse.status}`);
}
