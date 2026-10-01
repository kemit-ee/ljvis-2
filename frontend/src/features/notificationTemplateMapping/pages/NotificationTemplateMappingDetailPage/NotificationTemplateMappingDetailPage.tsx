import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Checkbox,
  Heading,
  Select,
  Text,
  TextField,
} from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { PERMISSIONS } from '../../../../constants/constants';
import { AutoHideAlert } from '../../../../components/AutoHideAlert/AutoHideAlert';
import { useNotificationTemplateMappingDetail } from './useNotificationTemplateMappingDetail';
import { useNotificationTemplateMappingForm } from './useNotificationTemplateMappingForm';
import { DesktopRecipientsField } from './DesktopRecipientsField';
import { resolveDesktopRecipientUsers } from '../../api';
import {
  NOTIFICATION_TYPE_TEMPLATE_VARIABLES,
  NOTIFICATION_TYPE_TRIGGER_FORM_KEYS,
} from '../../notificationTypeMeta';

const LANGUAGE_OPTIONS = [
  { value: 'et', label: 'Eesti' },
  { value: 'en', label: 'English' },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field-name mb-1">
      <Text modifiers="bold" color="secondary">
        {label}
      </Text>
      <div className="mt-025">{children}</div>
    </div>
  );
}

export function NotificationTemplateMappingDetailPage() {
  const { notificationType } = useParams<{ notificationType: string }>();
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(PERMISSIONS.NOTIFICATION_TEMPLATE_MAPPING_EDIT);
  const forbidden = !hasPermission(
    PERMISSIONS.NOTIFICATION_TEMPLATE_MAPPING_LIST,
  );

  const [isEditActive, setIsEditActive] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [recipientNames, setRecipientNames] = useState<Record<string, string>>({});

  const { mapping, loading, refetch } =
    useNotificationTemplateMappingDetail(notificationType);

  useEffect(() => {
    const codes = mapping?.desktopRecipientPersonalCodes ?? [];
    if (codes.length === 0) return;
    resolveDesktopRecipientUsers(codes).then((users) => {
      setRecipientNames(
        Object.fromEntries(
          users.map((u) => [u.personalCode, `${u.firstName} ${u.lastName}`]),
        ),
      );
    });
  }, [mapping?.desktopRecipientPersonalCodes]);

  const handleEditSaved = () => {
    setIsEditActive(false);
    setAlertMessage(t('notificationTemplateMapping.editedNote'));
    refetch();
  };

  const { formik } = useNotificationTemplateMappingForm(
    mapping ?? undefined,
    handleEditSaved,
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (loading && !mapping) return <Text>{t('common.loading')}</Text>;
  if (!mapping) return <Text>{t('common.error')}</Text>;

  const selectedLanguage =
    LANGUAGE_OPTIONS.find((o) => o.value === formik.values.defaultLanguage) ??
    null;

  const notificationTypeName = t(
    `notifications.types.${mapping.notificationType}`,
    mapping.notificationType,
  );
  const triggeringFormKeys =
    NOTIFICATION_TYPE_TRIGGER_FORM_KEYS[mapping.notificationType];
  const triggeringForms = triggeringFormKeys
    ? triggeringFormKeys.map((key) => t(`search.formType.${key}`)).join(', ')
    : t('notificationTemplateMapping.triggeredAutomatically');

  const templateVariables =
    mapping.channel === 'postkast'
      ? NOTIFICATION_TYPE_TEMPLATE_VARIABLES[mapping.notificationType]
      : undefined;

  return (
    <div>
      {alertMessage && (
        <AutoHideAlert
          onClose={() => setAlertMessage(null)}
          message={alertMessage}
        />
      )}
      <div className="page-header">
        <Heading element="h1">{notificationTypeName}</Heading>
      </div>

      <Card className="mb-1">
        <Card.Content>
          <div className="card-main">
            <Heading element="h3">
              {t('notificationTemplateMapping.data')}
            </Heading>
            {canEdit && !isEditActive && (
              <Button
                iconLeft="edit"
                visualType="secondary"
                size="small"
                onClick={() => setIsEditActive(true)}
              >
                {t('notificationTemplateMapping.edit')}
              </Button>
            )}
          </div>

          {!isEditActive && (
            <div>
              <Field label={t('notificationTemplateMapping.notificationType')}>
                {mapping.notificationType}
              </Field>
              <Field label={t('notificationTemplateMapping.triggeringForms')}>
                {triggeringForms}
              </Field>
              <Field label={t('notificationTemplateMapping.channel')}>
                {mapping.channel}
              </Field>
              <Field label={t('notificationTemplateMapping.originalTemplateId')}>
                {mapping.originalTemplateId || '—'}
              </Field>
              {mapping.channel === 'postkast' && (
                <Field label={t('notificationTemplateMapping.defaultRecipientEmail')}>
                  {mapping.defaultRecipientEmail || '—'}
                </Field>
              )}
              {mapping.channel === 'desktop' && (
                <Field label={t('notificationTemplateMapping.desktopRecipients')}>
                  {mapping.desktopRecipientPersonalCodes?.length
                    ? mapping.desktopRecipientPersonalCodes
                        .map((code) => recipientNames[code] ?? code)
                        .join(', ')
                    : '—'}
                </Field>
              )}
              <Field label={t('notificationTemplateMapping.defaultLanguage')}>
                {mapping.defaultLanguage}
              </Field>
              <Field label={t('notificationTemplateMapping.active')}>
                {mapping.active
                  ? t('notificationTemplateMapping.statusActive')
                  : t('notificationTemplateMapping.statusInactive')}
              </Field>
            </div>
          )}

          {isEditActive && (
            <form onSubmit={formik.handleSubmit}>
              <Field label={t('notificationTemplateMapping.notificationType')}>
                {mapping.notificationType}
              </Field>
              <Field label={t('notificationTemplateMapping.triggeringForms')}>
                {triggeringForms}
              </Field>
              <Field label={t('notificationTemplateMapping.channel')}>
                {mapping.channel}
              </Field>
              <TextField
                id="originalTemplateId"
                className="mb-1"
                label={t('notificationTemplateMapping.originalTemplateId')}
                value={formik.values.originalTemplateId}
                onChange={(v) => formik.setFieldValue('originalTemplateId', v)}
              />
              {mapping.channel === 'postkast' && (
                <TextField
                  id="defaultRecipientEmail"
                  className="mb-1"
                  label={t('notificationTemplateMapping.defaultRecipientEmail')}
                  value={formik.values.defaultRecipientEmail}
                  onChange={(v) =>
                    formik.setFieldValue('defaultRecipientEmail', v)
                  }
                  {...(formik.touched.defaultRecipientEmail &&
                  formik.errors.defaultRecipientEmail
                    ? {
                        helper: {
                          text: formik.errors.defaultRecipientEmail,
                          type: 'error' as const,
                        },
                      }
                    : {})}
                />
              )}
              {mapping.channel === 'desktop' && (
                <DesktopRecipientsField
                  personalCodes={formik.values.desktopRecipientPersonalCodes}
                  onChange={(codes) =>
                    formik.setFieldValue('desktopRecipientPersonalCodes', codes)
                  }
                />
              )}
              <Select
                id="defaultLanguage"
                className="mb-1"
                label={t('notificationTemplateMapping.defaultLanguage')}
                options={LANGUAGE_OPTIONS}
                value={selectedLanguage}
                onChange={(val) => {
                  const value =
                    val && !Array.isArray(val)
                      ? (val as { value: string }).value
                      : 'et';
                  formik.setFieldValue('defaultLanguage', value);
                }}
              />
              <div className="mb-1">
                <Checkbox
                  checked={formik.values.active}
                  id="active"
                  label={t('notificationTemplateMapping.active')}
                  name="active"
                  value="default"
                  onChange={() =>
                    formik.setFieldValue('active', !formik.values.active)
                  }
                />
              </div>
              <div className="card-main">
                <Button
                  type="button"
                  size="small"
                  visualType="link"
                  onClick={() => {
                    formik.resetForm();
                    setIsEditActive(false);
                  }}
                >
                  {t('notificationTemplateMapping.cancel')}
                </Button>
                <Button
                  type="button"
                  size="small"
                  onClick={() => formik.submitForm()}
                >
                  {t('notificationTemplateMapping.save')}
                </Button>
              </div>
            </form>
          )}
        </Card.Content>
      </Card>

      {templateVariables && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3">
              {t('notificationTemplateMapping.variables.title')}
            </Heading>
            <Text color="secondary" className="mb-1">
              {t('notificationTemplateMapping.variables.intro')}
            </Text>
            <table className="mb-1" data-testid="template-variables">
              <thead>
                <tr>
                  <th align="left">
                    {t('notificationTemplateMapping.variables.name')}
                  </th>
                  <th align="left">
                    {t('notificationTemplateMapping.variables.description')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {templateVariables.map((name) => (
                  <tr key={name}>
                    <td>
                      <code>{`{{${name}}}`}</code>
                    </td>
                    <td>{t(`notificationTemplateMapping.variables.${name}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
