import { APIRequestContext, request } from '@playwright/test';
import { API_URL, STORAGE_STATE } from '../playwright.config';
import { readToken } from './auth';

/**
 * Otse-API abifunktsioonid — kasutatakse eeltingimuste loomiseks (nt
 * alamvormi jaoks vajalik parent-koondvorm), et testid ei peaks iga korda
 * UI kaudu koondvormi looma.
 */

async function ctx(role: keyof typeof STORAGE_STATE = 'superadmin'): Promise<{
  api: APIRequestContext;
  cookie: string;
}> {
  const token = await readToken(STORAGE_STATE[role]);
  const api = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Cookie: `customJwtCookie=${token}` },
  });
  return { api, cookie: `customJwtCookie=${token}` };
}

/** Ruuteri vastus on {"response": <payload>}; koori see maha. */
function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'response' in body) {
    return (body as { response: T }).response;
  }
  return body as T;
}

const COMPOUND_SAVE_DEFAULTS: Record<string, string> = {
  id: '',
  formNumber: '',
  status: 'saved',
  controlDate: '2026-02-01',
  controlTime: '09:30',
  controlCountryCode: 'EE',
  county: '',
  city: 'Tallinn',
  road: '',
  roadOther: '',
  kilometer: '',
  address: 'Testi tee 1',
  road_type: '',
  roadTaxStatus: '',
  roadTaxNotes: '',
  vehicleRegNr: 'PW0001',
  vehicleMake: '',
  vehicleModel: '',
  vehicleCountryCode: 'EE',
  vehicleVin: '',
  vehicleFirstRegistration: '',
  vehicleBodyType: '',
  vehicleCategoryCode: '',
  vehicleCategoryOther: '',
  vehicleMileage: '',
  trailers: '[]',
  companyRegCode: '',
  companyName: '',
  companyCountryCode: '',
  companyCounty: '',
  companyCity: '',
  companyAddressLine1: '',
  companyPostalCode: '',
  companyOwnerFirstName: '',
  companyOwnerLastName: '',
  companyActivityLicenceCopyNumber: '',
  drivers: '[]',
  inspectorFirstName: 'PW',
  inspectorLastName: 'Test',
  inspectorOrganisationId: 'PPA',
  inspectorUnit: 'PW',
  inspectorProfession: 'Inspektor',
  driver1PersonalCodeEe: '',
  driver1PersonalCodeForeign: '',
  driver2PersonalCodeEe: '',
  driver2PersonalCodeForeign: '',
};

export interface CreatedForm {
  id: number;
  formNumber?: string;
}

/**
 * Loob salvestatud (status=saved) koondvormi otse API kaudu ja tagastab selle
 * võtme. Kasutatakse alamvormi-testide eeltingimusena.
 */
