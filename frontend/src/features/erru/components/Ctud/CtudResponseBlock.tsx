import { useTranslation } from 'react-i18next';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import type { CtudRequest } from '../../types';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { DetailRow } from './DetailRow';

/**
 * Read-only "Päringu vastus" block. Always read-only: the answer comes from an external
 * system and is never composed on this form. Undertaking details are shown only for
 * statusCode = Found; NotFound / Timeout / NotAvailable show the status alone.
 */
export function CtudResponseBlock({ request }: { request: CtudRequest }) {
  const { t } = useTranslation();
  const { getValue } = useClassifiers();

  const label = (classifier: string, code: string | null | undefined) =>
    code ? (getValue(classifier, code)?.name ?? code) : '—';

  if (!request.responseStatusCode) return null;
  const rc = request.responseContent;
  const isFound = request.responseStatusCode === 'Found';

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2">{t('erru.ctud.response.title')}</Heading>

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
            <Heading element="h3">{t('erru.ctud.response.undertaking')}</Heading>
            <DetailRow
          label={t('erru.ctud.response.name')} value={rc.transportUndertakingName} />
            <DetailRow
          label={t('erru.ctud.response.legalForm')} value={rc.legalForm} />
            <DetailRow
          label={t('erru.ctud.response.employees')} value={rc.numberOfEmployees} />
            <DetailRow
          label={t('erru.ctud.response.vehicles')} value={rc.numberOfVehicles} />
            <DetailRow
          label={t('erru.ctud.response.riskRating')} value={rc.riskRating} />
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
                <Heading element="h3">{t('erru.ctud.response.address')}</Heading>
                <DetailRow
          label={t('erru.ctud.response.street')} value={rc.address.address} />
                <DetailRow
          label={t('erru.ctud.response.postCode')} value={rc.address.postCode} />
                <DetailRow
          label={t('erru.ctud.response.city')} value={rc.address.city} />
                <DetailRow
          label={t('erru.ctud.response.country')}
                  value={label('COUNTRY', rc.address.country)}
                />
              </>
            )}

            {!!rc.communityLicenceDetails?.length && (
              <>
                <Heading element="h3">{t('erru.ctud.response.licences')}</Heading>
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>{t('erru.ctud.response.licenceNumber')}</th>
                      <th>{t('erru.ctud.response.licenceStatus')}</th>
                      <th>{t('erru.ctud.response.licenceType')}</th>
                      <th>{t('erru.ctud.response.licencingAuthority')}</th>
                      <th>{t('erru.ctud.response.startDate')}</th>
                      <th>{t('erru.ctud.response.expiryDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rc.communityLicenceDetails.map((l, i) => (
                      <tr key={`${l.communityLicenceNumber}-${i}`}>
                        <td>{l.communityLicenceNumber ?? '—'}</td>
                        <td>
                          {label('COMMUNITY_LICENCE_STATUS', l.communityLicenceStatus)}
                        </td>
                        <td>
                          {label('COMMUNITY_LICENCE_TYPE', l.communityLicenceType)}
                        </td>
                        <td>{l.licencingAuthority ?? '—'}</td>
                        <td>{l.startDate ?? '—'}</td>
                        <td>{l.expiryDate ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {!!rc.certifiedTrueCopyDetails?.length && (
              <>
                <Heading element="h3">{t('erru.ctud.response.trueCopies')}</Heading>
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>{t('erru.ctud.response.trueCopyNumber')}</th>
                      <th>{t('erru.ctud.response.trueCopyIssueDate')}</th>
                      <th>{t('erru.ctud.response.trueCopyExpiryDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rc.certifiedTrueCopyDetails.map((c, i) => (
                      <tr key={`${c.trueCopyNumber}-${i}`}>
                        <td>{c.trueCopyNumber ?? '—'}</td>
                        <td>{c.trueCopyIssueDate ?? '—'}</td>
                        <td>{c.trueCopyExpiryDate ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Shown only when the request asked for all managed vehicles. */}
            {!!rc.vehicleRegistrations?.length && (
              <>
                <Heading element="h3">{t('erru.ctud.response.vehicleList')}</Heading>
                <Text>{rc.vehicleRegistrations.join(', ')}</Text>
              </>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}
