import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, StatusBadge, Text } from '@tedi-design-system/react/tedi';
import type { CgrMemberState, CgrRequest } from '../../types';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { CgrField as Field } from './CgrField';

/**
 * Read-only "Päringu vastus" block for CGR (LJVIS2-139). Unlike CTUD (single response),
 * a CGR send can return several entries — one per targeted member state (up to all member
 * states for a broadcast, cgrTo='ZZ'). The handler reads the answer top to bottom, so the
 * entries are grouped by what needs attention instead of listed as collapsed accordions:
 *
 *  1. 'Found'                  — fully expanded cards (transportManagerDetails are shown only here)
 *  2. 'NotFound'               — one compact line per country, two columns
 *  3. 'Timeout' / 'NotAvailable' — one line with the reason, so a targeted re-query is one click away
 *
 * "Saada uuesti" is offered per member state while the request is 'sent' or 'responded' — the
 * new answer replaces only that entry (see resendCgrRequest), the rest of the answers are untouched.
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

  const canResend = canSend && (request.status === 'sent' || request.status === 'responded') && !!onResend;

  const found = states.filter((ms) => ms.statusCode === 'Found');
  const notFound = states.filter((ms) => ms.statusCode === 'NotFound');
  const failed = states.filter((ms) => ms.statusCode === 'Timeout' || ms.statusCode === 'NotAvailable');

  const countryName = (ms: CgrMemberState) =>
    `${label('COUNTRY', ms.memberStateCode) || ms.memberStateCode} (${ms.memberStateCode})`;

  const resendButton = (ms: CgrMemberState) =>
    canResend && (
      <Button
        visualType="secondary"
        size="small"
        disabled={resendingCountry === ms.memberStateCode}
        onClick={() => onResend?.(ms.memberStateCode)}
      >
        {t('erru.cgr.form.resend')}
      </Button>
    );

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2" className="mb-1">{t('erru.cgr.response.title')}</Heading>
        <div className="cgr-summary">
          {found.length > 0 && (
            <StatusBadge color="brand">{t('erru.cgr.response.summaryFound', { count: found.length })}</StatusBadge>
          )}
          {notFound.length > 0 && (
            <StatusBadge color="warning">{t('erru.cgr.response.summaryNotFound', { count: notFound.length })}</StatusBadge>
          )}
          {failed.length > 0 && (
            <StatusBadge color="danger">{t('erru.cgr.response.summaryFailed', { count: failed.length })}</StatusBadge>
          )}
        </div>

        {found.length > 0 && (
          <section>
            <Heading element="h3" className="cgr-group-title">{t('erru.cgr.response.foundTitle')}</Heading>
            {found.map((ms) => (
              <div key={ms.memberStateCode} className="cgr-found" id={`cgr-member-state-${ms.memberStateCode}`}>
                <div className="cgr-found__header">
                  <Text modifiers="bold">
                    {countryName(ms)}
                    {' — '}
                    {label('CGR_MEMBER_STATE_STATUS', ms.statusCode)}
                  </Text>
                  <StatusBadge color="brand" variant="bordered">{t('erru.cgr.response.foundBadge')}</StatusBadge>
                  {ms.transportManagerDetails?.respondingAuthority && (
                    <Text color="secondary">
                      {label('COMPETENT_AUTHORITY', ms.transportManagerDetails.respondingAuthority)}
                    </Text>
                  )}
                  <div className="cgr-found__action">{resendButton(ms)}</div>
                </div>
                <CgrMemberStateDetails memberState={ms} />
              </div>
            ))}
          </section>
        )}

        {notFound.length > 0 && (
          <section>
            <Heading element="h3" className="cgr-group-title">{t('erru.cgr.response.notFoundTitle')}</Heading>
            <div className="cgr-notfound">
              {notFound.map((ms) => (
                <div key={ms.memberStateCode} className="cgr-line cgr-line--notfound" id={`cgr-member-state-${ms.memberStateCode}`}>
                  <Text modifiers="bold">{countryName(ms)}</Text>
                  {resendButton(ms)}
                </div>
              ))}
            </div>
          </section>
        )}

        {failed.length > 0 && (
          <section>
            <Heading element="h3" className="cgr-group-title">{t('erru.cgr.response.failedTitle')}</Heading>
            {failed.map((ms) => (
              <div key={ms.memberStateCode} className="cgr-line cgr-line--failed" id={`cgr-member-state-${ms.memberStateCode}`}>
                <Text modifiers="bold">
                  {countryName(ms)}
                  {' — '}
                  {label('CGR_MEMBER_STATE_STATUS', ms.statusCode)}
                </Text>
                {resendButton(ms)}
              </div>
            ))}
          </section>
        )}
      </Card.Content>
    </Card>
  );
}

function CgrMemberStateDetails({ memberState }: { memberState: CgrMemberState }) {
  const { t } = useTranslation();
  const { label } = useClassifierLabel();
  const tm = memberState.transportManagerDetails;

  if (!tm && !memberState.statusMessage) return null;

  return (
    <div className="cgr-found__body">
      <div className="cgr-fields">
        {memberState.statusMessage && (
          <Field label={t('erru.cgr.response.statusMessage')} value={memberState.statusMessage} />
        )}
        {tm && (
          <Field label={t('erru.cgr.response.searchMethod')} value={label('CGR_SEARCH_METHOD', tm.searchMethod)} />
        )}
      </div>

      {tm?.nameDetails && (
        <>
          <Heading element="h4" className="cgr-block-title">{t('erru.cgr.form.nameBlock')}</Heading>
          <div className="cgr-fields">
            <Field label={t('erru.cgr.form.tmFirstName')} value={tm.nameDetails.firstName} />
            <Field label={t('erru.cgr.form.tmFamilyName')} value={tm.nameDetails.familyName} />
            <Field label={t('erru.cgr.form.tmDateOfBirth')} value={tm.nameDetails.dateOfBirth} />
            <Field label={t('erru.cgr.form.tmPlaceOfBirth')} value={tm.nameDetails.placeOfBirth} />
            {tm.addressDetails && (
              <>
                <Field label={t('erru.cgr.response.street')} value={tm.addressDetails.address} />
                <Field label={t('erru.cgr.response.postCode')} value={tm.addressDetails.postCode} />
                <Field label={t('erru.cgr.response.city')} value={tm.addressDetails.city} />
                <Field label={t('erru.cgr.response.country')} value={label('COUNTRY', tm.addressDetails.country)} />
              </>
            )}
          </div>
        </>
      )}

      {!tm?.nameDetails && tm?.addressDetails && (
        <>
          <Heading element="h4" className="cgr-block-title">{t('erru.cgr.response.address')}</Heading>
          <div className="cgr-fields">
            <Field label={t('erru.cgr.response.street')} value={tm.addressDetails.address} />
            <Field label={t('erru.cgr.response.postCode')} value={tm.addressDetails.postCode} />
            <Field label={t('erru.cgr.response.city')} value={tm.addressDetails.city} />
            <Field label={t('erru.cgr.response.country')} value={label('COUNTRY', tm.addressDetails.country)} />
          </div>
        </>
      )}

      {tm?.certificateDetails && (
        <>
          <Heading element="h4" className="cgr-block-title">{t('erru.cgr.form.certificateBlock')}</Heading>
          <div className="cgr-fields">
            <Field label={t('erru.cgr.form.certificateNumber')} value={tm.certificateDetails.certificateNumber} />
            <Field label={t('erru.cgr.form.certificateIssueDate')} value={tm.certificateDetails.certificateIssueDate} />
            <Field
              label={t('erru.cgr.form.certificateIssueCountry')}
              value={label('COUNTRY', tm.certificateDetails.certificateIssueCountry)}
            />
            <Field
              label={t('erru.cgr.response.certificateValidity')}
              value={label('CERTIFICATE_VALIDITY', tm.certificateDetails.certificateValidity)}
            />
            {tm.certificateDetails.fitness && (
              <>
                <Field
                  label={t('erru.cgr.response.fitnessStatus')}
                  value={label('FITNESS_STATUS', tm.certificateDetails.fitness.fitnessStatus)}
                />
                <Field label={t('erru.cgr.response.unfitStartDate')} value={tm.certificateDetails.fitness.unfitStartDate} />
                <Field label={t('erru.cgr.response.unfitEndDate')} value={tm.certificateDetails.fitness.unfitEndDate} />
              </>
            )}
          </div>
        </>
      )}

      {tm?.transportUndertakings && (
        <>
          <Heading element="h4" className="cgr-block-title">{t('erru.cgr.response.transportUndertakings')}</Heading>
          <div className="cgr-fields">
            <Field
              label={t('erru.cgr.response.totalManagedUndertakings')}
              value={tm.transportUndertakings.totalManagedUndertakings}
            />
            <Field
              label={t('erru.cgr.response.totalManagedVehicles')}
              value={tm.transportUndertakings.totalManagedVehicles}
            />
          </div>
          {!!tm.transportUndertakings.undertaking?.length && (
            <div className="cgr-undertakings">
              <div className="table-row-4">
                <Text modifiers="bold">{t('erru.cgr.response.undertakingName')}</Text>
                <Text modifiers="bold">{t('erru.cgr.response.licenceNumber')}</Text>
                <Text modifiers="bold">{t('erru.cgr.response.licenceStatus')}</Text>
                <Text modifiers="bold">{t('erru.cgr.response.vehicles')}</Text>
              </div>
              {tm.transportUndertakings.undertaking.map((u, i) => (
                <div key={`${u.communityLicenceNumber}-${i}`} className="table-row-4">
                  <Text>{u.transportUndertakingName ?? '—'}</Text>
                  <Text>{u.communityLicenceNumber ?? '—'}</Text>
                  <Text>{label('COMMUNITY_LICENCE_STATUS', u.communityLicenceStatus)}</Text>
                  <Text>{u.numberOfVehicles ?? '—'}</Text>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
