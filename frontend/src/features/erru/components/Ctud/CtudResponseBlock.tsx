import { useTranslation } from 'react-i18next';
import { Card, Heading } from '@tedi-design-system/react/tedi';
import type {
  CtudCertifiedTrueCopy,
  CtudCommunityLicence,
  CtudRequest,
} from '../../types';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { DetailRow } from '../shared/DetailRow';

function LicenceDetails({
  licence,
  index,
}: {
  licence: CtudCommunityLicence;
  index: number;
}) {
  const { t } = useTranslation();
  const { label } = useClassifierLabel();

  return (
    <div className={index > 0 ? 'mt-1' : undefined}>
      <Heading element="h4" className="mb-05">
        {t('erru.ctud.response.licence', { number: index + 1 })}
      </Heading>
      <DetailRow
        label={t('erru.ctud.response.licenceNumber')}
        value={licence.communityLicenceNumber}
      />
      <DetailRow
        label={t('erru.ctud.response.licenceStatus')}
        value={label(
          'COMMUNITY_LICENCE_STATUS',
          licence.communityLicenceStatus,
        )}
      />
      <DetailRow
        label={t('erru.ctud.response.licenceType')}
        value={label('COMMUNITY_LICENCE_TYPE', licence.communityLicenceType)}
      />
      <DetailRow
        label={t('erru.ctud.response.licencingAuthority')}
        value={licence.licencingAuthority}
      />
      <DetailRow
        label={t('erru.ctud.response.startDate')}
        value={licence.startDate}
      />
      <DetailRow
        label={t('erru.ctud.response.expiryDate')}
        value={licence.expiryDate}
      />
      <DetailRow
        label={t('erru.ctud.response.withdrawalDate')}
        value={licence.withdrawalDate}
      />
      <DetailRow
        label={t('erru.ctud.response.withdrawalExpiryDate')}
        value={licence.withdrawalExpiryDate}
      />
      <DetailRow
        label={t('erru.ctud.response.suspensionDate')}
        value={licence.suspensionDate}
      />
      <DetailRow
        label={t('erru.ctud.response.suspensionExpiryDate')}
        value={licence.suspensionExpiryDate}
      />
      <DetailRow
        label={t('erru.ctud.response.suspensionOrWithdrawalReason')}
        value={licence.suspensionOrWithdrawalReason}
      />
    </div>
  );
}

function TrueCopyDetails({
  trueCopy,
  index,
}: {
  trueCopy: CtudCertifiedTrueCopy;
  index: number;
}) {
  const { t } = useTranslation();

  return (
    <div className={index > 0 ? 'mt-1' : undefined}>
      <Heading element="h4" className="mb-05">
        {t('erru.ctud.response.trueCopy', { number: index + 1 })}
      </Heading>
      <DetailRow
        label={t('erru.ctud.response.trueCopyNumber')}
        value={trueCopy.trueCopyNumber}
      />
      <DetailRow
        label={t('erru.ctud.response.trueCopyIssueDate')}
        value={trueCopy.trueCopyIssueDate}
      />
      <DetailRow
        label={t('erru.ctud.response.trueCopyIssueCountry')}
        value={trueCopy.trueCopyIssueCountry}
      />
      <DetailRow
        label={t('erru.ctud.response.trueCopyExpiryDate')}
        value={trueCopy.trueCopyExpiryDate}
      />
      <DetailRow
        label={t('erru.ctud.response.trueCopyWithdrawalDate')}
        value={trueCopy.trueCopyWithdrawalDate}
      />
      <DetailRow
        label={t('erru.ctud.response.trueCopyWithdrawalExpiryDate')}
        value={trueCopy.trueCopyWithdrawalExpiryDate}
      />
      <DetailRow
        label={t('erru.ctud.response.trueCopySuspensionDate')}
        value={trueCopy.trueCopySuspensionDate}
      />
      <DetailRow
        label={t('erru.ctud.response.trueCopySuspensionExpiryDate')}
        value={trueCopy.trueCopySuspensionExpiryDate}
      />
    </div>
  );
}

/**
 * Read-only response received for an outgoing CTUD request. All fields carried by a
 * Found response remain visible, including empty optional licence-status dates.
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
          label={t('erru.ctud.response.respondingMemberState')}
          value={label('COUNTRY', request.ctudTo)}
        />
        <DetailRow
          label={t('erru.ctud.response.respondingAuthority')}
          value={request.respondingAuthority}
        />
        <DetailRow
          label={t('erru.ctud.response.requestingMemberState')}
          value={label('COUNTRY', request.ctudFrom)}
        />
        <DetailRow
          label={t('erru.ctud.response.originatingAuthority')}
          value={label('COMPETENT_AUTHORITY', request.originatingAuthority)}
        />
        <DetailRow
          label={t('erru.ctud.list.id')}
          value={request.businessCaseId}
        />
        <DetailRow
          label={t('erru.ctud.response.receivedAt')}
          value={new Date(request.createdAt).toLocaleString('et-EE')}
        />
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
              label={t('erru.ctud.response.vehicles')}
              value={rc.numberOfVehicles}
            />
            <DetailRow
              label={t('erru.ctud.response.employees')}
              value={rc.numberOfEmployees}
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
                <Heading element="h3" className="mt-1 mb-1">
                  {t('erru.ctud.response.licences')}
                </Heading>
                {rc.communityLicenceDetails.map((licence, index) => (
                  <LicenceDetails
                    key={`${licence.communityLicenceNumber}-${index}`}
                    licence={licence}
                    index={index}
                  />
                ))}
              </>
            )}

            {!!rc.certifiedTrueCopyDetails?.length && (
              <>
                <Heading element="h3" className="mt-1 mb-1">
                  {t('erru.ctud.response.trueCopies')}
                </Heading>
                {rc.certifiedTrueCopyDetails.map((trueCopy, index) => (
                  <TrueCopyDetails
                    key={`${trueCopy.trueCopyNumber}-${index}`}
                    trueCopy={trueCopy}
                    index={index}
                  />
                ))}
              </>
            )}

            {!!rc.vehicleRegistrations?.length && (
              <>
                <Heading element="h3" className="mt-1 mb-1">
                  {t('erru.ctud.response.vehicleList')}
                </Heading>
                <DetailRow
                  label={t('erru.ctud.response.vehicleRegistrationNumbers')}
                  value={rc.vehicleRegistrations.join(', ')}
                />
              </>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}
