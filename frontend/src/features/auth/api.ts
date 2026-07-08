import type { AuthUser } from './types';

const BASE = '/api';

interface RuuterResponse<T> {
  response: T;
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export async function getUserInfo(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${BASE}/auth/jwt/userinfo`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json: RuuterResponse<AuthUser> = await res.json();
    return json.response ?? null;
  } catch {
    return null;
  }
}
