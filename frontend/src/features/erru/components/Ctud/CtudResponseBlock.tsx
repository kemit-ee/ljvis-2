import { useTranslation } from 'react-i18next';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import type { CtudRequest } from '../../types';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { DetailRow } from '../shared/DetailRow';

/**
 * Read-only "Päringu vastus" block. Always read-only: the answer comes from an external
 * system and is never composed on this form. Undertaking details are shown only for
 * statusCode = Found; NotFound / Timeout / NotAvailable show the status alone.
 */
export function CtudResponseBlock({ request }: { request: CtudRequest }) {
  const { t } = useTranslation();
  const { label } = useClassifierLabel();

  if (!request.responseStatusCode) return null;
  const rc = request.responseContent;
  const isFound = request.responseStatusCode === 'Found';

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2" className="mb-1">
          {t('erru.ctud.response.title')}
        </Heading>

        <DetailRow
          label={t('erru.ctud.response.statusCode')}
          value={label('CTUD_RESPONSE_STATUS', request.responseStatusCode)}
        />
        {request.responseStatusMessage && (
          <DetailRow
            label={t('erru.ctud.response.statusMessage')}
            value={request.responseStatusMessage}
          />
        )}
        <DetailRow
          label={t('erru.ctud.response.respondingAuthority')}
          value={request.respondingAuthority}
        />

        {isFound && rc && (
          <>
            <Heading element="h3" className="mt-1 mb-1">
              {t('erru.ctud.response.undertaking')}
            </Heading>
            <DetailRow
              label={t('erru.ctud.response.name')}
              value={rc.transportUndertakingName}
            />
            <DetailRow
              label={t('erru.ctud.response.legalForm')}
              value={rc.legalForm}
            />
            <DetailRow
              label={t('erru.ctud.response.employees')}
              value={rc.numberOfEmployees}
            />
            <DetailRow
              label={t('erru.ctud.response.vehicles')}
              value={rc.numberOfVehicles}
            />
            <DetailRow
              label={t('erru.ctud.response.riskRating')}
              value={rc.riskRating}
            />
            <DetailRow
              label={t('erru.ctud.response.riskBand')}
              value={label('RISK_BAND', rc.riskBand)}
            />
            <DetailRow
              label={t('erru.ctud.response.searchMethod')}
              value={label('CTUD_SEARCH_METHOD', rc.searchMethod)}
            />

            {rc.address && (
              <>
                <Heading element="h3" className="mt-1 mb-1">
                  {t('erru.ctud.response.address')}
                </Heading>
                <DetailRow
                  label={t('erru.ctud.response.street')}
                  value={rc.address.address}
                />
                <DetailRow
                  label={t('erru.ctud.response.postCode')}
                  value={rc.address.postCode}
                />
                <DetailRow
                  label={t('erru.ctud.response.city')}
                  value={rc.address.city}
                />
                <DetailRow
                  label={t('erru.ctud.response.country')}
                  value={label('COUNTRY', rc.address.country)}
                />
              </>
            )}

            {!!rc.communityLicenceDetails?.length && (
              <>
                <Heading element="h3" className="mt-1 mb-1">{t('erru.ctud.response.licences')}</Heading>
                <div className="table-row-6">
                  <Text modifiers="bold">{t('erru.ctud.response.licenceNumber')}</Text>
                  <Text modifiers="bold">{t('erru.ctud.response.licenceStatus')}</Text>
                  <Text modifiers="bold">{t('erru.ctud.response.licenceType')}</Text>
                  <Text modifiers="bold">{t('erru.ctud.response.licencingAuthority')}</Text>
                  <Text modifiers="bold">{t('erru.ctud.response.startDate')}</Text>
                  <Text modifiers="bold">{t('erru.ctud.response.expiryDate')}</Text>
                </div>
                {rc.communityLicenceDetails.map((l, i) => (
                  <div key={`${l.communityLicenceNumber}-${i}`} className="table-row-6">
                    <Text>{l.communityLicenceNumber ?? '—'}</Text>
                    <Text>{label('COMMUNITY_LICENCE_STATUS', l.communityLicenceStatus)}</Text>
                    <Text>{label('COMMUNITY_LICENCE_TYPE', l.communityLicenceType)}</Text>
                    <Text>{l.licencingAuthority ?? '—'}</Text>
                    <Text>{l.startDate ?? '—'}</Text>
                    <Text>{l.expiryDate ?? '—'}</Text>
                  </div>
                ))}
              </>
            )}

            {!!rc.certifiedTrueCopyDetails?.length && (
              <>
                <Heading element="h3" className="mt-1 mb-1">
                  {t('erru.ctud.response.trueCopies')}
                </Heading>
                <div className="table-row-3">
                  <Text modifiers="bold">{t('erru.ctud.response.trueCopyNumber')}</Text>
                  <Text modifiers="bold">{t('erru.ctud.response.trueCopyIssueDate')}</Text>
                  <Text modifiers="bold">{t('erru.ctud.response.trueCopyExpiryDate')}</Text>
                </div>
                {rc.certifiedTrueCopyDetails.map((c, i) => (
                  <div key={`${c.trueCopyNumber}-${i}`} className="table-row-3">
                    <Text>{c.trueCopyNumber ?? '—'}</Text>
                    <Text>{c.trueCopyIssueDate ?? '—'}</Text>
                    <Text>{c.trueCopyExpiryDate ?? '—'}</Text>
                  </div>
                ))}
              </>
            )}

            {/* Shown only when the request asked for all managed vehicles. */}
            {!!rc.vehicleRegistrations?.length && (
              <>
                <Heading element="h3">
                  {t('erru.ctud.response.vehicleList')}
                </Heading>
                <Text>{rc.vehicleRegistrations.join(', ')}</Text>
              </>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}
