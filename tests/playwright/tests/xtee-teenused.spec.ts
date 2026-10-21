import { APIRequestContext, request } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { INTERNAL_API_URL } from '../support/api';
import { uniquePersonalCode } from '../support/data';

/**
 * LJVIS2 pakutavad X-tee teenused (docs/xtee/00-xtee-teenused-publikatsiooni-juhend.md):
 *   1 IsikuKontroll, 2 IsikuEttevoteKontrollid, 3 ErakorralineYVquery,
 *   4 ErakorralineYVconfirm, 5 RegisterJobInspection, 6 RegisterJobInspection_v3,
 *   7–9 findUsage (AJ): /v2/findUsage, /v2/usagePeriod, /v2/heartbeat.
 *
 * Teenustel UI-d pole — testid kutsuvad sisemist Ruuterit (:9089) samamoodi
 * nagu X-tee turvaserver seda teeb (X-Road-Client päis). Igale teenusele:
 * ligipääsukontroll (puuduv/vale X-Road-Client → 403), sisendi valideerimine
 * (400) ja edukas päring (200 + vastuse kuju). Ulatuslikum juhtumite komplekt
 * on Newmani kollektsioonides xroad-provide-query / xroad-provide-write.
 */

const CLIENT = 'EE/GOV/70000310/ljvis-test';
const AJ_CLIENT = 'EE/GOV/70009317/eesti-ee';

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await request.newContext({ baseURL: INTERNAL_API_URL });
});
test.afterAll(async () => {
  await api.dispose();
});

async function post(path: string, body: unknown, client: string | null = CLIENT) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (client) headers['X-Road-Client'] = client;
  const res = await api.post(`/ljvis/xroad/provide/${path}`, { data: body, headers });
  const text = await res.text();
  return { status: res.status(), text, json: safeJson(text) };
}

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await api.get(`/ljvis/xroad/v2/${path}`, { headers: { 'X-Road-Client': AJ_CLIENT, ...headers } });
  const text = await res.text();
  return { status: res.status(), text, json: safeJson(text) };
}

function safeJson(text: string): any {
  try {
    const j = JSON.parse(text);
    if (j && typeof j === 'object' && 'response' in j) {
      // Ruuter võib vastuse keha anda ka JSON-stringina.
      return typeof j.response === 'string' ? JSON.parse(j.response) : j.response;
    }
    return j;
  } catch {
    return null;
  }
}

/** Ligipääsukontroll, mis on kõigil kuuel POST-teenusel ühesugune. */
async function expectAccessControl(path: string, body: unknown) {
  await test.step('puuduv X-Road-Client päis → 403', async () => {
    expect((await post(path, body, null)).status).toBe(403);
  });
  await test.step('vale kujuga X-Road-Client (3 osa) → 403', async () => {
    expect((await post(path, body, 'EE/GOV/ainult-kolm-osa')).status).toBe(403);
  });
}

