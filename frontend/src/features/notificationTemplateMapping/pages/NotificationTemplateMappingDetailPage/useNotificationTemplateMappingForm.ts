import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import type { NotificationTemplateMapping } from '../../types';
import { saveNotificationTemplateMapping } from '../../api';
import { applyValidationError } from '../../../../shared/api/errors';
import { sanitizeText } from '../../../../hooks/formTextUtils';

export function useNotificationTemplateMappingForm(
  mapping: NotificationTemplateMapping | undefined,
  onSaved: () => void,
) {
  const { t } = useTranslation();

  const validationSchema = Yup.object({
    defaultRecipientEmail: Yup.string()
      .trim()
      .test(
        'email-or-empty',
        t('notificationTemplateMapping.validation.emailInvalid'),
        (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      ),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      originalTemplateId: mapping?.originalTemplateId ?? '',
      defaultRecipientEmail: mapping?.defaultRecipientEmail ?? '',
      defaultLanguage: mapping?.defaultLanguage ?? 'et',
      active: mapping?.active ?? true,
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      if (!mapping) return;
      try {
        await saveNotificationTemplateMapping({
          notificationType: mapping.notificationType,
          channel: mapping.channel,
          originalTemplateId: sanitizeText(values.originalTemplateId),
          defaultRecipientEmail: sanitizeText(values.defaultRecipientEmail),
          defaultLanguage: values.defaultLanguage,
          active: values.active,
        });
        onSaved();
      } catch (e) {
        if (
          !applyValidationError(e, setFieldError, (code) =>
            t(`notificationTemplateMapping.validation.${code}`),
          )
        ) {
          console.error('Update failed', e);
        }
      }
    },
  });

  return { formik };
}
