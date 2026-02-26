import i18n from '@shared/i18n';

export const getApiBase = (): string =>
  (typeof process !== 'undefined' && process.env?.API_HOST) || 'http://localhost:3000';

const API_BASE = getApiBase();

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ligamatch_token');
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const lang = typeof i18n?.language === 'string' ? i18n.language : 'es';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': lang.split('-')[0] || 'es',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      details?: Array<{ message: string; path?: string[] }>;
    };
    const details = body.details?.map((d) => d.message).join('; ');
    const msg = details || body.message || res.statusText;
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
