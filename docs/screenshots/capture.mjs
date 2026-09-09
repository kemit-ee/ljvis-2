// LJVIS2 kasutusjuhendi ekraanipiltide genereerimine.
//
// Eeldab, et kohalik stack käib (docker compose up -d) ja frontend dev-server
// on aadressil http://localhost:3001 (vt docs/screenshots/README.md).
//
// Kasutus:
//   cd docs/screenshots
//   npm install
//   npx playwright install chromium
//   node capture.mjs                # kõik pildid
//   node capture.mjs sisselogimine  # ainult failinime mustriga sobivad
//
// Pildid kirjutatakse:
//   docs/user-guide/images/<jaotis>/...
//   docs/admin-guide/images/<jaotis>/...

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, '..');
const BASE = process.env.LJVIS_BASE ?? 'http://localhost:3001';
const PERSONAL_CODE = process.env.LJVIS_PERSONAL_CODE ?? '60001019906'; // Super Admin
const filter = process.argv[2] ?? '';

const VIEWPORT = { width: 1440, height: 900 };

/** @typedef {{ name: string, run: (page: import('playwright').Page) => Promise<void> }} Shot */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function settle(page, ms = 700) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await sleep(ms);
}

async function shoot(page, relPath) {
  const abs = resolve(DOCS, relPath);
  await mkdir(dirname(abs), { recursive: true });
  await settle(page);
  await page.screenshot({ path: abs, fullPage: false });
  console.log('  ✓', relPath);
}

async function gotoShot(page, route, relPath) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await shoot(page, relPath);
}

