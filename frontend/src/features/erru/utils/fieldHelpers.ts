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
