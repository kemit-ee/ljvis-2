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
