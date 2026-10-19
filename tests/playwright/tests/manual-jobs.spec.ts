import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';

/**
 * Haldus > E-toimiku X-tee logid > Manuaalne käivitamine (õigus xroad.log.read).
 *
 * Kaart käivitab käsitsi samad tööd, mida CronManager ajastatult käivitab
 * (riskiskooride ümberarvutus + viis e-toimiku otsuste sünkroonimist).
 * Backend: POST /v1/admin/manual-jobs/run, kinnine tööde nimekiri.
 *
 * E-toimiku sünkroonimised räägivad XTR-iga; CI-s on tulemus (leitud/ei leitud/
 * viga) keskkonnast sõltuv, seega assertitakse ainult, et töö jooksis lõpuni
 * (HTTP 200 + "lõpetatud" teade), mitte konkreetset kandidaatide arvu.
 */

const JOBS = [
  { key: 'risk-score-recalc-sync', title: 'Riskiskooride ümberarvutus' },
  { key: 'etoimik-decision-sync', title: 'E-toimiku sünkroonimine: tööinspektsioon' },
  { key: 'etoimik-tram-decision-sync', title: 'E-toimiku sünkroonimine: TRAM kontrollkaart' },
  {
    key: 'etoimik-sp-driver-decision-sync',
    title: 'E-toimiku sünkroonimine: autojuhi sõidu- ja puhkeaeg',
  },
  {
    key: 'etoimik-sp-teammate-decision-sync',
    title: 'E-toimiku sünkroonimine: meeskonnaliikme sõidu- ja puhkeaeg',
  },
  {
    key: 'etoimik-technical-check-decision-sync',
    title: 'E-toimiku sünkroonimine: tehniline kontroll',
  },
] as const;

const RUN_URL = '/api/v1/admin/manual-jobs/run';

async function openLogsPage(page: import('@playwright/test').Page) {
  await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Manuaalne käivitamine' })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('Manuaalne käivitamine (X-tee logide leht)', () => {
  test('kaart näitab kõiki kuut tööd koos "Käivita" nupuga', async ({ page }) => {
    await openLogsPage(page);
    for (const job of JOBS) {
      const row = page.getByTestId(`manual-job-${job.key}`);
      await expect(row.getByText(job.title, { exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Käivita' })).toBeEnabled();
    }
  });

  test('riskiskooride ümberarvutuse käivitamine lõpeb teatega arvestatud, õnnestunud ja ebaõnnestunud kirjete arvuga', async ({
    page,
  }) => {
    await openLogsPage(page);

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/admin/manual-jobs/run')),
      page
        .getByTestId('manual-job-risk-score-recalc-sync')
        .getByRole('button', { name: 'Käivita' })
        .click(),
    ]);
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toEqual({ job: 'risk-score-recalc-sync' });
    const { response: body } = await response.json();
    expect(body.total).toBe(body.succeeded + body.failures);

    await expect(
      page.getByText(/Töö „Riskiskooride ümberarvutus” lõpetatud\. Arvestati \d+, õnnestus \d+, ebaõnnestus \d+\./),
    ).toBeVisible({ timeout: 60_000 });
    // Töö lõppedes on nupud taas kasutatavad.
    await expect(
      page
        .getByTestId('manual-job-risk-score-recalc-sync')
        .getByRole('button', { name: 'Käivita' }),
    ).toBeEnabled();
  });

  test('töö käimise ajal on teised "Käivita" nupud keelatud', async ({ page }) => {
    await openLogsPage(page);

    // Hoia vastust kinni, et käimasoleku olek oleks jälgitav.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/admin/manual-jobs/run', async (route) => {
      await gate;
      await route.continue();
    });

    await page
      .getByTestId('manual-job-etoimik-tram-decision-sync')
      .getByRole('button', { name: 'Käivita' })
      .click();

    await expect(
      page.getByTestId('manual-job-etoimik-tram-decision-sync').getByRole('button'),
    ).toHaveText(/Töötab/);
    await expect(
      page.getByTestId('manual-job-etoimik-decision-sync').getByRole('button'),
    ).toBeDisabled();

    release();
    await expect(page.getByText(/Töö „E-toimiku sünkroonimine: TRAM kontrollkaart” lõpetatud/)).toBeVisible({
      timeout: 60_000,
    });
  });

  test('e-toimiku sünkroonimise käivitamine jookseb lõpuni', async ({ page }) => {
    await openLogsPage(page);

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/admin/manual-jobs/run')),
      page
        .getByTestId('manual-job-etoimik-decision-sync')
        .getByRole('button', { name: 'Käivita' })
        .click(),
    ]);
    expect(response.status()).toBe(200);
    await expect(
      page.getByText(/Töö „E-toimiku sünkroonimine: tööinspektsioon” lõpetatud\. Arvestati \d+, õnnestus \d+, ebaõnnestus \d+\./),
    ).toBeVisible({ timeout: 60_000 });
  });

  test('API: tundmatu töö nimi lükatakse tagasi (400)', async ({ page }) => {
    const res = await page.request.post(RUN_URL, { data: { job: 'archive-deleted-forms' } });
    expect(res.status()).toBe(400);
  });

  test('õigusteta kasutaja ei pääse kaardile ega API-sse', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();

    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/puudub ligipääs/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Manuaalne käivitamine' })).toHaveCount(0);

    const res = await page.request.post(RUN_URL, { data: { job: 'risk-score-recalc-sync' } });
    expect(res.status()).toBe(403);

    await ctx.close();
  });
});
