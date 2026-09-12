import { useState } from 'react';
import {
  Link,
  useParams,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Heading,
  Text,
  StatusBadge,
} from '@tedi-design-system/react/tedi';
import { useNuMessageDetail } from './useNuMessageDetail';
import { useNuForm } from './useNuForm';
import { NuMessageFields } from '../../components/Nu/NuMessageFields';
import { NuMemberStatesTable } from '../../components/Nu/NuMemberStatesTable';
import { isNuEditable, isNuSendable, type NuSource } from '../../types';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { NuInfoBlock } from '../../components/Nu/NuInfoBlock';
import { NuIdentityBlocks } from '../../components/Nu/NuIdentityBlocks';
import { formatDate } from '../../../../hooks/dateUtils';
import { PageActions } from '../../../../shared/components/PageActions';
import { getNuSource } from '../../api';
import { nuErrorMessage } from '../../nuErrors';
import { NuVersionsTable } from '../../components/Nu/NuVersionsTable';

// Only current outgoing drafts are editable.
export function NuFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const snapshotId = params.get('snapshotId') ?? undefined;
  return (
    <NuFormView
      key={`${id}/${snapshotId ?? 'latest'}`}
      snapshotId={snapshotId}
    />
  );
}

function NuFormView({ snapshotId }: { snapshotId?: string }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const [savedOk, setSavedOk] = useState(
    !snapshotId &&
      !!(location.state as { justSaved?: boolean } | null)?.justSaved,
  );
  const { hasAnyPermission } = useAuth();
  const { label } = useClassifierLabel();

  const canRead = hasAnyPermission(['nu.read']);
  const canEdit = hasAnyPermission(['nu.create']);
  const canSend = hasAnyPermission(['nu.send']);

  const { message, isLoading, notFound, send, isSending, sendError, reload } =
    useNuMessageDetail(id, snapshotId);
  const [sourcePreview, setSourcePreview] = useState<NuSource>();
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const handleSaved = async () => {
    await reload();
    setSourcePreview(undefined);
    setSavedOk(true);
    window.scrollTo(0, 0);
  };
  const handleSend = () => {
    if (
      isLoading ||
      form.formik.dirty ||
      sourcePreview ||
      sourceLoading ||
      form.formik.isSubmitting ||
      isSending
    )
      return;
    setSavedOk(false);
    window.scrollTo(0, 0);
    send();
  };
  const form = useNuForm(
    message,
    undefined,
    handleSaved,
    sourcePreview?.snapshotId,
  );

  if (!canRead) return <Text>{t('common.forbidden')}</Text>;
  if (isLoading && !message) return <Text>{t('common.loading')}</Text>;
  if (notFound || !message) return <Text>{t('erru.nu.notFound')}</Text>;

  const nuToLabel = (code: string | null | undefined) =>
    code === 'ZZ' ? t('erru.nu.form.nuToAll') : label('COUNTRY', code);

  const editable = !snapshotId && isNuEditable(message) && canEdit;
  const sendable = !snapshotId && isNuSendable(message) && canSend;
  const isInbound = message.direction === 'incoming';

  return (
    <div>
      {savedOk && (
        <Alert
          type="success"
          size="small"
          className="mt-05"
          onClose={() => setSavedOk(false)}
        >
          {t('common.saved')}
        </Alert>
      )}
      {snapshotId && (
        <Alert type="info" size="small" className="mt-05">
          {t('erru.nu.history.snapshotNotice', { version: message.version })}{' '}
          <Link to={`/erru/nu/${id}`} className="table-link">
            {t('erru.nu.history.openCurrent')}
          </Link>
        </Alert>
      )}
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">
              {isInbound
                ? t('erru.nu.form.titleInbound')
                : t('erru.nu.form.titleOutgoing')}
              {' — '}
              {message.businessCaseId}
            </Heading>
            <StatusBadge>
              {label('NU_MESSAGE_STATUS', message.status)}
            </StatusBadge>
          </div>
          <Text>
            {t('erru.nu.form.version', { version: message.version })}
            {!editable && ` · ${t('erru.nu.form.readOnly')}`}
          </Text>
          {(sendError || message.errorMessage) && (
            <Alert type="danger" size="small" className="mt-1">
              {message.status === 'error'
                ? t('erru.nu.sendFailed')
                : sendError || message.errorMessage}
            </Alert>
          )}
        </Card.Content>
      </Card>

      {editable ? (
        <form onSubmit={form.formik.handleSubmit}>
          <NuMessageFields
            form={form}
            businessCaseId={message.businessCaseId}
            identity={
              sourcePreview
                ? {
                    firstName: sourcePreview.firstName,
                    lastName: sourcePreview.lastName,
                    dateOfBirth: sourcePreview.dateOfBirth,
                    placeOfBirth: sourcePreview.placeOfBirth,
                    certificateNumber: sourcePreview.certificateNumber,
                    certificateIssueDate: sourcePreview.certificateIssueDate,
                    certificateIssueCountry:
                      sourcePreview.certificateCountryCode,
                  }
                : {
                    firstName: message.tmFirstName,
                    lastName: message.tmFamilyName,
                    dateOfBirth: message.tmDateOfBirth,
                    placeOfBirth: message.tmPlaceOfBirth,
                    certificateNumber: message.certificateNumber,
                    certificateIssueDate: message.certificateIssueDate,
                    certificateIssueCountry: message.certificateIssueCountry,
                  }
            }
          />
          {form.formError && (
            <Alert
              type="danger"
              size="small"
              className="mt-05"
              onClose={() => form.clearFormError()}
            >
              {form.formError}
            </Alert>
          )}
          {form.formik.submitCount > 0 &&
            Object.keys(form.formik.errors).length > 0 && (
              <Alert type="danger" size="small" className="mt-05">
                {t('common.formHasErrors')}
              </Alert>
            )}
          {sourceError && (
            <Alert type="danger" size="small">
              {sourceError}
            </Alert>
          )}
          {(form.formik.dirty || sourcePreview) && (
            <Alert type="info" size="small">
              {t('erru.nu.form.saveBeforeSend')}
            </Alert>
          )}
          <PageActions>
            <Button
              type="button"
              visualType="secondary"
              disabled={
                isLoading ||
                isSending ||
                form.formik.isSubmitting ||
                sourceLoading
              }
              onClick={async () => {
                if (!message.sourceGoodReputeFormKey) return;
                setSourceLoading(true);
                setSourceError(null);
                try {
                  setSourcePreview(
                    await getNuSource(message.sourceGoodReputeFormKey),
                  );
                } catch (error) {
                  setSourceError(nuErrorMessage(error, t));
                } finally {
                  setSourceLoading(false);
                }
              }}
            >
              {t('erru.nu.form.refreshSource')}
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                form.formik.isSubmitting ||
                isSending ||
                sourceLoading
              }
              isLoading={form.formik.isSubmitting}
            >
              {t('common.save')}
            </Button>
            {sendable && (
              <Button
                type="button"
                onClick={handleSend}
                disabled={
                  isLoading ||
                  isSending ||
                  form.formik.isSubmitting ||
                  form.formik.dirty ||
                  !!sourcePreview ||
                  sourceLoading
                }
                isLoading={isSending}
              >
                {t('erru.nu.form.send')}
              </Button>
            )}
          </PageActions>
        </form>
      ) : (
        <>
          <NuInfoBlock
            title={t('erru.nu.form.headerBlock')}
            fields={[
              {
                label: t('erru.nu.form.nuFrom'),
                value: label('COUNTRY', message.nuFrom),
              },
              { label: t('erru.nu.form.nuTo'), value: nuToLabel(message.nuTo) },
              {
                label: t('erru.nu.form.originatingAuthority'),
                value: label(
                  'COMPETENT_AUTHORITY',
                  message.originatingAuthority,
                ),
              },
              {
                label: t('erru.nu.form.requestSource'),
                value: t(
                  `erru.nu.requestSource.${message.requestSource}`,
                  message.requestSource ?? '—',
                ),
              },
              {
                label: t('erru.nu.form.requestPurpose'),
                value: t(
                  `erru.nu.requestPurpose.${message.requestPurpose}`,
                  message.requestPurpose ?? '—',
                ),
              },
            ]}
          />
          <NuIdentityBlocks
            identity={{
              firstName: message.tmFirstName,
              lastName: message.tmFamilyName,
              dateOfBirth: message.tmDateOfBirth,
              placeOfBirth: message.tmPlaceOfBirth,
              certificateNumber: message.certificateNumber,
              certificateIssueDate: message.certificateIssueDate,
              certificateIssueCountry: message.certificateIssueCountry,
            }}
          />
          <NuInfoBlock
            title={t('erru.nu.form.unfitnessBlock')}
            fields={[
              {
                label: t('erru.nu.form.unfitStartDate'),
                value: formatDate(message.unfitStartDate),
              },
            ]}
          />

          <NuMemberStatesTable message={message} />

          {sendable && (
            <PageActions>
              <Button
                type="button"
                onClick={handleSend}
                disabled={
                  isLoading ||
                  isSending ||
                  form.formik.isSubmitting ||
                  form.formik.dirty ||
                  !!sourcePreview ||
                  sourceLoading
                }
                isLoading={isSending}
              >
                {t('erru.nu.form.send')}
              </Button>
            </PageActions>
          )}
        </>
      )}
      <NuVersionsTable
        messageId={message.id}
        snapshots={message.snapshots ?? []}
      />
    </div>
  );
}
