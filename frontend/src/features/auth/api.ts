import type { AuthUser, RepresentedCompany, RepresentationRole } from './types';

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

// GET/auth/session.yml — works for citizen-only TARA sessions (no
// users.user_account row required, unlike the old /auth/jwt/userinfo).
export async function getUserInfo(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${BASE}/auth/session`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json: RuuterResponse<AuthUser> = await res.json();
    return json.response ?? null;
  } catch {
    return null;
  }
}

export async function getRepresentationCompanies(): Promise<
  RepresentedCompany[]
> {
  try {
    const res = await fetch(`${BASE}/auth/representation/companies`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return [];
    const json: RuuterResponse<{ companies: RepresentedCompany[] }> =
      await res.json();
    return json.response?.companies ?? [];
  } catch {
    return [];
  }
}

export async function switchRepresentation(
  role: RepresentationRole,
  registryCode?: string,
): Promise<boolean> {
  const res = await fetch(`${BASE}/auth/representation/switch`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, registryCode: registryCode ?? '' }),
  });
  return res.ok;
}
