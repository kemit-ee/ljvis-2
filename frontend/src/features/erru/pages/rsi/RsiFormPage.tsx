import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Text, StatusBadge } from '@tedi-design-system/react/tedi';
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
  const location = useLocation();
  const [savedOk, setSavedOk] = useState(
    !!(location.state as { justSaved?: boolean } | null)?.justSaved,
  );
  const { hasAnyPermission } = useAuth();
  const { label } = useClassifierLabel();

  const canRead = hasAnyPermission(['rsi.read']);
  const canEdit = hasAnyPermission(['rsi.create']);
  const canSend = hasAnyPermission(['rsi.send']);

  const { message, isLoading, notFound, send, isSending, sendError, reload } =
    useRsiMessageDetail(id);
  const handleSaved = () => {
    setSavedOk(true);
    window.scrollTo(0, 0);
    reload();
  };
  const handleSend = () => { setSavedOk(false); window.scrollTo(0, 0); send(); };
  const form = useRsiForm(message, handleSaved);
  const prevSubmitCount = useRef(0);

  useEffect(() => {
    const count = form.formik.submitCount;
    if (count > prevSubmitCount.current && Object.keys(form.formik.errors).length > 0) {
      prevSubmitCount.current = count;
      setTimeout(() => {
        const first =
          document.querySelector<HTMLElement>('[aria-invalid="true"]') ??
          document.querySelector<HTMLElement>('[class*="feedback-text--error"]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [form.formik.submitCount, form.formik.errors]);

  if (!canRead) return <Text>{t('common.forbidden')}</Text>;
  if (isLoading && !message) return <Text>{t('common.loading')}</Text>;
  if (notFound || !message) return <Text>{t('erru.rsi.notFound')}</Text>;

  const editable = isRsiEditable(message) && canEdit;
  const sendable = isRsiSendable(message) && canSend;
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
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">
              {isInbound
                ? t('erru.rsi.form.titleInbound')
                : t('erru.rsi.form.titleOutgoing')}
              {' — '}
              {message.businessCaseId}
            </Heading>
            <StatusBadge>
              {label('RSI_REQUEST_STATUS', message.status)}
            </StatusBadge>
          </div>
          <Text>
            {t('erru.rsi.form.version', { version: message.version })}
            {!editable && ` · ${t('erru.rsi.form.readOnly')}`}
          </Text>
          {message.errorMessage && (
            <Text modifiers="bold">{message.errorMessage}</Text>
          )}
          {sendError && (
            <Text modifiers="bold">{t('erru.rsi.sendFailed')}</Text>
          )}
        </Card.Content>
      </Card>

      {editable ? (
        <form onSubmit={form.formik.handleSubmit}>
          <RsiMessageFields form={form} />
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
          <PageActions>
            <Button
              visualType="secondary"
              onClick={() => navigate('/erru/rsi')}
            >
              {t('common.back')}
            </Button>
            <Button type="submit" disabled={form.formik.isSubmitting}>
              {t('common.save')}
            </Button>
            {sendable && (
              <Button onClick={handleSend} disabled={isSending}>
                {t('erru.rsi.form.send')}
              </Button>
            )}
          </PageActions>
        </form>
      ) : (
        <>
          <Card className="mt-05">
            <Card.Content>
              <Heading element="h2" className="mb-1">
                {t('erru.rsi.form.headerBlock')}
              </Heading>
              <DetailRow
                label={t('erru.rsi.form.rsiFrom')}
                value={label('COUNTRY', message.rsiFrom)}
              />
              <DetailRow
                label={t('erru.rsi.form.rsiTo')}
                value={label('COUNTRY', message.rsiTo)}
              />
              <div className="mb-1">
                <DetailRow
                  label={t('erru.rsi.form.originatingAuthority')}
                  value={message.originatingAuthority}
                />
              </div>

              <Heading element="h2" className="mb-1">
                {t('erru.rsi.form.vehicleBlock')}
              </Heading>
              <DetailRow
                label={t('erru.rsi.form.vehicleCategory')}
                value={label('RSI_VEHICLE_CATEGORY', message.vehicleCategory)}
              />
              <DetailRow
                label={t('erru.rsi.form.vehicleRegistrationNumber')}
                value={message.vehicleRegistrationNumber}
              />
              <DetailRow
                label={t('erru.rsi.form.vehicleRegistrationCountry')}
                value={label('COUNTRY', message.vehicleRegistrationCountry)}
              />
              <DetailRow
                label={t('erru.rsi.form.vehicleIdentificationNumber')}
                value={message.vehicleIdentificationNumber}
              />
              <div className="mb-1">
                <DetailRow
                  label={t('erru.rsi.form.odometerReading')}
                  value={message.odometerReading}
                />
              </div>

              {(message.driverFirstName || message.driverFamilyName) && (
                <>
                  <Heading element="h2" className="mb-1">
                    {t('erru.rsi.form.driverBlock')}
                  </Heading>
                  <DetailRow
                    label={t('erru.rsi.form.driverFirstName')}
                    value={message.driverFirstName}
                  />
                  <DetailRow
                    label={t('erru.rsi.form.driverFamilyName')}
                    value={message.driverFamilyName}
                  />
                  <DetailRow
                    label={t('erru.rsi.form.driverLicenceNumber')}
                    value={message.driverLicenceNumber}
                  />
                  <div className="mb-1">
                    <DetailRow
                      label={t('erru.rsi.form.driverLicenceCountry')}
                      value={label('COUNTRY', message.driverLicenceCountry)}
                    />
                  </div>
                </>
              )}

              <Heading element="h2" className="mb-1">
                {t('erru.rsi.form.inspectionBlock')}
              </Heading>
              <DetailRow
                label={t('erru.rsi.form.inspectionIdentifier')}
                value={message.inspectionIdentifier}
              />
              <DetailRow
                label={t('erru.rsi.form.inspectionLocation')}
                value={message.inspectionLocation}
              />
              <DetailRow
                label={t('erru.rsi.form.inspectionDate')}
                value={
                  message.inspectionDatetime
                    ? new Date(message.inspectionDatetime).toLocaleString(
                        'et-EE',
                      )
                    : '—'
                }
              />
              <div className="mb-1">
                <DetailRow
                  label={t('erru.rsi.form.inspectionAuthorityOrName')}
                  value={message.inspectionAuthorityOrName}
                />
              </div>

              <Heading element="h2" className="mb-1">
                {t('erru.rsi.form.resultsBlock')}
              </Heading>
              <DetailRow
                label={t('erru.rsi.form.inspectionPassed')}
                value={
                  message.inspectionPassed ? t('common.yes') : t('common.no')
                }
              />
              <DetailRow
                label={t('erru.rsi.form.ptiRequested')}
                value={message.ptiRequested ? t('common.yes') : t('common.no')}
              />
              <div className={message.responseStatusCode ? 'mb-1' : undefined}>
                <DetailRow
                  label={t('erru.rsi.form.vehicleProhibitionOrRestriction')}
                  value={
                    message.vehicleProhibitionOrRestriction
                      ? t('common.yes')
                      : t('common.no')
                  }
                />
              </div>

              {message.responseStatusCode && (
                <>
                  <Heading element="h2" className="mb-1">
                    {t('erru.rsi.form.responseBlock')}
                  </Heading>
                  <DetailRow
                    label={t('erru.rsi.form.responseStatusCode')}
                    value={label(
                      'RSI_RESPONSE_STATUS',
                      message.responseStatusCode,
                    )}
                  />
                  {message.responseStatusMessage && (
                    <DetailRow
                      label={t('erru.rsi.form.responseStatusMessage')}
                      value={message.responseStatusMessage}
                    />
                  )}
                </>
              )}
            </Card.Content>
          </Card>
          <PageActions>
            <Button
              visualType="secondary"
              onClick={() => navigate('/erru/rsi')}
            >
              {t('common.back')}
            </Button>
          </PageActions>
        </>
      )}
    </div>
  );
}
