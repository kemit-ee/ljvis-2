import { useTranslation } from 'react-i18next';
import {
  Card,
  ChoiceGroup,
  Heading,
  Select,
  TextField,
  Text,
} from '@tedi-design-system/react/tedi';
import { classifierOptions, fieldError, pickOptionValue, selectedClassifierOption } from '../../utils/fieldHelpers';
import type { useCtudForm } from '../../pages/ctud/useCtudForm';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';
import { DetailRow } from '../shared/DetailRow';

type CtudFormApi = ReturnType<typeof useCtudForm>;

/**
 * Editable fields of an outgoing CTUD draft: "Päringu päis ja osapooled" and
 * "Veoettevõtja". Every Yup-required field also carries the `required` prop, per the
 * project's frontend conventions.
 */
export function CtudRequestFields({
  form,
  businessCaseId,
}: {
  form: CtudFormApi;
  businessCaseId?: string;
}) {
  const { t } = useTranslation();
  const { formik, countries, authorities, requestSources, requestPurposes } =
    form;
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const err = (field: keyof typeof formik.values) => fieldError(formik, field);
  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;
  const gridClass = isDesktop ? 'form-grid-desktop' : 'form-grid-mobile';

  return (
    <>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.ctud.form.headerBlock')}
          </Heading>

          {businessCaseId && (
            <div className="mb-1">
              <DetailRow
                label={t('erru.ctud.list.id')}
                value={businessCaseId}
              />
            </div>
          )}

          {/* Estonia is always the issuer of an outgoing request — not editable, shown
              as the country name rather than the raw code (matches RSI/CGR). */}
          <div className={gridClass}>
            <TextField
              id="ctud-from"
              label={t('erru.ctud.form.ctudFrom')}
              value={selected(countries, 'EE')?.label ?? 'Eesti'}
              disabled
              onChange={() => undefined}
            />

            <Select
              id="ctud-originating-authority"
              label={t('erru.ctud.form.originatingAuthority')}
              options={opts(authorities)}
              value={selected(authorities, formik.values.originatingAuthority)}
              onChange={(o) =>
                formik.setFieldValue('originatingAuthority', pick(o))
              }
              {...err('originatingAuthority')}
            />

            <Select
              id="ctud-to"
              label={t('erru.ctud.form.ctudTo')}
              required
              options={opts(countries)}
              value={selected(countries, formik.values.ctudTo)}
              onChange={(o) => formik.setFieldValue('ctudTo', pick(o))}
              {...err('ctudTo')}
            />

            <Select
              id="ctud-request-source"
              label={t('erru.ctud.form.requestSource')}
              options={opts(requestSources)}
              value={selected(requestSources, formik.values.requestSource)}
              onChange={(o) => formik.setFieldValue('requestSource', pick(o))}
              {...err('requestSource')}
            />

            <Select
              id="ctud-request-purpose"
              label={t('erru.ctud.form.requestPurpose')}
              options={opts(requestPurposes)}
              value={selected(requestPurposes, formik.values.requestPurpose)}
              onChange={(o) => formik.setFieldValue('requestPurpose', pick(o))}
              {...err('requestPurpose')}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <div style={{ width: isDesktop ? '80%' : '100%' }}>
            <Heading element="h2">
              {t('erru.ctud.form.undertakingBlock')}
            </Heading>
            <Text className="mt-05 mb-1">{t('erru.ctud.form.minTwoHint')}</Text>
            <div
              className={isDesktop ? 'three-col-desktop' : 'three-col-mobile'}
            >
              <TextField
                id="ctud-undertaking-name"
                label={t('erru.ctud.form.undertakingName')}
                value={formik.values.transportUndertakingName}
                onChange={(v) =>
                  formik.setFieldValue('transportUndertakingName', v)
                }
                {...err('transportUndertakingName')}
              />

              <TextField
                id="ctud-vehicle-number"
                label={t('erru.ctud.form.vehicleNumber')}
                value={formik.values.vehicleRegistrationNumber}
                onChange={(v) =>
                  formik.setFieldValue('vehicleRegistrationNumber', v)
                }
                {...err('vehicleRegistrationNumber')}
              />

              <TextField
                id="ctud-licence-number"
                label={t('erru.ctud.form.licenceNumber')}
                value={formik.values.communityLicenceNumber}
                onChange={(v) =>
                  formik.setFieldValue('communityLicenceNumber', v)
                }
                {...err('communityLicenceNumber')}
              />
            </div>

            <Text className="mb-05 mt-1">
              {t('erru.ctud.form.vehicleCountryHint')}
            </Text>

            <div className={`${gridClass} mb-1`}>
              <Select
                id="ctud-vehicle-country"
                label={t('erru.ctud.form.vehicleCountry')}
                required={!!formik.values.vehicleRegistrationNumber}
                options={[{ value: '', label: '\u00a0' }, ...opts(countries)]}
                value={selected(
                  countries,
                  formik.values.vehicleRegistrationCountry,
                )}
                onChange={(o) =>
                  formik.setFieldValue('vehicleRegistrationCountry', pick(o))
                }
                {...err('vehicleRegistrationCountry')}
              />
            </div>

            <div className={gridClass}>
              <ChoiceGroup
                id="ctud-all-vehicles"
                name="ctud-all-vehicles"
                label={t('erru.ctud.form.requestAllVehicles')}
                inputType="radio"
                direction="row"
                value={formik.values.requestAllVehicles}
                onChange={(v) =>
                  formik.setFieldValue('requestAllVehicles', v || 'false')
                }
                items={[
                  {
                    id: 'ctud-all-vehicles-yes',
                    value: 'true',
                    label: t('common.yes'),
                  },
                  {
                    id: 'ctud-all-vehicles-no',
                    value: 'false',
                    label: t('common.no'),
                  },
                ]}
              />
            </div>
          </div>
        </Card.Content>
      </Card>
    </>
  );
}