async function login(context) {
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await settle(page);
  // "Ametnikule" veerg on teine "Sisene süsteemi" nupp.
  await page.getByRole('button', { name: /Sisene süsteemi/i }).nth(1).click();
  await page.waitForLoadState('domcontentloaded');
  await settle(page, 500);
  // tara-mock: vali õige isikukood ja kinnita.
  const radio = page.locator(`input[type=radio]`, { hasText: '' }).first();
  // radio labelid on kujul "60001019906 Admin Super"
  const target = page.locator('label, body').getByText(PERSONAL_CODE, { exact: false }).first();
  await target.click().catch(async () => {
    await page.locator('input[type=radio]').first().check();
  });
  await page.getByRole('button', { name: 'kinnita' }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/callback'), { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => document.body.innerText.includes('Töölaud'), null, { timeout: 15000 });
  await settle(page, 800);
  return page;
}

async function openRoleMenu(page) {
  await page.getByRole('button', { name: /^Vaade/ }).click().catch(() => {});
  await sleep(500);
}

async function switchRole(page, label) {
  await openRoleMenu(page);
  await page.locator('.header-role-menu').getByRole('button', { name: label, exact: true }).click();
  await settle(page, 1500);
}

async function firstRowHref(page, linkPattern) {
  const link = page.locator(`a[href*="${linkPattern}"]`).first();
  await link.waitFor({ timeout: 5000 }).catch(() => {});
  return (await link.getAttribute('href').catch(() => null)) ?? null;
}

async function openCompoundTab(page, key, tabName, relPath) {
  await page.goto(`${BASE}/control-forms/compound/${key}`, { waitUntil: 'domcontentloaded' });
  await settle(page, 1200);
  if (tabName) {
    await page.getByRole('tab', { name: tabName }).click({ timeout: 8000 }).catch(() => {});
    await sleep(900);
  }
  await shoot(page, relPath);
}

// ---------------------------------------------------------------------------
// Pildikomplekt
// ---------------------------------------------------------------------------
/** @type {Shot[]} */
const shots = [
  {
    name: 'user-guide/sisselogimine',
    run: async (page) => {
      // Väljalogitud sisselogimisleht — eraldi kontekst ilma küpsiseta.
      const ctx = await page.context().browser().newContext({ viewport: VIEWPORT, locale: 'et-EE', deviceScaleFactor: 2 });
      await ctx.addInitScript(() => localStorage.setItem('i18nextLng', 'et'));
      const p = await ctx.newPage();
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await settle(p);
      await shoot(p, 'user-guide/images/02-sisselogimine/01-sisselogimisleht.png');
      await p.getByRole('link', { name: /Kuva rohkem/i }).click().catch(() => {});
      await sleep(300);
      await shoot(p, 'user-guide/images/02-sisselogimine/02-sisselogimisleht-kirjeldus.png');
      await ctx.close();
    },
  },
  {
    name: 'user-guide/toolaud',
    run: async (page) => {
      // Töölaua ülaosa — "Koondvorm" + "Vormid" plokid (LJVIS2-37).
      await gotoShot(page, '/', 'user-guide/images/04-toolaud/01-toolaud.png');
      const scrollToHeading = async (re) => {
        await page.evaluate((src) => {
          const rx = new RegExp(src, 'i');
          const h = [...document.querySelectorAll('h1,h2,h3')].find((e) =>
            rx.test(e.textContent || ''));
          (h ?? document.body).scrollIntoView({ block: 'start' });
        }, re);
        await sleep(700);
      };
      // "Töös olevad koondvormid" tabel (grupeeritud koondvormi kaupa).
      await scrollToHeading('Töös olevad koondvormid');
      await page.screenshot({
        path: resolve(DOCS, 'user-guide/images/04-toolaud/02-toolaud-tabel.png'),
      });
      console.log('  ✓', 'user-guide/images/04-toolaud/02-toolaud-tabel.png');
      // "Töös olevad vormid" tabel (iseseisvad vormid).
      await scrollToHeading('Töös olevad vormid');
      await page.screenshot({
        path: resolve(
          DOCS,
          'user-guide/images/04-toolaud/04-toolaud-vormid-tabel.png',
        ),
      });
      console.log(
        '  ✓',
        'user-guide/images/04-toolaud/04-toolaud-vormid-tabel.png',
      );
    },
  },
  {
    name: 'user-guide/teavitused',
    run: async (page) => {
      await gotoShot(page, '/notifications', 'user-guide/images/20-teavitused/01-teavitused.png');
      await page.getByRole('tab', { name: /Saadetud kirjad/i }).click({ timeout: 5000 }).catch(() => {});
      await sleep(900);
      await shoot(page, 'user-guide/images/20-teavitused/02-saadetud-kirjad.png');
    },
  },
  {
    name: 'user-guide/menyy',
    run: async (page) => {
      await gotoShot(page, '/', 'user-guide/images/03-menyy/01-vasakmenyy.png');
      await page.getByRole('button', { name: 'Haldus' }).click().catch(() => {});
      await sleep(400);
      await shoot(page, 'user-guide/images/03-menyy/02-haldus-alammenyy.png');
      await openRoleMenu(page);
      await shoot(page, 'user-guide/images/03-menyy/03-vaade-rollivahetus.png');
      await page.keyboard.press('Escape').catch(() => {});
    },
  },
  {
    name: 'user-guide/kodaniku-toolaud',
    run: async (page) => {
      await switchRole(page, 'Kodanik');
      await shoot(page, 'user-guide/images/01-sissejuhatus/01-kodaniku-toolaud.png');
      await shoot(page, 'user-guide/images/04-toolaud/03-kodaniku-toolaud.png');
      await switchRole(page, 'Ametnik');
    },
  },

  // --- Vormide loomisvaated (tühjad) ---
  { name: 'user-guide/vorm-valisrikkumine', run: (p) => gotoShot(p, '/control-forms/foreign-violation/new', 'user-guide/images/06-vorm-valisrikkumine/01-loomisvaade.png') },
  { name: 'user-guide/vorm-liitvorm', run: (p) => gotoShot(p, '/control-forms/compound/new', 'user-guide/images/07-vorm-liitvorm/01-loomisvaade.png') },
  { name: 'user-guide/vorm-tooinspektsioon', run: (p) => gotoShot(p, '/control-forms/labour-inspection/new', 'user-guide/images/08-vorm-tooinspektsioon/01-loomisvaade.png') },
  { name: 'user-guide/vorm-hea-maine', run: (p) => gotoShot(p, '/control-forms/good-repute/new', 'user-guide/images/12-vorm-hea-maine/01-loomisvaade.png') },
  {
    name: 'user-guide/vorm-tram-kontrollkaart',
    run: async (page) => {
      // 01 — loomisvaade (tühi üldosa, enne salvestamist)
      await gotoShot(page, '/control-forms/tram-driver/new', 'user-guide/images/18-vorm-tram-kontrollkaart/01-loomisvaade.png');

      // 02 — üldosa detail: sõiduki kategooria + vedaja plokk (fixture 95006001)
      await page.goto(`${BASE}/control-forms/tram-driver/95006001`, { waitUntil: 'domcontentloaded' });
      await settle(page, 1200);
      await shoot(page, 'user-guide/images/18-vorm-tram-kontrollkaart/02-uldosa.png');

      // 03 — autojuhi vahekaart alati avatud (fixture 95006001)
      await page.getByRole('tab', { name: /Autojuhi andmed|Sõidukijuhi/i }).click({ timeout: 6000 }).catch(() => {});
      await sleep(800);
      await shoot(page, 'user-guide/images/18-vorm-tram-kontrollkaart/03-autojuhi-vahekaart.png');

      // 04 — „Ei ole asjakohane" märkeruut (loomisvaade, üldosa salvestatud)
      // Näitame loomisvaates välja, kust märkeruut asub — scroll juhi andmete plokki
      await page.goto(`${BASE}/control-forms/tram-driver/95006001`, { waitUntil: 'domcontentloaded' });
      await settle(page, 1200);
      await page.getByRole('tab', { name: /Autojuhi andmed|Sõidukijuhi/i }).click({ timeout: 6000 }).catch(() => {});
      await sleep(600);
      const checkbox = page.locator('input[type=checkbox]').filter({ hasText: '' }).first();
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      await sleep(400);
      await shoot(page, 'user-guide/images/18-vorm-tram-kontrollkaart/04-ei-ole-asjakohane.png');

      // 05 — e-toimiku päring (nähtav kui proceedingReferenceNumber täidetud; fixture kuvab kaarti)
      await page.goto(`${BASE}/control-forms/tram-driver/95006001`, { waitUntil: 'domcontentloaded' });
      await settle(page, 1200);
      await shoot(page, 'user-guide/images/18-vorm-tram-kontrollkaart/05-etoimik.png');
    },
  },

  // --- Liitvorm ja alamvormid (näidisvormid 95002001..95002005, vt
  //     DSL/Liquibase/test/20260903100000-user-guide-fixture-forms.sql) ---
  { name: 'user-guide/vorm-liitvorm-detail', run: (p) => openCompoundTab(p, 95002001, null, 'user-guide/images/07-vorm-liitvorm/02-detailvaade.png') },
  { name: 'user-guide/vorm-soidu-puhkeaeg', run: (p) => openCompoundTab(p, 95002001, /Autojuhi sõidu- ja puhkeaja/, 'user-guide/images/13-vorm-soidu-puhkeaeg/01-alamvorm.png') },
  { name: 'user-guide/vorm-tehniline-kontroll', run: (p) => openCompoundTab(p, 95002001, /tehnonõuetele vastavuse/, 'user-guide/images/09-vorm-tehniline-kontroll/01-alamvorm.png') },
  { name: 'user-guide/vorm-adr', run: (p) => openCompoundTab(p, 95002001, /ADR kontrollvorm/, 'user-guide/images/11-vorm-adr/01-alamvorm.png') },
  { name: 'user-guide/vorm-vedude-katkestamine', run: (p) => openCompoundTab(p, 95002002, /katkestamine/, 'user-guide/images/10-vorm-vedude-katkestamine/01-alamvorm.png') },
  { name: 'user-guide/vorm-trailer-tehniline', run: (p) => openCompoundTab(p, 95002002, /[Hh]aagise tehno/, 'user-guide/images/09-vorm-tehniline-kontroll/02-haagis.png') },

  // --- Failide lisamine: välisriigi rikkumise vorm 95003001 (salvestatud, manustega) ---
  {
    name: 'user-guide/failide-lisamine',
    run: async (page) => {
      await page.goto(`${BASE}/control-forms/foreign-violation/95003001`, { waitUntil: 'domcontentloaded' });
      await settle(page, 1200);
      await page.getByText('Failid', { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {});
      await sleep(600);
      await shoot(page, 'user-guide/images/14-failide-lisamine/01-failide-plokk.png');
    },
  },

  // --- Versioonid / ajalugu: liitvorm 95002004 (3 versiooni) ---
  {
    name: 'user-guide/vormide-ajalugu',
    run: async (page) => {
      await page.goto(`${BASE}/control-forms/compound/95002004`, { waitUntil: 'domcontentloaded' });
      await settle(page, 1200);
      await page.getByText(/Versioonid|Vormi versioonid|Muudatuste ajalugu/).first().scrollIntoViewIfNeeded().catch(() => {});
      await sleep(600);
      await shoot(page, 'user-guide/images/15-vormide-vaatamine-ajalugu/01-versioonid.png');
      const href = await page.locator('a[href*="/control-forms/compound/95002004/"]').first().getAttribute('href').catch(() => null);
      if (href) {
        await page.goto(BASE + href.replace(BASE, ''), { waitUntil: 'domcontentloaded' });
        await settle(page, 1000);
        await shoot(page, 'user-guide/images/15-vormide-vaatamine-ajalugu/02-varasem-versioon.png');
      }
    },
  },

  // --- Riskihindamine / auditilogi (seemneandmed olemas) ---
  { name: 'user-guide/riskihindamine', run: (p) => gotoShot(p, '/admin/risk-scores', 'user-guide/images/16-riskihindamine/01-riskitasemed.png') },
  {
    name: 'user-guide/auditilogi',
    run: async (page) => {
      await gotoShot(page, '/logs', 'user-guide/images/17-auditilogi/01-auditilogi-loend.png');
      const href = await firstRowHref(page, '/logs/');
      if (href) await gotoShot(page, href.replace(BASE, ''), 'user-guide/images/17-auditilogi/02-auditilogi-detail.png');
    },
  },

  // --- Administraatori juhend ---
  {
    name: 'admin-guide/kasutajad',
    run: async (page) => {
      await gotoShot(page, '/users', 'admin-guide/images/02-kasutajad/01-kasutajate-loend.png');
      await gotoShot(page, '/users/new', 'admin-guide/images/02-kasutajad/02-kasutaja-loomine.png');
      await page.goto(BASE + '/users', { waitUntil: 'domcontentloaded' });
      await settle(page);
      const href = await firstRowHref(page, '/users/');
      if (href && !href.endsWith('/new')) await gotoShot(page, href.replace(BASE, ''), 'admin-guide/images/02-kasutajad/03-kasutaja-detail.png');
    },
  },
  {
    name: 'admin-guide/kasutajagrupid',
    run: async (page) => {
      await gotoShot(page, '/user-groups', 'admin-guide/images/03-kasutajagrupid/01-gruppide-loend.png');
      const href = await firstRowHref(page, '/user-groups/');
      if (href && !href.endsWith('/new')) await gotoShot(page, href.replace(BASE, ''), 'admin-guide/images/03-kasutajagrupid/02-grupi-detail.png');
    },
  },
  {
    name: 'admin-guide/klassifikaatorid',
    run: async (page) => {
      await gotoShot(page, '/classifiers', 'admin-guide/images/04-klassifikaatorid/01-klassifikaatorite-loend.png');
      const href = await firstRowHref(page, '/classifiers/');
      if (href) {
        await gotoShot(page, href.replace(BASE, ''), 'admin-guide/images/04-klassifikaatorid/02-klassifikaatori-detail.png');
        await gotoShot(page, href.replace(BASE, '') + '/add-value', 'admin-guide/images/04-klassifikaatorid/03-vaartuse-lisamine.png');
      }
    },
  },
  { name: 'admin-guide/auditilogi', run: (p) => gotoShot(p, '/logs', 'admin-guide/images/05-auditilogi/01-auditilogi.png') },
  { name: 'admin-guide/riskihindamine', run: (p) => gotoShot(p, '/admin/risk-scores', 'admin-guide/images/06-riskihindamine-admin/01-riskitasemed.png') },
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'et-EE', deviceScaleFactor: 2 });
  await context.addInitScript(() => localStorage.setItem('i18nextLng', 'et'));

  console.log('Sisselogimine…');
  const page = await login(context);
  console.log('Sisse logitud.\n');

  for (const s of shots) {
    if (filter && !s.name.includes(filter)) continue;
    console.log('▶', s.name);
    try {
      await s.run(page);
    } catch (err) {
      console.error('  ✗', s.name, '-', err.message);
    }
  }

  await browser.close();
  console.log('\nValmis.');
})();
