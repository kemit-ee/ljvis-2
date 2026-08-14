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

/** tedi expects `helper` as an object, not a bare string. */
export function fieldError(
  formik: { touched: Record<string, unknown>; errors: Record<string, unknown> },
  field: string,
) {
  const touched = formik.touched[field];
  const error = formik.errors[field];
  return touched && error ? { helper: { text: String(error), type: 'error' as const } } : {};
}
