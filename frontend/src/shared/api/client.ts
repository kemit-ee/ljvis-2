const BASE = '/api';

interface RuuterResponse<T> {
  response: T;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), { credentials: 'include' });
  const json = await res.json().catch(() => null) as RuuterResponse<T> | null;
  if (!res.ok) throw new ApiError(`GET ${path} failed: ${res.status}`, res.status, json?.response);
  return json!.response;
}

export async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null) as RuuterResponse<T> | null;
  if (!res.ok) throw new ApiError(`POST ${path} failed: ${res.status}`, res.status, json?.response);
  return json!.response;
}
