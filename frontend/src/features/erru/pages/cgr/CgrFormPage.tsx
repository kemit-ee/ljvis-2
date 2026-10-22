import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Text, StatusBadge } from '@tedi-design-system/react/tedi';
import { useCgrRequestDetail } from './useCgrRequestDetail';
import { useCgrForm } from './useCgrForm';
import { CgrRequestFields } from '../../components/Cgr/CgrRequestFields';
import { CgrMemberStatesTable } from '../../components/Cgr/CgrMemberStatesTable';
import { isCgrEditable, isCgrSendable } from '../../types';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { CgrField } from '../../components/Cgr/CgrField';
import { PageActions } from '../../../../shared/components/PageActions';

/**
 * CGR request detail (LJVIS2-138 vorm + LJVIS2-139 tegevused). Modes:
 *  - outgoing draft ("Salvestatud")      → editable, Save + "Saada" + "Kopeeri päring"
 *  - outgoing error ("Viga")             → read-only fields + "Saada uuesti" (full resend)
 *  - outgoing sent ("Päring saadetud")   → read-only fields + memberStates response block,
 *                                           each entry with its own "Saada uuesti" (per country)
 *  - inbound (received/answered)         → always read-only, no send actions
 */
export function CgrFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [savedOk, setSavedOk] = useState(
    !!(location.state as { justSaved?: boolean } | null)?.justSaved,
  );
  const { hasAnyPermission } = useAuth();
  const { label } = useClassifierLabel();

  const canRead = hasAnyPermission(['cgr.read']);
  const canEdit = hasAnyPermission(['cgr.create']);
  const canSend = hasAnyPermission(['cgr.send']);

  const { request, isLoading, notFound, send, isSending, resend, resendingCountry, sendError, reload } =
    useCgrRequestDetail(id);
  const handleSaved = () => {
    setSavedOk(true);
    window.scrollTo(0, 0);
    reload();
  };
  const handleSend = () => { setSavedOk(false); window.scrollTo(0, 0); send(); };
  const handleResend = (code: string) => { setSavedOk(false); window.scrollTo(0, 0); resend(code); };
  const form = useCgrForm(request, handleSaved);

  if (!canRead) return <Text>{t('common.forbidden')}</Text>;
  if (isLoading && !request) return <Text>{t('common.loading')}</Text>;
  if (notFound || !request) return <Text>{t('erru.cgr.notFound')}</Text>;

  const cgrToLabel = (code: string | null | undefined) =>
    code === 'ZZ' ? t('erru.cgr.form.cgrToAll') : label('COUNTRY', code);

  const editable = isCgrEditable(request) && canEdit;
  const sendable = isCgrSendable(request) && canSend;
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
                ? t('erru.cgr.form.titleInbound')
                : t('erru.cgr.form.titleOutgoing')}
              {' — '}
              {request.businessCaseId}
            </Heading>
            <StatusBadge color={request.status === 'responded' ? 'success' : undefined}>
              {request.status === 'sending'
                ? t('erru.cgr.sending')
                : request.status === 'send_unknown'
                  ? t('erru.cgr.sendUnknownStatus')
                  : label('CGR_REQUEST_STATUS', request.status)}
            </StatusBadge>
          </div>
          <Text>
            {t('erru.cgr.form.version', { version: request.version })}
            {!editable && ` · ${t('erru.cgr.form.readOnly')}`}
          </Text>
          {request.errorMessage && (
            <Text modifiers="bold">
              {request.status === 'send_unknown'
                ? t('erru.cgr.sendUnknown')
                : request.errorMessage}
            </Text>
          )}
          {request.direction === 'outgoing' && request.status === 'sent' && !request.memberStates?.length && (
            <Text>{t('erru.cgr.awaitingResponse')}</Text>
          )}
          {sendError && (
            <Text modifiers="bold">
              {sendError === 'send_unknown'
                ? t('erru.cgr.sendUnknown')
                : sendError === 'invalid_cgr_xml'
                  ? t('erru.cgr.invalidXml')
                  : sendError === 'validation_unavailable'
                    ? t('erru.cgr.validationUnavailable')
                    : sendError === 'nysiis_unavailable'
                      ? t('erru.cgr.nysiisUnavailable')
                      : t('erru.cgr.sendFailed')}
            </Text>
          )}
        </Card.Content>
      </Card>

      {editable ? (
        <form onSubmit={form.formik.handleSubmit}>
          <CgrRequestFields form={form} businessCaseId={request.businessCaseId} />
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

            <Button type="submit" disabled={form.formik.isSubmitting}>
              {t('common.save')}
            </Button>
            {sendable && (
              <Button onClick={handleSend} disabled={isSending}>
                {t('erru.cgr.form.send')}
              </Button>
            )}
            <Button
              visualType="secondary"
              onClick={() => navigate(`/erru/cgr/new?copyFrom=${request.id}`)}
            >
              {t('erru.cgr.form.copyRequest')}
            </Button>
          </PageActions>
        </form>
      ) : (
        <>
          <Card className="mt-05">
            <Card.Content>
              <Heading element="h2" className="mb-1">
                {t('erru.cgr.form.headerBlock')}
              </Heading>
              <div className="cgr-fields">
                <CgrField label={t('erru.cgr.form.cgrFrom')} value={label('COUNTRY', request.cgrFrom)} />
                <CgrField label={t('erru.cgr.form.cgrTo')} value={cgrToLabel(request.cgrTo)} />
                <CgrField
                  label={t('erru.cgr.form.originatingAuthority')}
                  value={label('COMPETENT_AUTHORITY', request.originatingAuthority)}
                />
                <CgrField
                  label={t('erru.cgr.form.requestSource')}
                  value={label('CGR_REQUEST_SOURCE', request.requestSource)}
                />
                <CgrField
                  label={t('erru.cgr.form.requestPurpose')}
                  value={label('CGR_REQUEST_PURPOSE', request.requestPurpose)}
                />
              </div>

              <div className="cgr-search-blocks">
                <section>
                  <Heading element="h3" className="cgr-block-title">
                    {t('erru.cgr.form.nameBlock')}
                  </Heading>
                  <div className="cgr-fields cgr-fields--two">
                    <CgrField label={t('erru.cgr.form.tmFirstName')} value={request.tmFirstName} />
                    <CgrField label={t('erru.cgr.form.tmFamilyName')} value={request.tmFamilyName} />
                    <CgrField label={t('erru.cgr.form.tmDateOfBirth')} value={request.tmDateOfBirth} />
                    <CgrField label={t('erru.cgr.form.tmPlaceOfBirth')} value={request.tmPlaceOfBirth} />
                  </div>
                </section>
                <section>
                  <Heading element="h3" className="cgr-block-title">
                    {t('erru.cgr.form.certificateBlock')}
                  </Heading>
                  <div className="cgr-fields cgr-fields--two">
                    <CgrField label={t('erru.cgr.form.certificateNumber')} value={request.certificateNumber} />
                    <CgrField label={t('erru.cgr.form.certificateIssueDate')} value={request.certificateIssueDate} />
                    <CgrField
                      label={t('erru.cgr.form.certificateIssueCountry')}
                      value={label('COUNTRY', request.certificateIssueCountry)}
                    />
                  </div>
                </section>
              </div>
            </Card.Content>
          </Card>

          <CgrMemberStatesTable
            request={request}
            canSend={canSend}
            onResend={handleResend}
            resendingCountry={resendingCountry}
          />

          <PageActions>

            {sendable && (
              <Button onClick={handleSend} disabled={isSending}>
                {t('erru.cgr.form.resend')}
              </Button>
            )}
            {canEdit && (
              <Button
                onClick={() => navigate(`/erru/cgr/new?copyFrom=${request.id}`)}
              >
                {t('erru.cgr.form.copyRequest')}
              </Button>
            )}
          </PageActions>
        </>
      )}
    </div>
  );
}
