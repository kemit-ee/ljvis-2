/**
 * tedi <-> formik glue repeated across every *RequestFields/*ResponseFields/*MessageFields
 * component: turning a classifier's {code, name}[] into Select options, resolving the
 * currently selected option, reading a value back out of a Select's onChange, and
 * parsing an ISO date string into the Date the tedi DateField expects.
 */

export interface ClassifierOption {
  code: string;
  name: string;
}

export const classifierOptions = (list: ClassifierOption[]) =>
  list.map((c) => ({ value: c.code, label: c.name }));

/** tedi Select works with option objects, not raw code strings. */
export const selectedClassifierOption = (list: ClassifierOption[], code: string) =>
  classifierOptions(list).find((o) => o.value === code) ?? null;

export const pickOptionValue = (o: unknown) => (o as { value?: string } | null)?.value ?? '';

export const parseIsoDate = (v?: string) => (v ? new Date(v) : undefined);

type FormikLike = { touched: Record<string, unknown>; errors: Record<string, unknown>; submitCount: number };

const getError = (formik: FormikLike, field: string): string | null => {
  const error = formik.errors[field];
  const showError = (!!formik.touched[field] || formik.submitCount > 0) && !!error;
  return showError ? String(error) : null;
};

export function fieldError(formik: FormikLike, field: string) {
  const error = getError(formik, field);
  return error ? { helper: { text: error, type: 'error' as const } } : {};
}

export function dateFieldError(formik: FormikLike, field: string) {
  const error = getError(formik, field);
  return error ? { inputProps: { helper: { text: error, type: 'error' as const } } } : {};
}

/**
 * Like fieldError but for a single item inside a Formik array field.
 * Formik stores array validation errors as errors[arrayField][index][subField].
 * Works for Select/TextField (returns helper prop object).
 */
export function nestedFieldError(formik: FormikLike, arrayField: string, index: number, subField: string) {
  const arrayErrors = formik.errors[arrayField] as (Record<string, string> | null | undefined)[] | string | undefined;
  const arrayTouched = formik.touched[arrayField] as (Record<string, boolean | undefined> | null | undefined)[] | undefined;
  if (!Array.isArray(arrayErrors)) return {};
  const error = arrayErrors[index]?.[subField];
  const touched = Array.isArray(arrayTouched) ? arrayTouched[index]?.[subField] : undefined;
  const showError = (!!touched || formik.submitCount > 0) && !!error;
  return showError ? { helper: { text: String(error), type: 'error' as const } } : {};
}

/**
 * Like dateFieldError but for a single item inside a Formik array field.
 * Works for DateField (returns inputProps.helper prop object).
 */
export function nestedDateFieldError(formik: FormikLike, arrayField: string, index: number, subField: string) {
  const arrayErrors = formik.errors[arrayField] as (Record<string, string> | null | undefined)[] | string | undefined;
  const arrayTouched = formik.touched[arrayField] as (Record<string, boolean | undefined> | null | undefined)[] | undefined;
  if (!Array.isArray(arrayErrors)) return {};
  const error = arrayErrors[index]?.[subField];
  const touched = Array.isArray(arrayTouched) ? arrayTouched[index]?.[subField] : undefined;
  const showError = (!!touched || formik.submitCount > 0) && !!error;
  return showError ? { inputProps: { helper: { text: String(error), type: 'error' as const } } } : {};
}
