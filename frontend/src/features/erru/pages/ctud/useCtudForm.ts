import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createCtudRequest, sendCtudRequest, updateCtudRequest } from '../../api';
import type { CtudRequest, CtudRequestWrite } from '../../types';
import { ApiError } from '../../../../shared/api/client';
import { ValidationError, applyValidationError } from '../../../../shared/api/errors';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';

const T = 'erru.ctud.validation';

/**
 * Draft form for an outgoing CTUD request. The Yup schema mirrors
 * TEMPLATES/erru/ctud/validate-ctud-request.yml and the erru.ctud_request CHECK
 * constraints; the backend remains authoritative and its error codes are mapped back
 * onto fields by applyValidationError.
 */
export function useCtudForm(
  request: CtudRequest | undefined,
  onSaved: (id?: string) => void,
  { sendAfterCreate = false }: { sendAfterCreate?: boolean } = {},
) {
  const { t } = useTranslation();
  const isEdit = !!request;
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode } = useClassifiers();

  const countries = useMemo(() => getByCode('COUNTRY').filter((c) => c.isValid !== false), [getByCode]);
  const authorities = useMemo(() => getByCode('COMPETENT_AUTHORITY').filter((c) => c.isValid !== false), [getByCode]);
  const requestSources = useMemo(() => getByCode('CTUD_REQUEST_SOURCE').filter((c) => c.isValid !== false), [getByCode]);
  const requestPurposes = useMemo(() => getByCode('CTUD_REQUEST_PURPOSE').filter((c) => c.isValid !== false), [getByCode]);

  const required = t(`${T}.required`);

  const validationSchema = Yup.object({
    ctudTo: Yup.string().required(required).length(2, t(`${T}.invalid_country_code`)),
    originatingAuthority: Yup.string().max(50, t(`${T}.max_length_exceeded`)),
    transportUndertakingName: Yup.string()
      .max(150, t(`${T}.max_length_exceeded`))
      // ERRU forbids the literal placeholder "unknown"
      .test(
        'not-unknown',
        t(`${T}.unknown_not_allowed`),
        (v) => !v || v.trim().toLowerCase() !== 'unknown',
      ),
    communityLicenceNumber: Yup.string().max(20, t(`${T}.max_length_exceeded`)),
    vehicleRegistrationNumber: Yup.string().max(20, t(`${T}.max_length_exceeded`)),
    // Registration country becomes mandatory once a registration number is given.
    vehicleRegistrationCountry: Yup.string().when('vehicleRegistrationNumber', {
      is: (v: string) => !!v && v.trim() !== '',
      then: (s) => s.required(required).length(2, t(`${T}.invalid_country_code`)),
      otherwise: (s) => s.notRequired(),
    }),
  });

  // At least two of the three search criteria (LJVIS2-143 §4) — a form-wide rule, not
  // tied to any single field, so it is checked at submit time and surfaced through the
  // shared formError Alert instead of an inline field error under transportUndertakingName.
  const hasMinTwoSearchCriteria = (values: {
    transportUndertakingName: string;
    communityLicenceNumber: string;
    vehicleRegistrationNumber: string;
  }) =>
    [values.transportUndertakingName, values.communityLicenceNumber, values.vehicleRegistrationNumber].filter(
      (v) => !!v && v.trim() !== '',
    ).length >= 2;

  const formik = useFormik<CtudRequestWrite>({
    enableReinitialize: true,
    initialValues: {
      ctudTo: request?.ctudTo ?? '',
      originatingAuthority: request?.originatingAuthority ?? 'EE-PPA',
      requestSource: request?.requestSource ?? 'CA',
      requestPurpose: request?.requestPurpose ?? 'Control',
      transportUndertakingName: request?.transportUndertakingName ?? '',
      communityLicenceNumber: request?.communityLicenceNumber ?? '',
      vehicleRegistrationNumber: request?.vehicleRegistrationNumber ?? '',
      vehicleRegistrationCountry: request?.vehicleRegistrationCountry ?? '',
      requestAllVehicles: request?.requestAllVehicles ? 'true' : 'false',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      // Form-wide rule, checked client-side before the round trip; also re-checked
      // below on the (rare) chance the backend still rejects it (min_two_search_criteria).
      if (!hasMinTwoSearchCriteria(values)) {
        setFormError(t(`${T}.min_two_search_criteria`));
        return;
      }
      try {
        const result = isEdit
          ? await updateCtudRequest(String(request!.id), values)
          : await createCtudRequest(values);
        if (!isEdit && sendAfterCreate) {
          await sendCtudRequest(String(result.id));
        }
        onSaved(String(result.id));
      } catch (e) {
        // min_two_search_criteria is a form-wide rule — always surface it via formError,
        // even though the backend reports it with field="transportUndertakingName".
        if (e instanceof ApiError && e.status === 422) {
          const ve = ValidationError.from(e.body);
          if (ve?.code === 'min_two_search_criteria') {
            setFormError(t(`${T}.min_two_search_criteria`));
            return;
          }
        }
        const handled = applyValidationError(
          e,
          setFieldError,
          (code) => t(`${T}.${code}`),
          setFormError,
        );
        if (!handled) console.error('CTUD save failed', e);
      }
    },
  });

  return {
    formik,
    isEdit,
    formError,
    clearFormError: () => setFormError(null),
    countries,
    authorities,
    requestSources,
    requestPurposes,
  };
}
