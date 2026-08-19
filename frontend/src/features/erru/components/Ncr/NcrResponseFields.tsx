import { useTranslation } from 'react-i18next';
import { Card, ChoiceGroup, DateField, Heading, Select, TextField } from '@tedi-design-system/react/tedi';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { toIsoDate } from '../../../../hooks/dateUtils';
import {
  classifierOptions,
  fieldError,
  nestedFieldError,
  parseIsoDate,
  pickOptionValue,
  selectedClassifierOption,
} from '../../utils/fieldHelpers';
import type { useNcrResponseForm } from '../../pages/ncr/useNcrResponseForm';
import type { NcrMessage } from '../../types';
import type { Organisation } from '../../../organisations/types';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';

type NcrResponseFormApi = ReturnType<typeof useNcrResponseForm>;

type Props = {
  form: NcrResponseFormApi;
  /** The current snapshot of the incoming case — supplies read-only header fields. */
  message: NcrMessage;
  /** Organisation catalogue for the authority dropdowns. */
  organisations: Organisation[];
};

/**
 * Editable fields of the Estonian response draft to an incoming NCR message (LJVIS2-63
 * §4 Plokk "Vastuse sisu"). The block starts with read-only context fields (responding MS,
 * target MS, target authority, message number) that cannot be changed when responding. Below
 * them are editable fields: responding authority (org dropdown), status code, transport
 * undertaking name, community licence number, vehicle count, address, licence status, and
 * the penalties-imposed sub-list. "Määrati karistus" Ei clears "Kehtestatud karistus".
 */