test.describe('X-tee pakutavad teenused', () => {
  test('1. IsikuKontroll', async () => {
    const body = { isikukood: '39001010001' };
    await expectAccessControl('isiku-kontroll', body);
    await test.step('puuduv isikukood → 400', async () => {
      expect((await post('isiku-kontroll', {})).status).toBe(400);
    });
    await test.step('vale kujuga isikukood → 400', async () => {
      expect((await post('isiku-kontroll', { isikukood: '123' })).status).toBe(400);
    });
    await test.step('kehtiv päring → 200, vastuses kontrollid.item massiiv', async () => {
      const res = await post('isiku-kontroll', body);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.json?.kontrollid?.item)).toBeTruthy();
    });
  });

  test('2. IsikuEttevoteKontrollid', async () => {
    const body = { isikukood: '39001010001' };
    await expectAccessControl('isiku-ettevote-kontrollid', body);
    await test.step('vale kujuga isikukood → 400', async () => {
      expect((await post('isiku-ettevote-kontrollid', { isikukood: '123' })).status).toBe(400);
    });
    await test.step('kehtiv päring → 200, vastuses kontrollid.item massiiv', async () => {
      const res = await post('isiku-ettevote-kontrollid', body);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.json?.kontrollid?.item)).toBeTruthy();
    });
  });

  test('3. ErakorralineYVquery', async () => {
    const body = { alates: '2026-01-01', kuni: '2026-12-31' };
    await expectAccessControl('erakorraline-yv-query', body);
    await test.step('puuduv "alates" → 400', async () => {
      expect((await post('erakorraline-yv-query', { kuni: '2026-12-31' })).status).toBe(400);
    });
    await test.step('alates > kuni → 400', async () => {
      expect((await post('erakorraline-yv-query', { alates: '2026-12-31', kuni: '2026-01-01' })).status).toBe(400);
    });
    await test.step('kehtiv päring → 200, vastuses targeted_for_inspection.item massiiv', async () => {
      const res = await post('erakorraline-yv-query', body);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.json?.targeted_for_inspection?.item)).toBeTruthy();
    });
  });

  test('4. ErakorralineYVconfirm', async () => {
    const item = { inspection_id: '999999999', code: 'INSPECTION_DATE', value: '2026-07-01' };
    await expectAccessControl('erakorraline-yv-confirm', { confirmed: { item: [item] } });
    await test.step('tühi confirmed.item → 400', async () => {
      expect((await post('erakorraline-yv-confirm', { confirmed: { item: [] } })).status).toBe(400);
    });
    await test.step('lubamatu code väärtus → 400', async () => {
      const res = await post('erakorraline-yv-confirm', { confirmed: { item: [{ ...item, code: 'INVALID_CODE' }] } });
      expect(res.status).toBe(400);
    });
    await test.step('tundmatu inspection_id → 404', async () => {
      expect((await post('erakorraline-yv-confirm', { confirmed: { item: [item] } })).status).toBe(404);
    });
  });

  test('5. RegisterJobInspection (v1) — registreerimine ja idempotentsus', async () => {
    const body = {
      kontrollija: 'Playwright Inspektor',
      kontrolli_id: `PW-V1-${Date.now()}`,
      kontrolli_kp: '2026-06-15',
      tooandja_nimi: 'OÜ Playwright Test',
      tooandja_reg_kood: '12345678',
      soidukite_arv: '1',
      koostatatud_ettekirjutus: 'false',
      kontrollimised: { kontrollitud_soitjate_veol: true, kontrollitud_kaubaveol: false },
      rikkumised: {},
      vaarteomenetlus: '',
    };
    await expectAccessControl('register-job-inspection', body);
    await test.step('vale kontrolli_kp → 400', async () => {
      expect((await post('register-job-inspection', { ...body, kontrolli_kp: 'EI_OLE_KUUPAEV' })).status).toBe(400);
    });
    await test.step('kõik kohustuslikud väljad → 200', async () => {
      expect((await post('register-job-inspection', body)).status).toBe(200);
    });
    await test.step('korduspäring sama kontrolli_id-ga → 200 (idempotentne)', async () => {
      expect((await post('register-job-inspection', body)).status).toBe(200);
    });
    // V1 kasutab vana fikseeritud nimega RikkumisteArvud tüüpi (vt ljvis.wsdl) — toores
    // passthrough, koodi-vastendust (UNKNOWN_VIOLATION_CODE) ei rakendata siin.
  });

  test('6. RegisterJobInspection_v3 — v3 väljad ja valideerimine', async () => {
    const body = {
      kontrollija: 'Playwright Inspektor',
      kontrolli_id: `PW-V3-${Date.now()}`,
      kontrolli_kp: '2026-06-15',
      tooandja_nimi: 'OÜ Playwright Test',
      tooandja_reg_kood: '12345678',
      soidukite_arv: '1',
      koostatatud_ettekirjutus: 'true',
      kontrollimised: { kontrollitud_soitjate_veol: false, kontrollitud_kaubaveol: true },
      rikkumised: {},
      vaarteomenetlus: '',
      soiduki_reg_nr: '123ABC',
      soiduki_vin: 'WBA12345678901234',
      juhi_isikukood: '39001010001',
      juhi_eesnimi: 'Jaan',
      juhi_perekonnanimi: 'Tamm',
      menetluse_liik: 'kiirmenetlus',
      menetluse_number: 'M-2026-PW-001',
    };
    await expectAccessControl('register-job-inspection-v3', body);
    await test.step('vale juhi_isikukood → 400', async () => {
      expect((await post('register-job-inspection-v3', { ...body, juhi_isikukood: '123' })).status).toBe(400);
    });
    await test.step('vale menetluse_liik → 400', async () => {
      expect((await post('register-job-inspection-v3', { ...body, menetluse_liik: 'tundmatu' })).status).toBe(400);
    });
    await test.step('kõik v3 väljad → 200', async () => {
      expect((await post('register-job-inspection-v3', body)).status).toBe(200);
    });
    await test.step('tundmatu rikkumiskood → 400 UNKNOWN_VIOLATION_CODE', async () => {
      const res = await post('register-job-inspection-v3', {
        ...body,
        kontrolli_id: `PW-V3-BADCODE-${Date.now()}`,
        rikkumised: { rikkumiste_arv: [{ rikkumise_kood: 'ZZ99' }] },
      });
      expect(res.status).toBe(400);
      expect(res.json?.error).toBe('UNKNOWN_VIOLATION_CODE');
      expect(res.json?.codes).toContain('ZZ99');
    });
    await test.step('tuntud rikkumiskoodid (E5, B1) → 200, violations vastendatud', async () => {
      const res = await post('register-job-inspection-v3', {
        ...body,
        kontrolli_id: `PW-V3-GOODCODE-${Date.now()}`,
        rikkumised: { rikkumiste_arv: [{ rikkumise_kood: 'E5', arv: 2 }, { rikkumise_kood: 'B1' }] },
      });
      expect(res.status).toBe(200);
    });
  });

  test('7–9. findUsage (Andmejälgija): heartbeat, usagePeriod, findUsage', async () => {
    await test.step('/v2/heartbeat → 200, status OK', async () => {
      const res = await get('heartbeat');
      expect(res.status).toBe(200);
      expect(res.json?.status).toBe('OK');
    });
    await test.step('/v2/usagePeriod → 200, periodStart on RFC 3339 aeg', async () => {
      const res = await get('usagePeriod');
      expect(res.status).toBe(200);
      expect(String(res.json?.periodStart)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
    await test.step('/v2/findUsage ilma X-Road-UserId päiseta → 400', async () => {
      expect((await get('findUsage?userCode=EE39001010001')).status).toBe(400);
    });
    await test.step('/v2/findUsage ilma userCode-ta → 400', async () => {
      expect((await get('findUsage', { 'X-Road-UserId': 'EE39001010001' })).status).toBe(400);
    });
    await test.step('/v2/findUsage vale limit → 400', async () => {
      const res = await get('findUsage?userCode=EE39001010001&limit=0', { 'X-Road-UserId': 'EE39001010001' });
      expect(res.status).toBe(400);
    });
    await test.step('/v2/findUsage kehtiv päring → 200, totalUsages + usages[]', async () => {
      const code = uniquePersonalCode();
      const res = await get(`findUsage?userCode=EE${code}&offset=0&limit=10`, { 'X-Road-UserId': `EE${code}` });
      expect(res.status).toBe(200);
      expect(typeof res.json?.totalUsages).toBe('number');
      expect(Array.isArray(res.json?.usages)).toBeTruthy();
    });
  });
});
