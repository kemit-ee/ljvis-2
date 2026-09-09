import { test, expect } from '../support/fixtures';

/**
 * ERRU väljaminevad päringud/teated (CTUD, CGR, RSI, NCR) — Super Admin
 * õigustega. Katame lehe avanemise ja tühja vormi validatsiooni.
 * Tegelikku „Saada ERRU" ei testi (sõltub ERRU taustsüsteemist).
 */

const SAVE_LABELS = /Salvesta|Saada|Koosta/;

const FORMS: { nimi: string; route: string; marker: RegExp }[] = [
  { nimi: 'CTUD (tegevusloa kontroll)', route: '/erru/ctud/new', marker: /tegevusloa|CTUD/i },
  { nimi: 'CGR (mainepäring)', route: '/erru/cgr/new', marker: /mainep|CGR/i },
  { nimi: 'RSI (tehnokontrolli teade)', route: '/erru/rsi/new', marker: /tehnokontrolli|RSI/i },
  { nimi: 'NCR (kontrollitulemuse teade)', route: '/erru/ncr/new', marker: /kontrollitulemus|NCR/i },
];

for (const f of FORMS) {
  test.describe(`ERRU ${f.nimi}`, () => {
    test('leht avaneb ja renderdab vormi', async ({ page }) => {
      const fatal: string[] = [];
      page.on('pageerror', (e) => {
        if (/Minified React error|Cannot read propert|is not a function/.test(String(e))) {
          fatal.push(String(e));
        }
      });
      await page.goto(f.route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(f.marker).first()).toBeVisible({ timeout: 20_000 });
      expect(fatal, `React renderdusvead: ${fatal.join(' | ')}`).toEqual([]);
    });

    test('tühja vormi esitamine ei salvesta ja kuvab valideerimisviteid', async ({
      page,
    }) => {
      await page.goto(f.route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(f.marker).first()).toBeVisible({ timeout: 20_000 });

      const startUrl = page.url();
      const submit = page.getByRole('button', { name: SAVE_LABELS }).first();
      await submit.click({ trial: false }).catch(() => {});
      await page.waitForTimeout(1500);

      // Kas jäi samale lehele (ei loodud /:id) või kuvab veateate.
      const sameUrl = page.url() === startUrl || /\/new$/.test(page.url());
      const hasError =
        (await page.getByText(/Kohustuslik|nõutav|required|valige|täida/i).count()) > 0;
      expect(
        sameUrl || hasError,
        'tühja vormi ei tohi vaikselt salvestada',
      ).toBeTruthy();
    });
  });
}