export function NcrResponseFields({ form, message, organisations }: Props) {
  const { t } = useTranslation();
  const { getByCode } = useClassifiers();
  const { label: classifierLabel } = useClassifierLabel();
  const { formik, updatePenalty } = form;

  const responseStatuses = getByCode('NCR_RESPONSE_STATUS');
  const licenceStatuses = getByCode('NCR_COMMUNITY_LICENCE_STATUS');
  const penaltyTypeImposedRes = getByCode('NCR_PENALTY_TYPE_IMPOSED_RES');
  const countries = getByCode('COUNTRY');
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;
  const dateValue = parseIsoDate;
  const err = (field: string) => fieldError(formik, field);
  const nestedErr = (index: number, field: string) =>
    nestedFieldError(formik, 'responsePenaltiesImposed', index, field);
  const gridClass = isDesktop ? 'form-grid-desktop' : 'form-grid-mobile';

  // Organisation options for authority Select components (code stored, name displayed).
  const orgOptions = organisations.map((o) => ({ value: o.code, label: o.name }));
  const selectedOrg = (code: string) => orgOptions.find((o) => o.value === code) ?? null;
  const pickOrg = (o: unknown) => (o as { value?: string } | null)?.value ?? '';
  // For read-only display of an authority code as a human-readable name (falls back to code).
  const orgLabel = (code: string | null | undefined) =>
    code ? (organisations.find((o) => o.code === code)?.name ?? code) : '—';

  // For the response block, the responding MS = ncrTo of the stored incoming message (EE),
  // and the target MS = ncrFrom (the requesting MS, e.g. LV).
  const respondingMemberState = classifierLabel('COUNTRY', message.ncrTo);
  const targetMemberState = classifierLabel('COUNTRY', message.ncrFrom);

  const penaltyCount = formik.values.responsePenaltiesImposed.length;

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2" className="mb-1">
          {t('erru.ncr.form.responseBlock')}
        </Heading>

        {/* Read-only context fields — always from the stored incoming message */}
        <div className={gridClass}>
          <TextField
            id="ncr-resp-responding-ms"
            label={t('erru.ncr.form.respondingMemberState')}
            value={respondingMemberState}
            disabled
            onChange={() => undefined}
          />
          <TextField
            id="ncr-resp-target-ms"
            label={t('erru.ncr.form.ncrTo')}
            value={targetMemberState}
            disabled
            onChange={() => undefined}
          />
          <TextField
            id="ncr-resp-target-authority"
            label={t('erru.ncr.form.targetAuthority')}
            value={orgLabel(message.originatingAuthority)}
            disabled
            onChange={() => undefined}
          />
          <TextField
            id="ncr-resp-message-number"
            label={t('erru.ncr.form.messageNumber')}
            value={message.businessCaseId}
            disabled
            onChange={() => undefined}
          />

          {/* Editable response fields */}
          <Select
            id="ncr-responding-authority"
            label={t('erru.ncr.form.respondingAuthority')}
            required
            options={orgOptions}
            value={selectedOrg(formik.values.respondingAuthority)}
            onChange={(o) =>
              formik.setFieldValue('respondingAuthority', pickOrg(o))
            }
            {...err('respondingAuthority')}
          />
          <Select
            id="ncr-response-status-code"
            label={t('erru.ncr.form.responseStatusCode')}
            required
            options={opts(responseStatuses)}
            value={selected(responseStatuses, formik.values.responseStatusCode)}
            onChange={(o) =>
              formik.setFieldValue('responseStatusCode', pick(o))
            }
            {...err('responseStatusCode')}
          />
          <TextField
            id="ncr-response-status-message"
            label={t('erru.ncr.form.responseStatusMessage')}
            value={formik.values.responseStatusMessage}
            onChange={(v) => formik.setFieldValue('responseStatusMessage', v)}
          />
          <TextField
            id="ncr-response-transport-undertaking"
            label={t('erru.ncr.form.transportUndertakingName')}
            value={formik.values.transportUndertakingName}
            onChange={(v) =>
              formik.setFieldValue('transportUndertakingName', v)
            }
          />
          <TextField
            id="ncr-response-community-licence"
            label={t('erru.ncr.form.communityLicenceNumber')}
            value={formik.values.communityLicenceNumber}
            onChange={(v) => formik.setFieldValue('communityLicenceNumber', v)}
          />
          <TextField
            id="ncr-response-number-of-vehicles"
            label={t('erru.ncr.form.responseNumberOfVehicles')}
            value={formik.values.responseNumberOfVehicles}
            onChange={(v) =>
              formik.setFieldValue(
                'responseNumberOfVehicles',
                v.replace(/\D/g, ''),
              )
            }
          />
          <TextField
            id="ncr-response-address"
            label={t('erru.ncr.form.responseAddressStreet')}
            value={formik.values.responseAddress.address ?? ''}
            onChange={(v) =>
              formik.setFieldValue('responseAddress', {
                ...formik.values.responseAddress,
                address: v,
              })
            }
          />
          <TextField
            id="ncr-response-postcode"
            label={t('erru.ncr.form.responseAddressPostCode')}
            value={formik.values.responseAddress.postCode ?? ''}
            onChange={(v) =>
              formik.setFieldValue('responseAddress', {
                ...formik.values.responseAddress,
                postCode: v,
              })
            }
          />
          <TextField
            id="ncr-response-city"
            label={t('erru.ncr.form.responseAddressCity')}
            value={formik.values.responseAddress.city ?? ''}
            onChange={(v) =>
              formik.setFieldValue('responseAddress', {
                ...formik.values.responseAddress,
                city: v,
              })
            }
          />
          <Select
            id="ncr-response-country"
            label={t('erru.ncr.form.responseAddressCountry')}
            options={opts(countries)}
            value={selected(
              countries,
              formik.values.responseAddress.country ?? '',
            )}
            onChange={(o) =>
              formik.setFieldValue('responseAddress', {
                ...formik.values.responseAddress,
                country: pick(o),
              })
            }
          />
          <Select
            id="ncr-response-community-licence-status"
            label={t('erru.ncr.form.responseCommunityLicenceStatus')}
            options={opts(licenceStatuses)}
            className="mb-1"
            value={selected(
              licenceStatuses,
              formik.values.responseCommunityLicenceStatus,
            )}
            onChange={(o) =>
              formik.setFieldValue('responseCommunityLicenceStatus', pick(o))
            }
          />
        </div>

        <Heading element="h3" className="mb-1">
          {t('erru.ncr.form.penaltiesImposedResponseBlock')}
        </Heading>
        {formik.values.responsePenaltiesImposed.map((p, index) => (
          <div
            key={index}
            className={
              index < penaltyCount - 1 ? 'detail-row mb-1' : 'detail-row'
            }
          >
            <div className={`${gridClass} mb-1`}>
              <TextField
                id={`ncr-resp-pi-${index}-req-id`}
                label={t('erru.ncr.form.penaltyRequestedIdentifier')}
                value={p.penaltyRequestedIdentifier}
                disabled
                onChange={() => undefined}
              />
              <Select
                id={`ncr-resp-pi-${index}-authority`}
                label={t('erru.ncr.form.authorityImposingPenalty')}
                options={orgOptions}
                value={selectedOrg(p.authorityImposingPenalty)}
                onChange={(o) =>
                  updatePenalty(index, { authorityImposingPenalty: pickOrg(o) })
                }
              />
            </div>
            <ChoiceGroup
              id={`ncr-resp-pi-${index}-is-imposed`}
              name={`ncr-resp-pi-${index}-is-imposed`}
              label={t('erru.ncr.form.isImposed')}
              className="mb-05"
              inputType="radio"
              direction="row"
              value={p.isImposed ? 'true' : 'false'}
              onChange={(v) =>
                updatePenalty(index, { isImposed: v === 'true' })
              }
              items={[
                {
                  id: `ncr-resp-pi-${index}-imposed-yes`,
                  value: 'true',
                  label: t('common.yes'),
                },
                {
                  id: `ncr-resp-pi-${index}-imposed-no`,
                  value: 'false',
                  label: t('common.no'),
                },
              ]}
            />
            {p.isImposed && (
              <div className={`${gridClass} mb-1`}>
                <Select
                  id={`ncr-resp-pi-${index}-type`}
                  label={t('erru.ncr.form.penaltyTypeImposed')}
                  required
                  options={opts(penaltyTypeImposedRes)}
                  value={selected(
                    penaltyTypeImposedRes,
                    p.penaltyTypeImposed ?? '',
                  )}
                  onChange={(o) =>
                    updatePenalty(index, { penaltyTypeImposed: pick(o) })
                  }
                  {...nestedErr(index, 'penaltyTypeImposed')}
                />
              </div>
            )}
            <div className={gridClass}>
              <DateField
                id={`ncr-resp-pi-${index}-start-date`}
                label={t('erru.ncr.form.startDate')}
                selected={dateValue(p.startDate ?? '')}
                onSelect={(v) =>
                  updatePenalty(index, {
                    startDate: toIsoDate(v as Date | undefined) || null,
                  })
                }
                monthYearSelectType="grid"
              />
              <DateField
                id={`ncr-resp-pi-${index}-end-date`}
                label={t('erru.ncr.form.endDate')}
                selected={dateValue(p.endDate ?? '')}
                onSelect={(v) =>
                  updatePenalty(index, {
                    endDate: toIsoDate(v as Date | undefined) || null,
                  })
                }
                monthYearSelectType="grid"
              />
              <TextField
                id={`ncr-resp-pi-${index}-reason`}
                label={t('erru.ncr.form.penaltyReason')}
                value={p.reason ?? ''}
                onChange={(v) => updatePenalty(index, { reason: v })}
              />
            </div>
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}
