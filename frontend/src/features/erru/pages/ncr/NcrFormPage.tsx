import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text, StatusBadge } from '@tedi-design-system/react/tedi';
import { useNcrCase } from './useNcrCase';
import { useNcrRequestForm } from './useNcrRequestForm';
import { useNcrResponseForm } from './useNcrResponseForm';
import { NcrRequestFields } from '../../components/Ncr/NcrRequestFields';
import { NcrResponseFields } from '../../components/Ncr/NcrResponseFields';
import { DetailRow } from '../../components/Ctud/DetailRow';
import {
  isNcrRequestEditable,
  isNcrRequestSendable,
  isNcrResponseEditable,
  isNcrResponseSendable,
} from '../../types';
import { sendNcrRequest, sendNcrResponse } from '../../api';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';

/**
 * NCR case detail (LJVIS2-63 §4 "NCR sõnumi vorm" + LJVIS2-64 §4.2/4.5 send actions).
 * Opens by businessCaseId — the case's permanent address (LJVIS2-63 §3). Four modes:
 *  - outgoing draft (status='initiated') → editable request form, ncr.create to save,
 *    ncr.send to send ("Saada").
 *  - incoming, status IN ('viewed','answer_drafted') → editable response form,
 *    ncr.respond to save, ncr.send to send ("Saada vastus").
 *  - status='error' → read-only content, but "Saada"/"Saada vastus" retry button shown
 *    per direction (ncr.send), same endpoint as the first send.
 *  - anything else (sent/acknowledged/responded/received/forwarded/answered) → fully
 *    read-only, no action buttons.
 * The read-only "Juhtumi teadete loend" (snapshot history) is always shown below.
 */
