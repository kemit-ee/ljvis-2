import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createCgrRequest, updateCgrRequest } from '../../api';
import type { CgrRequest, CgrRequestWrite } from '../../types';
import { applyValidationError } from '../../../../shared/api/errors';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';

const T = 'erru.cgr.validation';

/**
 * Draft form for an outgoing CGR request. The Yup schema mirrors
 * TEMPLATES/erru/cgr/validate-cgr-request.yml and the erru.cgr_request CHECK
 * constraints (chk_cgr_search_choice); the backend remains authoritative and its error
 * codes are mapped back onto fields by applyValidationError.
 *
 * Unlike CTUD, cgrTo is OPTIONAL — an empty selection means "all member states"
 * (broadcast, stored as 'ZZ'), so there is no `.required()` on it here.
 */
export function useCgrForm(
  request: Partial<CgrRequest> | undefined,
  onSaved: (id?: string) => void,
) {
  const { t } = useTranslation();
  const isEdit = !!request?.id;
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode } = useClassifiers();

  const countries = useMemo(() => getByCode('COUNTRY').filter((c) => c.isValid !== false), [getByCode]);
  const authorities = useMemo(
    () => getByCode('COMPETENT_AUTHORITY').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const requestSources = useMemo(
    () => getByCode('CGR_REQUEST_SOURCE').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const requestPurposes = useMemo(
    () => getByCode('CGR_REQUEST_PURPOSE').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const required = t(`${T}.required`);

  const validationSchema = Yup.object({
    cgrTo: Yup.string().test(
      'valid-country-code',
      t(`${T}.invalid_country_code`),
      (v) => !v || v.trim().length === 2,
    ),
    originatingAuthority: Yup.string()
      .required(required)
      .max(50, t(`${T}.max_length_exceeded`)),
    requestSource: Yup.string().required(required),
    requestPurpose: Yup.string().required(required),
    tmFirstName: Yup.string().max(100, t(`${T}.max_length_exceeded`)),
    tmFamilyName: Yup.string().max(100, t(`${T}.max_length_exceeded`)),
    tmDateOfBirth: Yup.string(),
    tmPlaceOfBirth: Yup.string().max(200, t(`${T}.max_length_exceeded`)),
    certificateNumber: Yup.string().max(100, t(`${T}.max_length_exceeded`)),
    certificateIssueDate: Yup.string(),
    certificateIssueCountry: Yup.string().test(
      'valid-country-code',
      t(`${T}.invalid_country_code`),
      (v) => !v || v.trim().length === 2,
    ),
  })
    // XSD choice: 7A (name+DOB) or 7B (certificate), each complete if used at all.
    .test('search-choice', t(`${T}.search_choice_required`), function (values) {
      const nameFilled = [
        values?.tmFirstName,
        values?.tmFamilyName,
        values?.tmDateOfBirth,
      ].map((v) => !!v && String(v).trim() !== '');
      const certFilled = [
        values?.certificateNumber,
        values?.certificateIssueDate,
        values?.certificateIssueCountry,
      ].map((v) => !!v && String(v).trim() !== '');

      const nameAny = nameFilled.some(Boolean);
      const nameAll = nameFilled.every(Boolean);
      const certAny = certFilled.some(Boolean);
      const certAll = certFilled.every(Boolean);

      if (nameAny && !nameAll) {
        return this.createError({
          path: 'tmFirstName',
          message: t(`${T}.name_block_incomplete`),
        });
      }
      if (certAny && !certAll) {
        return this.createError({
          path: 'certificateNumber',
          message: t(`${T}.certificate_block_incomplete`),
        });
      }
      if (!nameAll && !certAll) {
        return this.createError({
          path: 'tmFirstName',
          message: t(`${T}.search_choice_required`),
        });
      }
      return true;
    });

  const formik = useFormik<CgrRequestWrite>({
    enableReinitialize: true,
    initialValues: {
      cgrTo: request?.cgrTo === 'ZZ' ? '' : (request?.cgrTo ?? ''),
      originatingAuthority: request?.originatingAuthority ?? '',
      requestSource: request?.requestSource ?? '',
      requestPurpose: request?.requestPurpose ?? '',
      tmFirstName: request?.tmFirstName ?? '',
      tmFamilyName: request?.tmFamilyName ?? '',
      tmDateOfBirth: request?.tmDateOfBirth ?? '',
      tmPlaceOfBirth: request?.tmPlaceOfBirth ?? '',
      certificateNumber: request?.certificateNumber ?? '',
      certificateIssueDate: request?.certificateIssueDate ?? '',
      certificateIssueCountry: request?.certificateIssueCountry ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const result = isEdit
          ? await updateCgrRequest(String(request!.id), values)
          : await createCgrRequest(values);
        onSaved(String(result.id));
      } catch (e) {
        const handled = applyValidationError(
          e,
          setFieldError,
          (code) => t(`${T}.${code}`),
          setFormError,
        );
        if (!handled) console.error('CGR save failed', e);
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
