import { test as setup, expect, request } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { API_URL, BASE_URL, STORAGE_STATE, TEST_USERS } from './playwright.config';

/**
 * Logib sisse kõik testrollid dev-login endpointi kaudu ja salvestab
 * `customJwtCookie` küpsise storageState-failidena, mida test-projektid
 * taaskasutavad (kiire — ei logi iga testi juures uuesti sisse).
 *
 * dev-login (`tests/dsl/dev-login.yml`) tagastab TIM-allkirjastatud JWT-i
 * kujul {"response": "<jwt>"}. Küpsis kehtib localhost'i kõigil portidel
 * (küpsised ei arvesta porti), seega toimib nii otse Ruuteri (:9086) kui
 * vite-proxy (:3001) suunas.
 */
async function loginAs(personalCode: string, storagePath: string): Promise<string> {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post('/ljvis/auth/dev/dev-login', {
    data: { personalCode },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(
    res.ok(),
    `dev-login ${personalCode} → ${res.status()} ${await res.text()}`,
  ).toBeTruthy();

  const body = await res.json();
  const token: string = typeof body === 'string' ? body : body.response;
  expect(token, `dev-login ${personalCode} ei tagastanud JWT-d`).toBeTruthy();
  await ctx.dispose();

  const url = new URL(BASE_URL);
  await mkdir(dirname(storagePath), { recursive: true });
  await writeFile(
    storagePath,
    JSON.stringify(
      {
        cookies: [
          {
            name: 'customJwtCookie',
            value: token,
            domain: url.hostname,
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          },
        ],
        origins: [
          {
            origin: BASE_URL,
            localStorage: [{ name: 'i18nextLng', value: 'et' }],
          },
        ],
      },
      null,
      2,
    ),
  );
  return token;
}

setup('autendi Super Admin', async () => {
  const token = await loginAs(TEST_USERS.superadmin, STORAGE_STATE.superadmin);

  // Sanity: sessioon toimib ja rollil on ametniku õigused.
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.get('/ljvis/auth/session', {
    headers: { Cookie: `customJwtCookie=${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.response?.activeRole).toBe('officer');
  expect(Array.isArray(json.response?.permissions)).toBeTruthy();
  await ctx.dispose();
});

setup('autendi ametnik', async () => {
  await loginAs(TEST_USERS.officer, STORAGE_STATE.officer);
});

setup('autendi õigusteta kasutaja', async () => {
  await loginAs(TEST_USERS.noperm, STORAGE_STATE.noperm);
});
