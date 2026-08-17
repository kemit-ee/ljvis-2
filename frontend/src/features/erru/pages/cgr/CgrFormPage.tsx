import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Text, StatusBadge } from '@tedi-design-system/react/tedi';
import { useCgrRequestDetail } from './useCgrRequestDetail';
import { useCgrForm } from './useCgrForm';
import { CgrRequestFields } from '../../components/Cgr/CgrRequestFields';
import { CgrMemberStatesTable } from '../../components/Cgr/CgrMemberStatesTable';
import { isCgrEditable, isCgrSendable } from '../../types';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { DetailRow } from '../../components/shared/DetailRow';
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
  const { hasAnyPermission } = useAuth();
  const { label } = useClassifierLabel();

  const canRead = hasAnyPermission(['cgr.read']);
  const canEdit = hasAnyPermission(['cgr.create']);
  const canSend = hasAnyPermission(['cgr.send']);

  const { request, isLoading, notFound, send, isSending, resend, resendingCountry, sendError, reload } =
    useCgrRequestDetail(id);
  const form = useCgrForm(request, () => reload());

  if (!canRead) return <Text>{t('common.forbidden')}</Text>;
  if (isLoading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !request) return <Text>{t('erru.cgr.notFound')}</Text>;

  const cgrToLabel = (code: string | null | undefined) =>
    code === 'ZZ' ? t('erru.cgr.form.cgrToAll') : label('COUNTRY', code);

  const editable = isCgrEditable(request) && canEdit;
  const sendable = isCgrSendable(request) && canSend;
  const isInbound = request.direction === 'incoming';

  return (
    <div>
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
            <StatusBadge>{label('CGR_REQUEST_STATUS', request.status)}</StatusBadge>
          </div>
          <Text>
            {t('erru.cgr.form.version', { version: request.version })}
            {!editable && ` · ${t('erru.cgr.form.readOnly')}`}
          </Text>
          {request.errorMessage && <Text modifiers="bold">{request.errorMessage}</Text>}
          {sendError && <Text modifiers="bold">{t('erru.cgr.sendFailed')}</Text>}
        </Card.Content>
      </Card>

      {editable ? (
        <form onSubmit={form.formik.handleSubmit}>
          <CgrRequestFields form={form} />
          {form.formError && (
            <Alert type="danger" size="small" className="mt-05">
              {form.formError}
            </Alert>
          )}
          {form.formik.submitCount > 0 && Object.keys(form.formik.errors).length > 0 && (
            <Alert type="danger" size="small" className="mt-05">
              {t('common.formHasErrors')}
            </Alert>
          )}
          <PageActions>
            <Button visualType="secondary" onClick={() => navigate('/erru/cgr')}>
              {t('common.back')}
            </Button>
            <Button type="submit" disabled={form.formik.isSubmitting}>
              {t('common.save')}
            </Button>
            {sendable && (
              <Button onClick={send} disabled={isSending}>
                {t('erru.cgr.form.send')}
              </Button>
            )}
            <Button visualType="secondary" onClick={() => navigate(`/erru/cgr/new?copyFrom=${request.id}`)}>
              {t('erru.cgr.form.copyRequest')}
            </Button>
          </PageActions>
        </form>
      ) : (
        <>
          <Card className="mt-05">
            <Card.Content>
              <Heading element="h2">{t('erru.cgr.form.headerBlock')}</Heading>
              <DetailRow label={t('erru.cgr.form.cgrFrom')} value={label('COUNTRY', request.cgrFrom)} />
              <DetailRow label={t('erru.cgr.form.cgrTo')} value={cgrToLabel(request.cgrTo)} />
              <DetailRow
                label={t('erru.cgr.form.originatingAuthority')}
                value={label('COMPETENT_AUTHORITY', request.originatingAuthority)}
              />
              <DetailRow
                label={t('erru.cgr.form.requestSource')}
                value={label('CGR_REQUEST_SOURCE', request.requestSource)}
              />
              <DetailRow
                label={t('erru.cgr.form.requestPurpose')}
                value={label('CGR_REQUEST_PURPOSE', request.requestPurpose)}
              />

              <Heading element="h2">{t('erru.cgr.form.nameBlock')}</Heading>
              <DetailRow label={t('erru.cgr.form.tmFirstName')} value={request.tmFirstName} />
              <DetailRow label={t('erru.cgr.form.tmFamilyName')} value={request.tmFamilyName} />
              <DetailRow label={t('erru.cgr.form.tmDateOfBirth')} value={request.tmDateOfBirth} />
              <DetailRow label={t('erru.cgr.form.tmPlaceOfBirth')} value={request.tmPlaceOfBirth} />

              <Heading element="h2">{t('erru.cgr.form.certificateBlock')}</Heading>
              <DetailRow label={t('erru.cgr.form.certificateNumber')} value={request.certificateNumber} />
              <DetailRow label={t('erru.cgr.form.certificateIssueDate')} value={request.certificateIssueDate} />
              <DetailRow
                label={t('erru.cgr.form.certificateIssueCountry')}
                value={label('COUNTRY', request.certificateIssueCountry)}
              />
            </Card.Content>
          </Card>

          <CgrMemberStatesTable
            request={request}
            canSend={canSend}
            onResend={resend}
            resendingCountry={resendingCountry}
          />

          <PageActions>
            <Button visualType="secondary" onClick={() => navigate('/erru/cgr')}>
              {t('common.back')}
            </Button>
            {sendable && (
              <Button onClick={send} disabled={isSending}>
                {t('erru.cgr.form.resend')}
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => navigate(`/erru/cgr/new?copyFrom=${request.id}`)}>
                {t('erru.cgr.form.copyRequest')}
              </Button>
            )}
          </PageActions>
        </>
      )}
    </div>
  );
}
