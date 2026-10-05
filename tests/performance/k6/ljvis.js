// LJVIS2 jõudlus- ja koormustestid (k6).
//
//   SCENARIO=smoke|load|stress|spike|soak  (vaikimisi load)
//   BASE_URL=http://localhost:9086
//   SEED_FORMS=50          koondvormide arv, mis setup() loob enne testi
//   VUS_SCALE=1            korrutab virtuaalkasutajate arvu (nt 2 = kahekordne koormus)
//
// Sihid (p95 aeg ja vigade osakaal) on thresholds-plokis ja dokumenteeritud failis
// docs/testimine/joudlustestid.md.
import { sleep, check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { login, get, post, unwrap } from './lib.js';

const SCENARIO = __ENV.SCENARIO || 'load';
const SEED_FORMS = parseInt(__ENV.SEED_FORMS || '50', 10);
const SCALE = parseFloat(__ENV.VUS_SCALE || '1');
const v = (n) => Math.max(1, Math.round(n * SCALE));

const formTemplate = JSON.parse(open('../fixtures/compound-form-save.json'));

const readTrend = new Trend('ljvis_read_duration', true);
const writeTrend = new Trend('ljvis_write_duration', true);
const businessErrors = new Counter('ljvis_business_errors');

const PROFILES = {
  smoke: { read: { executor: 'constant-vus', vus: 1, duration: '30s', exec: 'readFlow' } },
  load: {
    read: {
      executor: 'ramping-vus', exec: 'readFlow', startVUs: 0,
      stages: [
        { duration: '2m', target: v(40) }, { duration: '10m', target: v(40) }, { duration: '1m', target: 0 },
      ],
    },
    write: {
      executor: 'ramping-vus', exec: 'writeFlow', startVUs: 0,
      stages: [
        { duration: '2m', target: v(10) }, { duration: '10m', target: v(10) }, { duration: '1m', target: 0 },
      ],
    },
  },
  stress: {
    read: {
      executor: 'ramping-vus', exec: 'readFlow', startVUs: 0,
      stages: [
        { duration: '2m', target: v(50) }, { duration: '3m', target: v(100) },
        { duration: '3m', target: v(200) }, { duration: '3m', target: v(300) }, { duration: '2m', target: 0 },
      ],
    },
    write: {
      executor: 'ramping-vus', exec: 'writeFlow', startVUs: 0,
      stages: [
        { duration: '2m', target: v(10) }, { duration: '3m', target: v(25) },
        { duration: '3m', target: v(50) }, { duration: '3m', target: v(75) }, { duration: '2m', target: 0 },
      ],
    },
  },
  spike: {
    read: {
      executor: 'ramping-vus', exec: 'readFlow', startVUs: 0,
      stages: [
        { duration: '1m', target: v(10) }, { duration: '30s', target: v(200) },
        { duration: '2m', target: v(200) }, { duration: '30s', target: v(10) }, { duration: '2m', target: v(10) },
        { duration: '30s', target: 0 },
      ],
    },
  },
  soak: {
    read: { executor: 'constant-vus', exec: 'readFlow', vus: v(20), duration: '2h' },
    write: { executor: 'constant-vus', exec: 'writeFlow', vus: v(5), duration: '2h' },
  },
};

export const options = {
  scenarios: PROFILES[SCENARIO],
  thresholds: {
    // Sihid (ettepanek, kinnitada Tellijaga): lugemine p95 < 800 ms, kirjutamine p95 < 1500 ms,
    // vigu < 1%.
    http_req_failed: ['rate<0.01'],
    ljvis_read_duration: ['p(95)<800', 'p(99)<2000'],
    ljvis_write_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const headers = login();
  const created = [];
  for (let i = 0; i < SEED_FORMS; i++) {
    const body = { ...formTemplate, vehicleRegNr: `PERF${String(i).padStart(4, '0')}`, status: 'saved' };
    const res = post('/ljvis/v1/control-forms/compound-form/edit/save', body, headers, 'seed_compound_save');
    const row = unwrap(res);
    const r = Array.isArray(row) ? row[0] : row;
    if (res.status === 200 && r && r.id) created.push(r.id);
  }
  return { seeded: created.length };
}

// Tüüpiline ametniku lugemisvoog: töölaud -> otsing -> klassifikaatorid -> teavitused.
export function readFlow() {
  const h = login();
  const steps = [
    ['/ljvis/v1/dashboard/summary', 'dashboard_summary'],
    ['/ljvis/v1/classifiers/bundle', 'classifiers_bundle'],
    ['/ljvis/v1/control-forms/search/list?formType=compound-form', 'search_list'],
    ['/ljvis/v1/control-forms/search/list?formType=compound-form&vehicleRegNr=PERF0001', 'search_by_regnr'],
    ['/ljvis/v1/notifications/list', 'notifications_list'],
    ['/ljvis/v1/notifications/unread-count', 'notifications_unread'],
    ['/ljvis/v1/admin/risk-scores/list', 'risk_scores_list'],
  ];
  for (const [path, name] of steps) {
    const res = get(path, h, name);
    readTrend.add(res.timings.duration);
    const ok = check(res, { [`${name} 200`]: (r) => r.status === 200 });
    if (!ok) businessErrors.add(1);
    sleep(1 + Math.random() * 2);
  }
}

// Kirjutusvoog: koondvormi salvestamine, avamine uuesti.
export function writeFlow() {
  const h = login();
  const body = { ...formTemplate, vehicleRegNr: `W${__VU}${__ITER}`.slice(0, 10), status: 'saved' };
  const res = post('/ljvis/v1/control-forms/compound-form/edit/save', body, h, 'compound_save');
  writeTrend.add(res.timings.duration);
  const ok = check(res, { 'compound_save 200': (r) => r.status === 200 });
  if (!ok) businessErrors.add(1);
  sleep(2 + Math.random() * 3);
}

export function handleSummary(data) {
  const out = __ENV.SUMMARY_FILE || `tulemus/${SCENARIO}.json`;
  return { [out]: JSON.stringify(data, null, 2), stdout: textLine(data) };
}

function textLine(data) {
  const m = data.metrics;
  const p = (k, s) => (m[k] && m[k].values && m[k].values[s] !== undefined ? m[k].values[s].toFixed(0) : 'n/a');
  return `\n[${SCENARIO}] p95 lugemine=${p('ljvis_read_duration', 'p(95)')} ms, p95 kirjutamine=${p('ljvis_write_duration', 'p(95)')} ms, ` +
    `vigu=${m.http_req_failed ? (m.http_req_failed.values.rate * 100).toFixed(2) : 'n/a'}%\n`;
}
