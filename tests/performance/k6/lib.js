// Jagatud abifunktsioonid LJVIS2 jõudlustestidele (k6).
import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:9086';
export const PC_ADMIN = __ENV.PC_ADMIN || '60001019906';

// dev-login on lubatud ainult CI/dev/test keskkonnas (TARA asemel). Tootmise vastu
// jõudlustesti ei tehta.
export function login(personalCode = PC_ADMIN) {
  const res = http.post(
    `${BASE_URL}/ljvis/auth/dev/dev-login`,
    JSON.stringify({ personalCode }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_dev_login' } },
  );
  if (!check(res, { 'login 200': (r) => r.status === 200 })) {
    fail(`dev-login ebaõnnestus: ${res.status} ${res.body}`);
  }
  const body = res.json();
  const token = typeof body === 'string' ? body : (body.response || body.token || '');
  if (!token) fail('dev-login ei tagastanud tokenit');
  return { Cookie: `customJwtCookie=${token}`, 'Content-Type': 'application/json' };
}

// Ruuter mähib vastuse sageli kujule { response: ... }.
export function unwrap(res) {
  try {
    const raw = res.json();
    if (raw && typeof raw === 'object' && 'response' in raw) {
      return typeof raw.response === 'string' ? JSON.parse(raw.response) : raw.response;
    }
    return raw;
  } catch (e) {
    return null;
  }
}

export function get(path, headers, name) {
  return http.get(`${BASE_URL}${path}`, { headers, tags: { name } });
}

export function post(path, body, headers, name) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), { headers, tags: { name } });
}
