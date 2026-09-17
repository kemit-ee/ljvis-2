import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import type { Classifier } from '../../types';
import { updateClassifier } from '../../api';
import { applyValidationError } from '../../../../shared/api/errors';
import { sanitizeText } from '../../../../hooks/formTextUtils';

export function useClassifierForm(
  classifier: Classifier | undefined,
  onSaved: () => void,
) {
  const { t } = useTranslation();
  const isEdit = !!classifier;

  const validationSchema = Yup.object({
    name: Yup.string().required(t('classifiers.validation.required')),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: classifier?.id ?? '',
      name: classifier?.name ?? '',
      description: classifier?.description ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        if (isEdit && classifier) {
          await updateClassifier({
            id: classifier.id,
            name: sanitizeText(values.name),
            description: sanitizeText(values.description),
          });
          onSaved();
        }
      } catch (e) {
        if (
          !applyValidationError(e, setFieldError, (code) =>
            t(`users.validation.api.${code}`),
          )
        ) {
          console.error('Update failed', e);
        }
      }
    },
  });

  return { formik, isEdit };
}
