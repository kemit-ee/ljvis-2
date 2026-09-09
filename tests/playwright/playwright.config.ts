import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(__dirname, '../../frontend');

/**
 * Stack, mille vastu testid jooksevad.
 *
 * Vaikimisi docker-compose.ci.yml pordid (sama pinu, mida tests/postman kasutab).
 * `bash tests/playwright/run.sh` tõstab pinu üles ja seab need env'id.
 */
// Playwright kasutab oma vite-porti (3101), et mitte segada käsil olevat
// dev-serverit (3001).
const DEV_PORT = process.env.LJVIS_DEV_PORT || '3101';
export const BASE_URL =
  process.env.LJVIS_BASE_URL || `http://localhost:${DEV_PORT}`;
export const API_URL = process.env.LJVIS_API_URL || 'http://localhost:9086';
export const TIM_URL = process.env.LJVIS_TIM_URL || 'http://localhost:9085';
export const TARA_URL = process.env.LJVIS_TARA_URL || 'https://localhost:9888';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  outputDir: './tulemus/.pw-artifacts',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  // Üks jagatud vite-dev server — paralleelsed töölised võistlevad esmase
  // route-kompileerimise pärast ja tekitavad ebastabiilsust. Seriaalne on
  // ~3 min, aga usaldusväärne.
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 12_000 },

  reporter: [
    ['./reporter/tulemus-reporter.ts'],
    ['html', { outputFolder: 'tulemus/html-raport', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    locale: 'et-EE',
    timezoneId: 'Europe/Tallinn',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    // Esimene navigatsioon route'ile käivitab vite külmkompileerimise.
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: 'setup',
      testDir: __dirname,
      testMatch: /global-setup\.ts$/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // Vaikeroll on Super Admin; üksikud testid vahetavad
        // `test.use({ storageState: STORAGE_STATE.officer })`.
        storageState: resolve(__dirname, 'tulemus/.auth/superadmin.json'),
      },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${DEV_PORT} --strictPort`,
    cwd: FRONTEND_DIR,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      VITE_PROXY_API: API_URL,
      VITE_PROXY_TIM: TIM_URL,
      VITE_PROXY_TARA: TARA_URL,
    },
  },
});

export const STORAGE_STATE = {
  superadmin: resolve(__dirname, 'tulemus/.auth/superadmin.json'),
  officer: resolve(__dirname, 'tulemus/.auth/officer.json'),
  noperm: resolve(__dirname, 'tulemus/.auth/noperm.json'),
};

export const TEST_USERS = {
  superadmin: '60001019906',
  officer: '60002020202',
  noperm: '60001017869',
};
