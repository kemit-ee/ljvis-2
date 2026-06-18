import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import type { ClassifierValue } from '../../types.ts';
import { insertClassifierValue, updateClassifierValue } from '../../api.ts';
import { applyValidationError } from '../../../../shared/api/errors.ts';
import { toIsoDate } from '../../../../hooks/dateUtils.ts';

export function useClassifierValueForm(
  classifierId: string | undefined,
  onSaved: () => void,
  existingValue?: ClassifierValue | null,
) {
  const { t } = useTranslation();
  const isEdit = !!existingValue;

  const validationSchema = Yup.object({
    code: Yup.string().required(t('classifiers.validation.required')),
    name: Yup.string().required(t('classifiers.validation.required')),
    validFrom: Yup.string().required(t('classifiers.validation.required')),
    validUntil: isEdit
      ? Yup.string().nullable()
      : Yup.string()
          .nullable()
          .test(
            'is-after-start',
            t('users.validation.endBeforeStart'),
            function (value) {
              const { validFrom } = this.parent;
              if (!value || value === null || !validFrom) return true;
              return new Date(value) > new Date(validFrom);
            },
          ),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: existingValue?.classifierValueId ?? '',
      code: existingValue?.code ?? '',
      name: existingValue?.name ?? '',
      validFrom: existingValue?.validFrom ?? '',
      validUntil: existingValue?.validUntil ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        if (!classifierId) return;
        const trimmedValues = {
          ...values,
          validFrom: toIsoDate(values.validFrom),
          validUntil: toIsoDate(values.validUntil),
        };
        if (isEdit && existingValue) {
          await updateClassifierValue({
            classifierId: classifierId,
            classifierValueId: existingValue.classifierValueId,
            code: trimmedValues.code,
            name: trimmedValues.name,
            validFrom: trimmedValues.validFrom,
            validUntil: trimmedValues.validUntil,
          });
        } else {
          await insertClassifierValue({
            classifierId: classifierId,
            code: trimmedValues.code,
            name: trimmedValues.name,
            validFrom: trimmedValues.validFrom,
            validUntil: trimmedValues.validUntil,
          });
        }
        onSaved();
      } catch (e) {
        if (
          !applyValidationError(e, setFieldError, (code) =>
            t(`classifiers.validation.api.${code}`),
          )
        ) {
          console.error('Save failed', e);
        }
      }
    },
  });

  return { formik };
}
