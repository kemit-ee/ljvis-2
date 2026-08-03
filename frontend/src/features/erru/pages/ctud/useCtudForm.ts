import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createCtudRequest, updateCtudRequest } from '../../api';
import type { CtudRequest, CtudRequestWrite } from '../../types';
import { applyValidationError } from '../../../../shared/api/errors';
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
) {
  const { t } = useTranslation();
  const isEdit = !!request;
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode } = useClassifiers();

  const countries = useMemo(() => getByCode('COUNTRY'), [getByCode]);
  const authorities = useMemo(() => getByCode('COMPETENT_AUTHORITY'), [getByCode]);
  const requestSources = useMemo(() => getByCode('CTUD_REQUEST_SOURCE'), [getByCode]);
  const requestPurposes = useMemo(() => getByCode('CTUD_REQUEST_PURPOSE'), [getByCode]);

  const required = t(`${T}.required`);

  const validationSchema = Yup.object({
    ctudTo: Yup.string().required(required).length(2, t(`${T}.invalid_country_code`)),
    originatingAuthority: Yup.string().required(required).max(50, t(`${T}.max_length_exceeded`)),
    requestSource: Yup.string().required(required),
    requestPurpose: Yup.string().required(required),
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
  })
    // At least two of the three search criteria — a form-level rule, so it is attached
    // to the object schema and surfaced on the name field to match the backend.
    .test(
      'min-two-search-criteria',
      t(`${T}.min_two_search_criteria`),
      function (values) {
        const filled = [
          values?.transportUndertakingName,
          values?.communityLicenceNumber,
          values?.vehicleRegistrationNumber,
        ].filter((v) => !!v && String(v).trim() !== '').length;
        if (filled >= 2) return true;
        return this.createError({
          path: 'transportUndertakingName',
          message: t(`${T}.min_two_search_criteria`),
        });
      },
    );

  const formik = useFormik<CtudRequestWrite>({
    enableReinitialize: true,
    initialValues: {
      ctudTo: request?.ctudTo ?? '',
      originatingAuthority: request?.originatingAuthority ?? '',
      requestSource: request?.requestSource ?? '',
      requestPurpose: request?.requestPurpose ?? '',
      transportUndertakingName: request?.transportUndertakingName ?? '',
      communityLicenceNumber: request?.communityLicenceNumber ?? '',
      vehicleRegistrationNumber: request?.vehicleRegistrationNumber ?? '',
      vehicleRegistrationCountry: request?.vehicleRegistrationCountry ?? '',
      requestAllVehicles: request?.requestAllVehicles ? 'true' : 'false',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const result = isEdit
          ? await updateCtudRequest(String(request!.id), values)
          : await createCtudRequest(values);
        onSaved(String(result.id));
      } catch (e) {
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
    countries,
    authorities,
    requestSources,
    requestPurposes,
  };
}