export async function createCompoundForm(
  overrides: Record<string, string> = {},
): Promise<CreatedForm> {
  const { api } = await ctx('superadmin');
  const res = await api.post('/ljvis/v1/control-forms/compound-form/edit/save', {
    data: { ...COMPOUND_SAVE_DEFAULTS, vehicleRegNr: `PW${Date.now() % 100000}`, ...overrides },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) {
    throw new Error(
      `createCompoundForm ebaõnnestus: ${res.status()} ${await res.text()}`,
    );
  }
  const rows = unwrap<Array<{ id: number; formNumber?: string }>>(await res.json());
  await api.dispose();
  const row = Array.isArray(rows) ? rows[0] : (rows as { id: number });
  if (!row?.id) throw new Error(`createCompoundForm: vastuses puudub id: ${JSON.stringify(rows)}`);
  return { id: row.id, formNumber: row.formNumber };
}

/** Kustutab koondvormi (koos alamvormidega) — testide järelkoristus, best-effort. */
export async function deleteCompoundForm(id: number): Promise<void> {
  try {
    const { api } = await ctx('superadmin');
    await api.post('/ljvis/v1/control-forms/compound-form/edit/delete', {
      data: { id: String(id), formNumber: '', status: 'saved' },
      headers: { 'Content-Type': 'application/json' },
    });
    await api.dispose();
  } catch {
    /* best-effort */
  }
}

/** Kontrollib, kas antud endpoint on pinus üldse olemas (nt ERRU send). */
export async function endpointExists(path: string): Promise<boolean> {
  const api = await request.newContext({ baseURL: API_URL });
  const res = await api.fetch(path, { method: 'OPTIONS' }).catch(() => null);
  await api.dispose();
  return !!res && res.status() !== 404;
}

// ── Haldusmoodulite eeltingimused ──────────────────────────────────────────
// Samad sisemised teed, mida Newmani kollektsioonid kasutavad seemneteks:
// Resql (:9087) ja sisemine Ruuter (:9089) on CI-pinus avatud ainult
// localhost'is ega ole avaliku gateway kaudu kättesaadavad.

export const RESQL_URL = process.env.LJVIS_RESQL_URL || 'http://localhost:9087';
export const INTERNAL_API_URL = process.env.LJVIS_INTERNAL_API_URL || 'http://localhost:9089';
// Sisemise Ruuteri teenusetoken (constants.ini: INTERNAL_COMMUNICATION_KEY); xroad/* teed seda ei vaja.
export const INTERNAL_COMMUNICATION_KEY = process.env.LJVIS_INTERNAL_COMMUNICATION_KEY || 'dev-internal-service-token';

async function postJson<T>(baseURL: string, path: string, data: unknown): Promise<T> {
  const api = await request.newContext({ baseURL });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (baseURL === INTERNAL_API_URL) headers['x-internal-service-token'] = INTERNAL_COMMUNICATION_KEY;
  const res = await api.post(path, { data, headers });
  const text = await res.text();
  await api.dispose();
  if (!res.ok()) throw new Error(`POST ${baseURL}${path} → ${res.status()} ${text}`);
  return unwrap<T>(text ? JSON.parse(text) : {});
}

/** Arvutab ettevõtte riskiskoori ümber (riskitasemete nimekiri täitub alles pärast seda). */
export async function recalculateRiskScore(companyRegCode: string): Promise<void> {
  await postJson(INTERNAL_API_URL, '/ljvis/risk-scores/recalculate', {
    company_reg_code: companyRegCode,
    calculation_trigger: 'admin',
  });
}

/** Lisab rakendusesisese teavituse (idempotentne related_entity_id järgi). */
export async function seedInAppNotification(opts: {
  relatedEntityId: string;
  title: string;
  requiredPermission?: string;
  type?: string;
  relatedEntityType?: string;
}): Promise<void> {
  await postJson(RESQL_URL, '/ljvis/notification/insert_notification', {
    type: opts.type ?? 'ncr_violation',
    required_permission: opts.requiredPermission ?? 'notification.list',
    related_entity_type: opts.relatedEntityType ?? 'ncr',
    related_entity_id: opts.relatedEntityId,
    title_et: opts.title,
    body_et: `${opts.title} — sisu`,
    created_by: 'playwright',
  });
}

/** Lisab väljuva kirja logirea (vaikimisi staatus "error") koos saajaga. */
export async function seedOutboundLog(opts: {
  notificationKey: string;
  recipient: string;
  status?: string;
}): Promise<string> {
  const rows = await postJson<Array<{ id: string }> | { id: string }>(
    RESQL_URL,
    '/ljvis/notification/insert_outbound_log',
    {
      notification_key: opts.notificationKey,
      message_type: 'carrier_violation',
      status: opts.status ?? 'error',
      recipient_address: opts.recipient,
      notification_language: 'et',
      template_variables: '{}',
      failure_reason: 'Playwright seeded failure',
      related_entity_type: 'ncr',
      related_entity_id: opts.notificationKey,
      original_log_id: '',
      pk_template_id: 'tmpl-pw',
      pk_sending_operation_id: `op-${opts.notificationKey}`,
      payload_json: '{}',
      created_by: 'playwright',
    },
  );
  const id = String((Array.isArray(rows) ? rows[0] : rows).id);
  await postJson(RESQL_URL, '/ljvis/notification/insert_outbound_recipient', {
    log_id: id,
    person_email: opts.recipient,
    person_name: 'Playwright Saaja',
    person_code: '12345678',
    sending_report: 'ok',
  });
  return id;
}

/** Organisatsiooni id lühikoodi järgi (nt "JUM", "PPA"). */
export async function organisationId(code: string): Promise<string> {
  const rows = await postJson<Array<Record<string, unknown>>>(
    RESQL_URL,
    '/ljvis/organisation/list_organisations',
    {},
  );
  const row = rows.find((r) => Object.values(r).includes(code));
  if (!row) throw new Error(`Organisatsiooni ${code} ei leitud`);
  return String(row.id ?? row.organisationId ?? row.organisation_id);
}

/** Lisab auditisündmuse (description sisaldab otsitavat markerit). */
export async function seedAuditEvent(description: string, organisation = ''): Promise<void> {
  await postJson(RESQL_URL, '/ljvis/log/insert_audit_event', {
    event_id: '',
    event_type: 'test.audit.playwright',
    event_category: 'system_process',
    actor_name: 'Playwright Audit Seeder',
    actor_personal_code: '',
    description,
    log_content: '{}',
    organisation_id: organisation,
    created_by: 'playwright',
    trace_id: '',
    span_id: '',
  });
}

/** GET autenditud rollina (API-ainult kontrollid, nt auditiahela verify). */
export async function apiGet(
  role: keyof typeof STORAGE_STATE,
  path: string,
): Promise<{ status: number; body: unknown }> {
  const { api } = await ctx(role);
  const res = await api.get(path);
  const text = await res.text();
  await api.dispose();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* mitte-JSON */
  }
  return { status: res.status(), body };
}
