import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Text, StatusBadge } from '@tedi-design-system/react/tedi';
import { useNcrCase } from './useNcrCase';
import { useNcrRequestForm } from './useNcrRequestForm';
import { useNcrResponseForm } from './useNcrResponseForm';
import { NcrRequestFields } from '../../components/Ncr/NcrRequestFields';
import { NcrResponseFields } from '../../components/Ncr/NcrResponseFields';
import { DetailRow } from '../../components/shared/DetailRow';
import {
  isNcrRequestEditable,
  isNcrRequestSendable,
  isNcrResponseEditable,
  isNcrResponseSendable,
} from '../../types';
import { sendNcrRequest, sendNcrResponse } from '../../api';
import { createVrFormFromNcr } from '../../../control-forms/api';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { useOrganisations } from '../../../organisations/hooks';

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
  const location = useLocation();
  const { hasAnyPermission } = useAuth();
  const { label } = useClassifierLabel();
  const { organisations } = useOrganisations();
  const authorityLabel = (code: string | null) =>
    code ? (organisations.find((o) => o.code === code)?.name ?? code) : '—';
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [creatingVr, setCreatingVr] = useState(false);
  const [createVrError, setCreateVrError] = useState<string | null>(null);

  const canRead = hasAnyPermission(['ncr.read']);
  const canCreate = hasAnyPermission(['ncr.create']);
  const canRespond = hasAnyPermission(['ncr.respond']);
  const canSend = hasAnyPermission(['ncr.send']);
  const canCreateVr = hasAnyPermission(['foreign_violation_form.write']);

  const { current, snapshots, isLoading, notFound, reload } = useNcrCase(businessCaseId);
  const [savedOk, setSavedOk] = useState(
    !!(location.state as { justSaved?: boolean } | null)?.justSaved,
  );

  const requestForm = useNcrRequestForm(current, () => { setSavedOk(true); reload(); });
  const responseForm = useNcrResponseForm(current, () => { setSavedOk(true); reload(); });

  if (!canRead) return <Text>{t('common.forbidden')}</Text>;
  if (isLoading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !current) return <Text>{t('erru.ncr.notFound')}</Text>;

  const isInbound = current.direction === 'incoming';
  const requestEditable = isNcrRequestEditable(current) && canCreate;
  const responseEditable = isNcrResponseEditable(current) && canRespond;
  const requestSendable = isNcrRequestSendable(current) && canSend;
  const responseSendable = isNcrResponseSendable(current) && canSend;

  const doSend = async () => {
    setSavedOk(false);
    setSendError(null);
    setSending(true);
    window.scrollTo(0, 0);
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

  const doCreateVr = async () => {
    setCreateVrError(null);
    setCreatingVr(true);
    try {
      const res = await createVrFormFromNcr(current.businessCaseId);
      const newId = res?.[0]?.id;
      if (newId) {
        navigate(`/control-forms/foreign-violation/${newId}`, {
          state: { justCreated: true },
        });
      }
    } catch (e) {
      setCreateVrError(t('erru.ncr.form.createVrFailed'));
      console.error('Create VR from NCR failed', e);
    } finally {
      setCreatingVr(false);
    }
  };

  const doSendResponse = async () => {
    setSavedOk(false);
    setSendError(null);
    setSending(true);
    window.scrollTo(0, 0);
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
      {createVrError && (
        <Alert
          type="danger"
          size="small"
          className="mt-05"
          onClose={() => setCreateVrError(null)}
        >
          {createVrError}
        </Alert>
      )}
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">
              {isInbound
                ? t('erru.ncr.form.titleInbound')
                : t('erru.ncr.form.titleOutgoing')}
              {' — '}
              {current.businessCaseId}
            </Heading>
            <StatusBadge>
              {label('NCR_REQUEST_STATUS', current.status)}
            </StatusBadge>
          </div>
          <Text>
            {t('erru.ncr.form.version', { version: current.version })}
          </Text>
          {current.errorMessage && (
            <Text modifiers="bold">{current.errorMessage}</Text>
          )}
          {current.ackStatusCode && (
            <DetailRow
              label={t('erru.ncr.form.ackStatusCode')}
              value={label('NCR_ACK_STATUS', current.ackStatusCode)}
            />
          )}
        </Card.Content>
      </Card>

      {requestEditable && (
        <form onSubmit={requestForm.formik.handleSubmit}>
          <NcrRequestFields form={requestForm} />
          {requestForm.formError && (
            <Alert
              type="danger"
              size="small"
              className="mt-05"
              onClose={() => requestForm.clearFormError()}
            >
              {requestForm.formError}
            </Alert>
          )}
          {requestForm.formik.submitCount > 0 &&
            Object.keys(requestForm.formik.errors).length > 0 && (
              <Alert type="danger" size="small" className="mt-05">
                {t('common.formHasErrors')}
              </Alert>
            )}
          <div className="page-actions">
            <div className="page-actions-buttons">

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
          <NcrResponseFields
            form={responseForm}
            message={current}
            organisations={organisations}
          />
          {responseForm.formError && (
            <Alert
              type="danger"
              size="small"
              className="mt-05"
              onClose={() => responseForm.clearFormError()}
            >
              {responseForm.formError}
            </Alert>
          )}
          {responseForm.formik.submitCount > 0 &&
            Object.keys(responseForm.formik.errors).length > 0 && (
              <Alert type="danger" size="small" className="mt-05">
                {t('common.formHasErrors')}
              </Alert>
            )}
          <div className="page-actions">
            <div className="page-actions-buttons">

              <Button type="submit" disabled={responseForm.formik.isSubmitting}>
                {t('common.save')}
              </Button>
              {responseSendable && (
                <Button
                  type="button"
                  onClick={doSendResponse}
                  disabled={sending}
                >
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
              <Heading element="h2" className="mb-1">
                {t('erru.ncr.form.headerBlock')}
              </Heading>
              <DetailRow
                label={t('erru.ncr.form.ncrFrom')}
                value={label('COUNTRY', current.ncrFrom)}
              />
              <DetailRow
                label={t('erru.ncr.form.ncrTo')}
                value={label('COUNTRY', current.ncrTo)}
              />
              <DetailRow
                label={t('erru.ncr.form.originatingAuthority')}
                value={authorityLabel(current.originatingAuthority)}
              />
              <DetailRow
                label={t('erru.ncr.form.requestSource')}
                value={label('NCR_REQUEST_SOURCE', current.requestSource)}
              />
              <DetailRow
                label={t('erru.ncr.form.requestPurpose')}
                value={label('NCR_REQUEST_PURPOSE', current.requestPurpose)}
              />
              <DetailRow
                label={t('erru.ncr.form.transportUndertakingName')}
                value={current.transportUndertakingName}
              />
              <DetailRow
                label={t('erru.ncr.form.communityLicenceNumber')}
                value={current.communityLicenceNumber}
              />
              <DetailRow
                label={t('erru.ncr.form.vehicleRegistrationNumber')}
                value={current.vehicleRegistrationNumber}
              />
              <div className="mb-1">
                <DetailRow
                  label={t('erru.ncr.form.vehicleRegistrationCountry')}
                  value={label('COUNTRY', current.vehicleRegistrationCountry)}
                />
              </div>

              <Heading element="h2" className="mb-1">
                {t('erru.ncr.form.checkSummaryBlock')}
              </Heading>
              <DetailRow
                label={t('erru.ncr.form.checkResult')}
                value={label('NCR_CHECK_RESULT', current.checkResult)}
              />
              <div className="mb-1">
                <DetailRow
                  label={t('erru.ncr.form.checkDate')}
                  value={current.checkDate}
                />
              </div>

              {current.seriousInfringements.length > 0 && (
                <>
                  <Heading element="h2" className="mb-1">
                    {t('erru.ncr.form.seriousInfringementsBlock')}
                  </Heading>
                  {current.seriousInfringements.map((si, idx) => (
                    <Card key={idx} className="mt-05">
                      <Card.Content>
                        <DetailRow
                          label={t('erru.ncr.form.infringementCategory')}
                          value={label(
                            'NCR_INFRINGEMENT_CATEGORY',
                            si.category,
                          )}
                        />
                        <DetailRow
                          label={t('erru.ncr.form.infringementType')}
                          value={
                            si.infringementType
                              ? `${si.infringementType} – ${label('EU_INFRINGEMENT', si.infringementType)}`
                              : '—'
                          }
                        />
                        <DetailRow
                          label={t('erru.ncr.form.infringementDate')}
                          value={si.dateOfInfringement}
                        />
                        <DetailRow
                          label={t('erru.ncr.form.appealPossible')}
                          value={
                            si.appealPossible ? t('common.yes') : t('common.no')
                          }
                        />
                      </Card.Content>
                    </Card>
                  ))}
                </>
              )}

              {current.responseStatusCode && (
                <>
                  <Heading element="h2">
                    {t('erru.ncr.form.responseBlock')}
                  </Heading>
                  <DetailRow
                    label={t('erru.ncr.form.respondingMemberState')}
                    value={label('COUNTRY', current.ncrTo)}
                  />
                  <DetailRow
                    label={t('erru.ncr.form.respondingAuthority')}
                    value={authorityLabel(current.respondingAuthority)}
                  />
                  <DetailRow
                    label={t('erru.ncr.form.ncrTo')}
                    value={label('COUNTRY', current.ncrFrom)}
                  />
                  <DetailRow
                    label={t('erru.ncr.form.targetAuthority')}
                    value={authorityLabel(current.originatingAuthority)}
                  />
                  <DetailRow
                    label={t('erru.ncr.form.messageNumber')}
                    value={current.businessCaseId}
                  />
                  <DetailRow
                    label={t('erru.ncr.form.messageDate')}
                    value={
                      current.createdAt
                        ? new Date(current.createdAt).toLocaleDateString('et-EE')
                        : '—'
                    }
                  />
                  <DetailRow
                    label={t('erru.ncr.form.messageTime')}
                    value={
                      current.createdAt
                        ? new Date(current.createdAt).toLocaleTimeString('et-EE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'
                    }
                  />
                  <DetailRow
                    label={t('erru.ncr.form.transportUndertakingName')}
                    value={current.transportUndertakingName}
                  />
                  <DetailRow
                    label={t('erru.ncr.form.communityLicenceNumber')}
                    value={current.communityLicenceNumber}
                  />
                  <DetailRow
                    label={t('erru.ncr.form.responseStatusCode')}
                    value={label(
                      'NCR_RESPONSE_STATUS',
                      current.responseStatusCode,
                    )}
                  />
                  {current.responseStatusMessage && (
                    <DetailRow
                      label={t('erru.ncr.form.responseStatusMessage')}
                      value={current.responseStatusMessage}
                    />
                  )}
                  {current.responseNumberOfVehicles != null && (
                    <DetailRow
                      label={t('erru.ncr.form.responseNumberOfVehicles')}
                      value={String(current.responseNumberOfVehicles)}
                    />
                  )}
                  {current.responseCommunityLicenceStatus && (
                    <DetailRow
                      label={t('erru.ncr.form.responseCommunityLicenceStatus')}
                      value={label(
                        'NCR_COMMUNITY_LICENCE_STATUS',
                        current.responseCommunityLicenceStatus,
                      )}
                    />
                  )}

                  {current.responseAddress &&
                    (current.responseAddress.address ||
                      current.responseAddress.postCode ||
                      current.responseAddress.city ||
                      current.responseAddress.country) && (
                      <>
                        <Heading element="h3" className="mt-1 mb-1">
                          {t('erru.ncr.form.responseAddressBlock')}
                        </Heading>
                        <DetailRow
                          label={t('erru.ncr.form.responseAddressStreet')}
                          value={current.responseAddress.address}
                        />
                        <DetailRow
                          label={t('erru.ncr.form.responseAddressPostCode')}
                          value={current.responseAddress.postCode}
                        />
                        <DetailRow
                          label={t('erru.ncr.form.responseAddressCity')}
                          value={current.responseAddress.city}
                        />
                        <DetailRow
                          label={t('erru.ncr.form.responseAddressCountry')}
                          value={
                            current.responseAddress.country
                              ? label('COUNTRY', current.responseAddress.country)
                              : '—'
                          }
                        />
                      </>
                    )}

                  {!!current.responsePenaltiesImposed?.length && (
                    <>
                      <Heading element="h3" className="mt-1 mb-1">
                        {t('erru.ncr.form.penaltiesImposedResponseBlock')}
                      </Heading>
                      {current.responsePenaltiesImposed.map((p, idx) => (
                        <Card key={idx} className="mt-05">
                          <Card.Content>
                            <DetailRow
                              label={t(
                                'erru.ncr.form.penaltyRequestedIdentifier',
                              )}
                              value={p.penaltyRequestedIdentifier}
                            />
                            <DetailRow
                              label={t('erru.ncr.form.authorityImposingPenalty')}
                              value={authorityLabel(p.authorityImposingPenalty)}
                            />
                            <DetailRow
                              label={t('erru.ncr.form.isImposed')}
                              value={
                                p.isImposed ? t('common.yes') : t('common.no')
                              }
                            />
                            {p.isImposed && (
                              <>
                                <DetailRow
                                  label={t('erru.ncr.form.penaltyTypeImposed')}
                                  value={
                                    p.penaltyTypeImposed
                                      ? label(
                                          'NCR_PENALTY_TYPE_IMPOSED_REQ',
                                          p.penaltyTypeImposed,
                                        )
                                      : '—'
                                  }
                                />
                                {p.startDate && (
                                  <DetailRow
                                    label={t('erru.ncr.form.penaltyStartDate')}
                                    value={p.startDate}
                                  />
                                )}
                                {p.endDate && (
                                  <DetailRow
                                    label={t('erru.ncr.form.penaltyEndDate')}
                                    value={p.endDate}
                                  />
                                )}
                              </>
                            )}
                            {!p.isImposed && p.reason && (
                              <DetailRow
                                label={t('erru.ncr.form.penaltyReason')}
                                value={p.reason}
                              />
                            )}
                          </Card.Content>
                        </Card>
                      ))}
                    </>
                  )}
                </>
              )}
            </Card.Content>
          </Card>

          {sendError && <Text modifiers="bold">{sendError}</Text>}

          <div className="page-actions">
            <div className="page-actions-buttons">

              {requestSendable && (
                <Button type="button" onClick={doSend} disabled={sending}>
                  {t('erru.ncr.form.send')}
                </Button>
              )}
              {responseSendable && (
                <Button
                  type="button"
                  onClick={doSendResponse}
                  disabled={sending}
                >
                  {t('erru.ncr.form.sendResponse')}
                </Button>
              )}
              {canCreateVr && isInbound && !current.linkedForeignViolationFormKey && (
                <Button
                  type="button"
                  visualType="secondary"
                  iconLeft="add"
                  onClick={doCreateVr}
                  disabled={creatingVr}
                >
                  {t('erru.ncr.form.createVr')}
                </Button>
              )}
              {canCreateVr && isInbound && current.linkedForeignViolationFormKey && (
                <Button
                  type="button"
                  visualType="secondary"
                  onClick={() =>
                    navigate(
                      `/control-forms/foreign-violation/${current.linkedForeignViolationFormKey}`,
                    )
                  }
                >
                  {t('erru.ncr.form.openVr')}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      <Card>
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.ncr.form.historyBlock')}
          </Heading>
          {/* Column headers */}
          <div className="table-row-4">
            <Text modifiers="bold">{t('erru.ncr.form.historyType')}</Text>
            <Text modifiers="bold">{t('erru.ncr.form.historyDirection')}</Text>
            <Text modifiers="bold">{t('erru.ncr.form.historyStatus')}</Text>
            <Text modifiers="bold">{t('erru.ncr.form.historySentAt')}</Text>
          </div>
          {snapshots.map((s, idx) => {
            // A snapshot carries response content once the responding authority is set.
            const isResponseSnapshot = !!(
              s.respondingAuthority || s.responseStatusCode
            );
            return (
              <div
                key={`${s.id}-${s.version}`}
                className={
                  idx < snapshots.length - 1
                    ? 'table-row-4 mb-1'
                    : 'table-row-4'
                }
              >
                <Text>
                  {isResponseSnapshot
                    ? t('erru.ncr.form.historyTypeResponse')
                    : t('erru.ncr.form.historyTypeRequest')}
                </Text>
                <Text>
                  {s.direction === 'outgoing'
                    ? t('erru.ncr.list.directionOutgoing')
                    : t('erru.ncr.list.directionIncoming')}
                </Text>
                <Text>{label('NCR_REQUEST_STATUS', s.status)}</Text>
                <Text>
                  {s.sentAt ? new Date(s.sentAt).toLocaleString('et-EE') : '—'}
                </Text>
              </div>
            );
          })}
        </Card.Content>
      </Card>
    </div>
  );
}
