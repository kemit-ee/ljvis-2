import type { TFunction } from 'i18next';
import type { Trailer, CompoundForm } from '../types';

export function resolveCompoundTrailersList(
  formikTrailers: unknown,
  compoundForm: CompoundForm | null | undefined,
): Trailer[] {
  if (Array.isArray(formikTrailers) && (formikTrailers as Trailer[]).length > 0)
    return formikTrailers as Trailer[];
  if (Array.isArray(compoundForm?.trailers))
    return compoundForm.trailers as Trailer[];
  if (typeof compoundForm?.trailers === 'string')
    return JSON.parse(compoundForm.trailers) as Trailer[];
  return [];
}

export function buildTabLabels(
  trailersList: Trailer[],
  t: TFunction,
  compoundTabLabel?: string,
): Record<string, string> {
  const trailerTabDynamicLabels: Record<string, string> = {};
  trailersList.forEach((tr, idx) => {
    trailerTabDynamicLabels[`tab-trailer-technical-check-${idx}`] = tr.regNr
      ? `${t('forms.technical_check.trailerTitle')} (${tr.regNr})`
      : t('forms.technical_check.trailerTitle');
  });
  return {
    'tab-compound': compoundTabLabel ?? t('forms.compound_form'),
    'tab-driver': t('forms.sp_driver_form'),
    'tab-teammate': t('forms.sp_teammate_form'),
    'tab-vehicle-technical-check': t('forms.technical_check.vehicleTitle'),
    'tab-adr': t('forms.adr.title'),
    'tab-transport-interruption': t('forms.transport_interruption.title'),
    ...trailerTabDynamicLabels,
  };
}
