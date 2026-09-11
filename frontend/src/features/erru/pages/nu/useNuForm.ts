import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { saveNuMessage } from '../../api';
import type { NuMessage, NuMessageWrite } from '../../types';
import { nuErrorDetails, nuErrorMessage } from '../../nuErrors';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';

const T = 'erru.nu.validation';

// Identity is server-derived; revisions retain the original source.
export function useNuForm(
  request: Partial<NuMessage> | undefined,
  sourceGoodReputeFormKey: string | undefined,
  onSaved: (id?: string) => void | Promise<void>,
  sourceSnapshotId?: string,
) {
  const { t } = useTranslation();
  const isEdit = !!request?.id;
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode, getErruMemberCountries } = useClassifiers();

  const countries = useMemo(
    () => getErruMemberCountries(),
    [getErruMemberCountries],
  );
  const authorities = useMemo(
    () => getByCode('COMPETENT_AUTHORITY').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const requestSources = useMemo(
    () => getByCode('CGR_REQUEST_SOURCE').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const requestPurposes = useMemo(
    () =>
      getByCode('CGR_REQUEST_PURPOSE').filter(
        (c) => c.isValid !== false && c.code !== 'Heartbeat',
      ),
    [getByCode],
  );

  const required = t(`${T}.required`);

  const validationSchema = Yup.object({
    originatingAuthority: Yup.string().required(required),
    requestSource: Yup.string().required(required),
    requestPurpose: Yup.string().required(required),
    unfitStartDate: Yup.string().required(required),
  });

  const formik = useFormik<NuMessageWrite>({
    enableReinitialize: true,
    initialValues: {
      nuTo: request?.nuTo === 'ZZ' ? '' : (request?.nuTo ?? ''),
      originatingAuthority: request?.originatingAuthority ?? '',
      requestSource: request?.requestSource ?? 'CA',
      requestPurpose: request?.requestPurpose ?? '',
      unfitStartDate: request?.unfitStartDate ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const result = await saveNuMessage({
          id: isEdit ? String(request!.id) : undefined,
          sourceGoodReputeFormKey: isEdit ? undefined : sourceGoodReputeFormKey,
          ...values,
          expectedVersion: isEdit ? request?.version : undefined,
          sourceSnapshotId,
        });
        await onSaved(String(result.id));
      } catch (e) {
        const { field } = nuErrorDetails(e);
        const message = nuErrorMessage(e, t);
        const editableFields = [
          'nuTo',
          'originatingAuthority',
          'requestSource',
          'requestPurpose',
          'unfitStartDate',
        ];
        if (field && editableFields.includes(field))
          setFieldError(field, message);
        // Source fields are read-only: their errors must be visible in an alert.
        setFormError(message);
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