export function NcrFormPage() {
  const { t } = useTranslation();
  const { businessCaseId } = useParams();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const { getValue } = useClassifiers();
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const canRead = hasAnyPermission(['ncr.read']);
  const canCreate = hasAnyPermission(['ncr.create']);
  const canRespond = hasAnyPermission(['ncr.respond']);
  const canSend = hasAnyPermission(['ncr.send']);

  const { current, snapshots, isLoading, notFound, reload } = useNcrCase(businessCaseId);

  const requestForm = useNcrRequestForm(current, () => reload());
  const responseForm = useNcrResponseForm(current, () => reload());

  if (!canRead) return <Text>{t('common.forbidden')}</Text>;
  if (isLoading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !current) return <Text>{t('erru.ncr.notFound')}</Text>;

  const label = (classifier: string, code: string | null | undefined) =>
    code ? (getValue(classifier, code)?.name ?? code) : '—';

  const isInbound = current.direction === 'incoming';
  const requestEditable = isNcrRequestEditable(current) && canCreate;
  const responseEditable = isNcrResponseEditable(current) && canRespond;
  const requestSendable = isNcrRequestSendable(current) && canSend;
  const responseSendable = isNcrResponseSendable(current) && canSend;

  const doSend = async () => {
    setSendError(null);
    setSending(true);
    try {
      await sendNcrRequest(current.businessCaseId);
      await reload();
    } catch (e) {
      setSendError(t('erru.ncr.form.sendFailed'));
      console.error('NCR send failed', e);
      await reload();
    } finally {
      setSending(false);
    }
  };

  const doSendResponse = async () => {
    setSendError(null);
    setSending(true);
    try {
      await sendNcrResponse(current.businessCaseId);
      await reload();
    } catch (e) {
      setSendError(t('erru.ncr.form.sendFailed'));
      console.error('NCR response send failed', e);
      await reload();
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">
              {isInbound ? t('erru.ncr.form.titleInbound') : t('erru.ncr.form.titleOutgoing')}
              {' — '}
              {current.businessCaseId}
            </Heading>
            <StatusBadge>{label('NCR_REQUEST_STATUS', current.status)}</StatusBadge>
          </div>
          <Text>{t('erru.ncr.form.version', { version: current.version })}</Text>
          {current.errorMessage && <Text modifiers="bold">{current.errorMessage}</Text>}
          {current.ackStatusCode && (
            <DetailRow label={t('erru.ncr.form.ackStatusCode')} value={label('NCR_ACK_STATUS', current.ackStatusCode)} />
          )}
        </Card.Content>
      </Card>

      {requestEditable && (
        <form onSubmit={requestForm.formik.handleSubmit}>
          <NcrRequestFields form={requestForm} />
          {requestForm.formError && <Text modifiers="bold">{requestForm.formError}</Text>}
          <div className="page-actions">
            <div className="page-actions-buttons">
              <Button visualType="secondary" onClick={() => navigate('/erru/ncr')}>
                {t('common.back')}
              </Button>
              <Button type="submit" disabled={requestForm.formik.isSubmitting}>
                {t('common.save')}
              </Button>
              {requestSendable && (
                <Button type="button" onClick={doSend} disabled={sending}>
                  {t('erru.ncr.form.send')}
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {!requestEditable && responseEditable && (
        <form onSubmit={responseForm.formik.handleSubmit}>
          <NcrResponseFields form={responseForm} />
          {responseForm.formError && <Text modifiers="bold">{responseForm.formError}</Text>}
          <div className="page-actions">
            <div className="page-actions-buttons">
              <Button visualType="secondary" onClick={() => navigate('/erru/ncr')}>
                {t('common.back')}
              </Button>
              <Button type="submit" disabled={responseForm.formik.isSubmitting}>
                {t('common.save')}
              </Button>
              {responseSendable && (
                <Button type="button" onClick={doSendResponse} disabled={sending}>
                  {t('erru.ncr.form.sendResponse')}
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {!requestEditable && !responseEditable && (
        <>
          <Card className="mt-05">
            <Card.Content>
              <Heading element="h2">{t('erru.ncr.form.headerBlock')}</Heading>
              <DetailRow label={t('erru.ncr.form.ncrFrom')} value={label('COUNTRY', current.ncrFrom)} />
              <DetailRow label={t('erru.ncr.form.ncrTo')} value={label('COUNTRY', current.ncrTo)} />
              <DetailRow label={t('erru.ncr.form.originatingAuthority')} value={current.originatingAuthority} />
              <DetailRow label={t('erru.ncr.form.transportUndertakingName')} value={current.transportUndertakingName} />
              <DetailRow label={t('erru.ncr.form.communityLicenceNumber')} value={current.communityLicenceNumber} />
              <DetailRow label={t('erru.ncr.form.vehicleRegistrationNumber')} value={current.vehicleRegistrationNumber} />
              <DetailRow label={t('erru.ncr.form.vehicleRegistrationCountry')} value={label('COUNTRY', current.vehicleRegistrationCountry)} />

              <Heading element="h2">{t('erru.ncr.form.checkSummaryBlock')}</Heading>
              <DetailRow label={t('erru.ncr.form.checkResult')} value={label('NCR_CHECK_RESULT', current.checkResult)} />
              <DetailRow label={t('erru.ncr.form.checkDate')} value={current.checkDate} />

              {current.seriousInfringements.length > 0 && (
                <>
                  <Heading element="h2">{t('erru.ncr.form.seriousInfringementsBlock')}</Heading>
                  {current.seriousInfringements.map((si, idx) => (
                    <Card key={idx} className="mt-05">
                      <Card.Content>
                        <DetailRow label={t('erru.ncr.form.infringementCategory')} value={label('NCR_INFRINGEMENT_CATEGORY', si.category)} />
                        <DetailRow label={t('erru.ncr.form.infringementType')} value={si.infringementType} />
                        <DetailRow label={t('erru.ncr.form.infringementDate')} value={si.dateOfInfringement} />
                        <DetailRow label={t('erru.ncr.form.appealPossible')} value={si.appealPossible ? t('common.yes') : t('common.no')} />
                      </Card.Content>
                    </Card>
                  ))}
                </>
              )}

              {current.responseStatusCode && (
                <>
                  <Heading element="h2">{t('erru.ncr.form.responseBlock')}</Heading>
                  <DetailRow label={t('erru.ncr.form.respondingAuthority')} value={current.respondingAuthority} />
                  <DetailRow label={t('erru.ncr.form.responseStatusCode')} value={label('NCR_RESPONSE_STATUS', current.responseStatusCode)} />
                  {current.responseStatusMessage && (
                    <DetailRow label={t('erru.ncr.form.responseStatusMessage')} value={current.responseStatusMessage} />
                  )}
                  {current.responseCommunityLicenceStatus && (
                    <DetailRow label={t('erru.ncr.form.responseCommunityLicenceStatus')} value={label('NCR_COMMUNITY_LICENCE_STATUS', current.responseCommunityLicenceStatus)} />
                  )}
                </>
              )}
            </Card.Content>
          </Card>

          {sendError && <Text modifiers="bold">{sendError}</Text>}

          <div className="page-actions">
            <div className="page-actions-buttons">
              <Button visualType="secondary" onClick={() => navigate('/erru/ncr')}>
                {t('common.back')}
              </Button>
              {requestSendable && (
                <Button type="button" onClick={doSend} disabled={sending}>
                  {t('erru.ncr.form.send')}
                </Button>
              )}
              {responseSendable && (
                <Button type="button" onClick={doSendResponse} disabled={sending}>
                  {t('erru.ncr.form.sendResponse')}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2">{t('erru.ncr.form.historyBlock')}</Heading>
          {snapshots.map((s) => (
            <div key={`${s.id}-${s.version}`} className="detail-row">
              <Text modifiers="bold">{t('erru.ncr.form.historyVersion', { version: s.version })}</Text>
              <Text>{label('NCR_REQUEST_STATUS', s.status)}</Text>
              <Text>{s.sentAt ? new Date(s.sentAt).toLocaleString('et-EE') : '—'}</Text>
            </div>
          ))}
        </Card.Content>
      </Card>
    </div>
  );
}
