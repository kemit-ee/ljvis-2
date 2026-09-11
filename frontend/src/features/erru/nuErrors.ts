import { ApiError } from '../../shared/api/client';

// Ruuter errors, like successful NU responses, may contain serialized JSON.
export function nuErrorDetails(error: unknown): {
  code?: string;
  field?: string;
} {
  if (!(error instanceof ApiError)) return {};
  let body = error.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (!body || typeof body !== 'object') return {};
  const value = body as Record<string, unknown>;
  return {
    code: typeof value.code === 'string' ? value.code : undefined,
    field: typeof value.field === 'string' ? value.field : undefined,
  };
}

const codes = new Set([
  'required',
  'invalid_value',
  'invalid_date',
  'invalid_country_code',
  'max_length_exceeded',
  'source_exceeds_erru_limit',
  'not_editable',
  'not_sendable',
  'source_not_eligible',
  'source_not_found',
  'not_found',
  'send_failed',
  'nysiis_unavailable',
]);
const sourceFields = new Set([
  'tmFirstName',
  'tmFamilyName',
  'tmDateOfBirth',
  'certificateIssueDate',
  'tmPlaceOfBirth',
  'certificateNumber',
  'certificateIssueCountry',
]);

export function nuErrorMessage(
  error: unknown,
  t: (key: string) => string,
  fallback = 'common.errors.unexpected',
  sourceLookup = false,
): string {
  const { code, field } = nuErrorDetails(error);
  if (!code || !codes.has(code)) return t(fallback);
  const key = sourceLookup && code === 'not_found' ? 'source_not_found' : code;
  const message = t(`erru.nu.validation.${key}`);
  return field && sourceFields.has(field)
    ? `${t(`erru.nu.form.${field}`)}: ${message}`
    : message;
}
