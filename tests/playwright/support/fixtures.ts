import { test as base, expect } from '@playwright/test';

/**
 * Baastesti laiendus:
 *  - sunnib eesti keele (localStorage i18nextLng=et) enne iga lehe laadimist;
 *  - ebaõnnestumisel lisab testile lehe URL-i ja täisvaate ekraanipildi
 *    (tulemus-reporter kopeerib need `tulemus/<test>/` kausta).
 */
export const test = base.extend<object>({
  page: async ({ page }, use, testInfo) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('i18nextLng', 'et');
      } catch {
        /* ignore */
      }
    });

    await use(page);

    if (testInfo.status !== testInfo.expectedStatus) {
      // URL ebaõnnestumise hetkel
      await testInfo
        .attach('lehe-url', { body: page.url(), contentType: 'text/plain' })
        .catch(() => {});
      // Täisvaate ekraanipilt (screenshot: 'only-on-failure' teeb ainult
      // vaateava pildi; lisame ka fullPage konteksti jaoks)
      const shot = await page.screenshot({ fullPage: true }).catch(() => null);
      if (shot) {
        await testInfo
          .attach('taisvaade', { body: shot, contentType: 'image/png' })
          .catch(() => {});
      }
      // Konsooli/lehe seis
      await testInfo
        .attach('pealkiri', {
          body: await page.title().catch(() => ''),
          contentType: 'text/plain',
        })
        .catch(() => {});
    }
  },
});

export { expect };
