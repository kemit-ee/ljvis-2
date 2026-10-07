const BASE = '/api';

interface RuuterResponse<T> {
  response: T;
}

function unwrapResponse<T>(json: RuuterResponse<T> | null): T {
  const response = json!.response;

  // DMapper renders Handlebars templates as text. Depending on the deployed
  // Ruuter/DataMapper combination that JSON text may reach the gateway as the
  // value of `response` instead of an already parsed object. Normalise both
  // wire formats here so forms do not lose nested arrays when they are loaded
  // and saved again.
  if (typeof response === 'string') {
    try {
      return JSON.parse(response) as T;
    } catch {
      // Plain-string endpoints are valid too (for example access decisions).
    }
  }

  return response;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * The most recent failed GET. A page that cannot render its form uses it to tell the user WHY
 * (no permission vs. not found) instead of a bare "Tekkis viga" — the hooks that load the form
 * swallow the ApiError, so the status would otherwise be lost.
 */
export interface LoadFailure {
  status: number;
  path: string;
  at: number;
}

let lastLoadFailure: LoadFailure | null = null;

export function getLastLoadFailure(): LoadFailure | null {
  return lastLoadFailure;
}

export function clearLastLoadFailure(): void {
  lastLoadFailure = null;
}

type ErrorListener = (err: ApiError) => void;
type VoidCallback = () => void;

let globalErrorListener: ErrorListener | undefined;
let unauthorizedHandler: VoidCallback | undefined;

export function setGlobalErrorListener(fn: ErrorListener | undefined): void {
  globalErrorListener = fn;
}

export function setUnauthorizedHandler(fn: VoidCallback | undefined): void {
  unauthorizedHandler = fn;
}

function handleErrorResponse(err: ApiError): void {
  if (err.status === 401) {
    unauthorizedHandler?.();
  } else {
    globalErrorListener?.(err);
  }
}

export async function get<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'undefined')
        url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), { credentials: 'include' });
  const json = (await res.json().catch(() => null)) as RuuterResponse<T> | null;
  if (!res.ok) {
    lastLoadFailure = { status: res.status, path, at: Date.now() };
    const err = new ApiError(
      `GET ${path} failed: ${res.status}`,
      res.status,
      json?.response,
    );
    handleErrorResponse(err);
    throw err;
  }
  return unwrapResponse(json);
}

// Ruuter's declaration.allowlist.body check requires every declared field
// to be *present* as a key in the JSON body (Rust Ruuter's `contains_key`
// check — see DEBUG_NOTES.md). `JSON.stringify` silently drops object keys
// whose value is `undefined` (e.g. `form?.id` on a new, unsaved form), which
// makes a legitimate "create" request fail with "Field missing: <field>".
// Serialize with a replacer that turns `undefined` into `null` so the key
// always survives — `null` is what the DSLs already treat as "no value /
// new record" (e.g. the `id == null` branch that routes to insert).
function stringifyBody(body: Record<string, unknown>): string {
  return JSON.stringify(body, (_key, value) =>
    value === undefined ? null : value,
  );
}

export async function post<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: stringifyBody(body),
  });
  const json = (await res.json().catch(() => null)) as RuuterResponse<T> | null;
  if (!res.ok) {
    const err = new ApiError(
      `POST ${path} failed: ${res.status}`,
      res.status,
      json?.response,
    );
    handleErrorResponse(err);
    throw err;
  }
  return unwrapResponse(json);
}

export async function postSilent<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: stringifyBody(body),
  });
  const json = (await res.json().catch(() => null)) as RuuterResponse<T> | null;
  if (!res.ok) {
    throw new ApiError(
      `POST ${path} failed: ${res.status}`,
      res.status,
      json?.response,
    );
  }
  return unwrapResponse(json);
}

export async function put<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: stringifyBody(body),
  });
  const json = (await res.json().catch(() => null)) as RuuterResponse<T> | null;
  if (!res.ok) {
    const err = new ApiError(
      `PUT ${path} failed: ${res.status}`,
      res.status,
      json?.response,
    );
    handleErrorResponse(err);
    throw err;
  }
  return unwrapResponse(json);
}

export async function del<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'undefined')
        url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = (await res.json().catch(() => null)) as RuuterResponse<T> | null;
  if (!res.ok) {
    const err = new ApiError(
      `DELETE ${path} failed: ${res.status}`,
      res.status,
      json?.response,
    );
    handleErrorResponse(err);
    throw err;
  }
  return unwrapResponse(json);
}
