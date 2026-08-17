import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionItem,
  AccordionItemContent,
  AccordionItemHeader,
  Button,
  Card,
  Heading,
  Text,
} from '@tedi-design-system/react/tedi';
import type { CgrMemberState, CgrRequest } from '../../types';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { DetailRow } from '../shared/DetailRow';

/**
 * Read-only "Päringu vastus" block for CGR (LJVIS2-139). Unlike CTUD (single response),
 * a CGR send can return several entries — one per targeted member state, up to four for
 * a broadcast (cgrTo='ZZ'). Each entry is its own accordion item so the list stays
 * scannable; transportManagerDetails (name/address/certificate/fitness/undertakings) are
 * shown only for statusCode='Found'.
 *
 * "Saada uuesti" is offered per member state while the request is still 'sent' — it
 * replaces only that entry (see resendCgrRequest), the rest of the answers are untouched.
 */
export function CgrMemberStatesTable({
  request,
  canSend,
  onResend,
  resendingCountry,
}: {
  request: CgrRequest;
  canSend: boolean;
  onResend?: (memberStateCode: string) => void;
  resendingCountry?: string | null;
}) {
  const { t } = useTranslation();
  const { label } = useClassifierLabel();

  const states = request.memberStates;
  if (!states || states.length === 0) return null;

  const canResend = canSend && request.status === 'sent' && !!onResend;

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2">{t('erru.cgr.response.title')}</Heading>
        <Accordion>
          {states.map((ms) => (
            <AccordionItem key={ms.memberStateCode} id={`cgr-member-state-${ms.memberStateCode}`}>
              <AccordionItemHeader
                closeText={t('common.close')}
                openText={t('common.look')}
                titleLayout="fill"
                headerClickable={!canResend}
                title={
                  <Text modifiers="bold">
                    {label('COUNTRY', ms.memberStateCode) || ms.memberStateCode}
                    {' — '}
                    {label('CGR_MEMBER_STATE_STATUS', ms.statusCode)}
                  </Text>
                }
                endAction={
                  canResend && (
                    <Button
                      visualType="secondary"
                      disabled={resendingCountry === ms.memberStateCode}
                      onClick={() => onResend?.(ms.memberStateCode)}
                    >
                      {t('erru.cgr.form.resend')}
                    </Button>
                  )
                }
              />
              <AccordionItemContent>
                <CgrMemberStateDetails memberState={ms} />
              </AccordionItemContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card.Content>
    </Card>
  );
}

function CgrMemberStateDetails({ memberState }: { memberState: CgrMemberState }) {
  const { t } = useTranslation();
  const { label } = useClassifierLabel();
  const tm = memberState.transportManagerDetails;

  return (
    <>
      {memberState.statusMessage && (
        <DetailRow
          label={t('erru.cgr.response.statusMessage')}
          value={memberState.statusMessage}
        />
      )}
      {tm && (
        <>
          <DetailRow
            label={t('erru.cgr.response.respondingAuthority')}
            value={label('COMPETENT_AUTHORITY', tm.respondingAuthority)}
          />
          <DetailRow
            label={t('erru.cgr.response.searchMethod')}
            value={label('CGR_SEARCH_METHOD', tm.searchMethod)}
          />

          {tm.nameDetails && (
            <>
              <Heading element="h3">{t('erru.cgr.form.nameBlock')}</Heading>
              <DetailRow label={t('erru.cgr.form.tmFirstName')} value={tm.nameDetails.firstName} />
              <DetailRow label={t('erru.cgr.form.tmFamilyName')} value={tm.nameDetails.familyName} />
              <DetailRow
                label={t('erru.cgr.form.tmDateOfBirth')}
                value={tm.nameDetails.dateOfBirth}
              />
              <DetailRow
                label={t('erru.cgr.form.tmPlaceOfBirth')}
                value={tm.nameDetails.placeOfBirth}
              />
            </>
          )}

          {tm.addressDetails && (
            <>
              <Heading element="h3">{t('erru.cgr.response.address')}</Heading>
              <DetailRow label={t('erru.cgr.response.street')} value={tm.addressDetails.address} />
              <DetailRow
                label={t('erru.cgr.response.postCode')}
                value={tm.addressDetails.postCode}
              />
              <DetailRow label={t('erru.cgr.response.city')} value={tm.addressDetails.city} />
              <DetailRow
                label={t('erru.cgr.response.country')}
                value={label('COUNTRY', tm.addressDetails.country)}
              />
            </>
          )}

          {tm.certificateDetails && (
            <>
              <Heading element="h3">{t('erru.cgr.form.certificateBlock')}</Heading>
              <DetailRow
                label={t('erru.cgr.form.certificateNumber')}
                value={tm.certificateDetails.certificateNumber}
              />
              <DetailRow
                label={t('erru.cgr.form.certificateIssueDate')}
                value={tm.certificateDetails.certificateIssueDate}
              />
              <DetailRow
                label={t('erru.cgr.form.certificateIssueCountry')}
                value={label('COUNTRY', tm.certificateDetails.certificateIssueCountry)}
              />
              <DetailRow
                label={t('erru.cgr.response.certificateValidity')}
                value={label('CERTIFICATE_VALIDITY', tm.certificateDetails.certificateValidity)}
              />
              {tm.certificateDetails.fitness && (
                <>
                  <DetailRow
                    label={t('erru.cgr.response.fitnessStatus')}
                    value={label('FITNESS_STATUS', tm.certificateDetails.fitness.fitnessStatus)}
                  />
                  <DetailRow
                    label={t('erru.cgr.response.unfitStartDate')}
                    value={tm.certificateDetails.fitness.unfitStartDate}
                  />
                  <DetailRow
                    label={t('erru.cgr.response.unfitEndDate')}
                    value={tm.certificateDetails.fitness.unfitEndDate}
                  />
                </>
              )}
            </>
          )}

          {tm.transportUndertakings && (
            <>
              <Heading element="h3">{t('erru.cgr.response.transportUndertakings')}</Heading>
              <DetailRow
                label={t('erru.cgr.response.totalManagedUndertakings')}
                value={tm.transportUndertakings.totalManagedUndertakings}
              />
              <DetailRow
                label={t('erru.cgr.response.totalManagedVehicles')}
                value={tm.transportUndertakings.totalManagedVehicles}
              />
              {!!tm.transportUndertakings.undertaking?.length && (
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>{t('erru.cgr.response.undertakingName')}</th>
                      <th>{t('erru.cgr.response.licenceNumber')}</th>
                      <th>{t('erru.cgr.response.licenceStatus')}</th>
                      <th>{t('erru.cgr.response.vehicles')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tm.transportUndertakings.undertaking.map((u, i) => (
                      <tr key={`${u.communityLicenceNumber}-${i}`}>
                        <td>{u.transportUndertakingName ?? '—'}</td>
                        <td>{u.communityLicenceNumber ?? '—'}</td>
                        <td>{label('COMMUNITY_LICENCE_STATUS', u.communityLicenceStatus)}</td>
                        <td>{u.numberOfVehicles ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
