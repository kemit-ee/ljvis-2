import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Heading,
  Text,
  StatusBadge,
} from '@tedi-design-system/react/tedi';
import { useCtudRequestDetail } from './useCtudRequestDetail';
import { useCtudForm } from './useCtudForm';
import { CtudRequestFields } from '../../components/Ctud/CtudRequestFields';
import { CtudResponseBlock } from '../../components/Ctud/CtudResponseBlock';
import { isCtudEditable, isCtudSendable } from '../../types';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { DetailRow } from '../../components/shared/DetailRow';

/**
 * CTUD request detail. Renders the three modes defined by the specification:
 *  - outgoing draft ("Algatatud")  → editable, Save + Send
 *  - sent outgoing request         → read-only + response block
 *  - inbound request (ERRU → MS)   → always read-only, regardless of permissions
 */
export function CtudFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [savedOk, setSavedOk] = useState(
    !!(location.state as { justSaved?: boolean } | null)?.justSaved,
  );
  const { hasAnyPermission } = useAuth();
  const { label } = useClassifierLabel();

  const canRead = hasAnyPermission(['ctud.read']);
  const canEdit = hasAnyPermission(['ctud.create']);
  const canSend = hasAnyPermission(['ctud.send']);

  const { request, isLoading, notFound, send, isSending, sendError, reload } =
    useCtudRequestDetail(id);
  const handleSaved = () => {
    setSavedOk(true);
    window.scrollTo(0, 0);
    reload();
  };
  const handleSend = () => { setSavedOk(false); window.scrollTo(0, 0); send(); };
  const form = useCtudForm(request, handleSaved);

  if (!canRead) return <Text>{t('common.forbidden')}</Text>;
  if (isLoading && !request) return <Text>{t('common.loading')}</Text>;
  if (notFound || !request) return <Text>{t('erru.ctud.notFound')}</Text>;

  const editable = isCtudEditable(request) && canEdit;
  const sendable = isCtudSendable(request) && canSend;
  const isInbound = request.direction === 'incoming';

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
                ? t('erru.ctud.form.titleInbound')
                : t('erru.ctud.form.titleOutgoing')}
              {' — '}
              {request.businessCaseId}
            </Heading>
            <StatusBadge>
              {label('CTUD_REQUEST_STATUS', request.status)}
            </StatusBadge>
          </div>
          <Text>
            {t('erru.ctud.form.version', { version: request.version })}
            {' · '}
            {label('CTUD_DIRECTION', request.direction)}
            {!editable && ` · ${t('erru.ctud.form.readOnly')}`}
          </Text>
          {request.errorMessage && (
            <Text modifiers="bold">{request.errorMessage}</Text>
          )}
          {sendError && (
            <Text modifiers="bold">{t('erru.ctud.sendFailed')}</Text>
          )}
        </Card.Content>
      </Card>

      {editable ? (
        <form onSubmit={form.formik.handleSubmit}>
          <CtudRequestFields form={form} businessCaseId={request.businessCaseId} />
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
          <div className="page-actions">
            <div className="page-actions-buttons">
              <Button
                visualType="secondary"
                onClick={() => navigate('/erru/ctud')}
              >
                {t('common.back')}
              </Button>
              <Button type="submit" disabled={form.formik.isSubmitting}>
                {t('common.save')}
              </Button>
              {sendable && (
                <Button onClick={handleSend} disabled={isSending}>
                  {t('erru.ctud.form.send')}
                </Button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <>
          <CtudReadOnlyDetails request={request} />
          <CtudResponseBlock request={request} />
          <div className="page-actions">
            <div className="page-actions-buttons">
              <Button
                visualType="secondary"
                onClick={() => navigate('/erru/ctud')}
              >
                {t('common.back')}
              </Button>
              {sendable && (
                <Button onClick={handleSend} disabled={isSending}>
                  {t('erru.ctud.form.resend')}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CtudReadOnlyDetails({
  request,
}: {
  request: NonNullable<ReturnType<typeof useCtudRequestDetail>['request']>;
}) {
  const { t } = useTranslation();
  const { label } = useClassifierLabel();

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2" className="mb-1">{t('erru.ctud.form.headerBlock')}</Heading>
        <DetailRow
          label={t('erru.ctud.form.ctudFrom')} value={label('COUNTRY', request.ctudFrom)} />
        <DetailRow
          label={t('erru.ctud.form.ctudTo')} value={label('COUNTRY', request.ctudTo)} />
        <DetailRow
          label={t('erru.ctud.form.originatingAuthority')}
          value={label('COMPETENT_AUTHORITY', request.originatingAuthority)}
        />
        <DetailRow
          label={t('erru.ctud.form.requestSource')}
          value={label('CTUD_REQUEST_SOURCE', request.requestSource)}
        />
        <DetailRow
          label={t('erru.ctud.form.requestPurpose')}
          value={label('CTUD_REQUEST_PURPOSE', request.requestPurpose)}
        />
        <DetailRow
          label={t('erru.ctud.list.id')} value={request.businessCaseId} />
        <DetailRow
          label={t('erru.ctud.list.sentAt')}
          value={request.sentAt ? new Date(request.sentAt).toLocaleString('et-EE') : '—'}
        />

        <Heading element="h2" className="mt-1 mb-1">{t('erru.ctud.form.undertakingBlock')}</Heading>
        <DetailRow
          label={t('erru.ctud.form.undertakingName')}
          value={request.transportUndertakingName}
        />
        <DetailRow
          label={t('erru.ctud.form.licenceNumber')}
          value={request.communityLicenceNumber}
        />
        <DetailRow
          label={t('erru.ctud.form.vehicleNumber')}
          value={request.vehicleRegistrationNumber}
        />
        <DetailRow
          label={t('erru.ctud.form.vehicleCountry')}
          value={label('COUNTRY', request.vehicleRegistrationCountry)}
        />
        <DetailRow
          label={t('erru.ctud.form.requestAllVehicles')}
          value={request.requestAllVehicles ? t('common.yes') : t('common.no')}
        />
      </Card.Content>
    </Card>
  );
}
