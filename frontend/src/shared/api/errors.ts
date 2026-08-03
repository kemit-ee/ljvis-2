import { ApiError } from './client';

export class ValidationError {
  readonly type = 'VALIDATION_ERROR' as const;
  readonly field: string | null;
  readonly code: string;

  constructor(field: string | null, code: string) {
    this.field = field;
    this.code = code;
  }

  static from(body: unknown): ValidationError | null {
    if (typeof body !== 'object' || body === null) return null;
    const b = body as Record<string, unknown>;
    if (b['type'] !== 'VALIDATION_ERROR' || typeof b['code'] !== 'string')
      return null;
    const field = typeof b['field'] === 'string' ? b['field'] : null;
    return new ValidationError(field, b['code']);
  }
}

export function applyValidationError(
  e: unknown,
  setFieldError: (field: string, message: string) => void,
  translate: (code: string) => string,
  setFormError?: (message: string) => void,
): boolean {
  if (!(e instanceof ApiError) || e.status !== 422) return false;
  const apiError = e as ApiError;
  const ve = ValidationError.from(apiError.body);
  if (!ve) return false;
  if (ve.field) {
    setFieldError(ve.field, translate(ve.code));
  } else if (setFormError) {
    setFormError(translate(ve.code));
  }
  return true;
}
