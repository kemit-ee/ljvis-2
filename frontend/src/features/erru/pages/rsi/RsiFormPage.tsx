import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text, StatusBadge } from '@tedi-design-system/react/tedi';
import { useRsiMessageDetail } from './useRsiMessageDetail';
import { useRsiForm } from './useRsiForm';
import { RsiMessageFields } from '../../components/Rsi/RsiMessageFields';
import { isRsiEditable, isRsiSendable } from '../../types';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { DetailRow } from '../../components/shared/DetailRow';
import { PageActions } from '../../../../shared/components/PageActions';

/**
 * RSI message detail (LJVIS2-147 vorm + LJVIS2-148 send). Modes:
 *  - outgoing draft ("Salvestatud")            → editable, Save + "Saada"
 *  - outgoing sent/responded, error, inbound   → read-only, always (an inbound message
 *    is read-only regardless of permissions, per LJVIS2-147 §4). No resend from 'error'
 *    — unlike CGR, RSI's error is terminal (see send.yml): a new message must be composed.
 */
export function RsiFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const { label } = useClassifierLabel();

  const canRead = hasAnyPermission(['rsi.read']);
  const canEdit = hasAnyPermission(['rsi.create']);
  const canSend = hasAnyPermission(['rsi.send']);

  const { message, isLoading, notFound, send, isSending, sendError, reload } =
    useRsiMessageDetail(id);
  const form = useRsiForm(message, () => reload());

  if (!canRead) return <Text>{t('common.forbidden')}</Text>;
  if (isLoading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !message) return <Text>{t('erru.rsi.notFound')}</Text>;

  const editable = isRsiEditable(message) && canEdit;
  const sendable = isRsiSendable(message) && canSend;
  const isInbound = message.direction === 'incoming';

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">
              {isInbound ? t('erru.rsi.form.titleInbound') : t('erru.rsi.form.titleOutgoing')}
              {' — '}
              {message.businessCaseId}
            </Heading>
            <StatusBadge>{label('RSI_REQUEST_STATUS', message.status)}</StatusBadge>
          </div>
          <Text>
            {t('erru.rsi.form.version', { version: message.version })}
            {!editable && ` · ${t('erru.rsi.form.readOnly')}`}
          </Text>
          {message.errorMessage && <Text modifiers="bold">{message.errorMessage}</Text>}
          {sendError && <Text modifiers="bold">{t('erru.rsi.sendFailed')}</Text>}
        </Card.Content>
      </Card>

      {editable ? (
        <form onSubmit={form.formik.handleSubmit}>
          <RsiMessageFields form={form} />
          {form.formError && <Text modifiers="bold">{form.formError}</Text>}
          {form.formik.submitCount > 0 && Object.keys(form.formik.errors).length > 0 && (
            <Text modifiers="bold">{t('erru.rsi.validation.formHasErrors')}</Text>
          )}
          <PageActions>
            <Button visualType="secondary" onClick={() => navigate('/erru/rsi')}>
              {t('common.back')}
            </Button>
            <Button type="submit" disabled={form.formik.isSubmitting}>
              {t('common.save')}
            </Button>
            {sendable && (
              <Button onClick={send} disabled={isSending}>
                {t('erru.rsi.form.send')}
              </Button>
            )}
          </PageActions>
        </form>
      ) : (
        <>
          <Card className="mt-05">
            <Card.Content>
              <Heading element="h2">{t('erru.rsi.form.headerBlock')}</Heading>
              <DetailRow label={t('erru.rsi.form.rsiFrom')} value={label('COUNTRY', message.rsiFrom)} />
              <DetailRow label={t('erru.rsi.form.rsiTo')} value={label('COUNTRY', message.rsiTo)} />
              <DetailRow label={t('erru.rsi.form.originatingAuthority')} value={message.originatingAuthority} />

              <Heading element="h2">{t('erru.rsi.form.vehicleBlock')}</Heading>
              <DetailRow label={t('erru.rsi.form.vehicleCategory')} value={label('RSI_VEHICLE_CATEGORY', message.vehicleCategory)} />
              <DetailRow label={t('erru.rsi.form.vehicleRegistrationNumber')} value={message.vehicleRegistrationNumber} />
              <DetailRow label={t('erru.rsi.form.vehicleRegistrationCountry')} value={label('COUNTRY', message.vehicleRegistrationCountry)} />
              <DetailRow label={t('erru.rsi.form.vehicleIdentificationNumber')} value={message.vehicleIdentificationNumber} />
              <DetailRow label={t('erru.rsi.form.odometerReading')} value={message.odometerReading} />

              {(message.driverFirstName || message.driverFamilyName) && (
                <>
                  <Heading element="h2">{t('erru.rsi.form.driverBlock')}</Heading>
                  <DetailRow label={t('erru.rsi.form.driverFirstName')} value={message.driverFirstName} />
                  <DetailRow label={t('erru.rsi.form.driverFamilyName')} value={message.driverFamilyName} />
                  <DetailRow label={t('erru.rsi.form.driverLicenceNumber')} value={message.driverLicenceNumber} />
                  <DetailRow label={t('erru.rsi.form.driverLicenceCountry')} value={label('COUNTRY', message.driverLicenceCountry)} />
                </>
              )}

              <Heading element="h2">{t('erru.rsi.form.inspectionBlock')}</Heading>
              <DetailRow label={t('erru.rsi.form.inspectionIdentifier')} value={message.inspectionIdentifier} />
              <DetailRow label={t('erru.rsi.form.inspectionLocation')} value={message.inspectionLocation} />
              <DetailRow
                label={t('erru.rsi.form.inspectionDate')}
                value={message.inspectionDatetime ? new Date(message.inspectionDatetime).toLocaleString('et-EE') : '—'}
              />
              <DetailRow label={t('erru.rsi.form.inspectionAuthorityOrName')} value={message.inspectionAuthorityOrName} />

              <Heading element="h2">{t('erru.rsi.form.resultsBlock')}</Heading>
              <DetailRow label={t('erru.rsi.form.inspectionPassed')} value={message.inspectionPassed ? t('common.yes') : t('common.no')} />
              <DetailRow label={t('erru.rsi.form.ptiRequested')} value={message.ptiRequested ? t('common.yes') : t('common.no')} />
              <DetailRow label={t('erru.rsi.form.vehicleProhibitionOrRestriction')} value={message.vehicleProhibitionOrRestriction ? t('common.yes') : t('common.no')} />

              {message.responseStatusCode && (
                <>
                  <Heading element="h2">{t('erru.rsi.form.responseBlock')}</Heading>
                  <DetailRow label={t('erru.rsi.form.responseStatusCode')} value={label('RSI_RESPONSE_STATUS', message.responseStatusCode)} />
                  {message.responseStatusMessage && (
                    <DetailRow label={t('erru.rsi.form.responseStatusMessage')} value={message.responseStatusMessage} />
                  )}
                </>
              )}
            </Card.Content>
          </Card>
          <PageActions>
            <Button visualType="secondary" onClick={() => navigate('/erru/rsi')}>
              {t('common.back')}
            </Button>
          </PageActions>
        </>
      )}
    </div>
  );
}
