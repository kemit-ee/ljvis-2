import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import {
  Card,
  ChoiceGroup,
  DateField,
  Heading,
  Select,
  TextField,
  TimeField,
} from '@tedi-design-system/react/tedi';
import { toIsoDate } from '../../../../hooks/dateUtils';
import {
  classifierOptions,
  dateFieldError,
  fieldError,
  parseIsoDate,
  pickOptionValue,
  selectedClassifierOption,
} from '../../utils/fieldHelpers';
import type { useRsiForm } from '../../pages/rsi/useRsiForm';
import { RsiCheckedItemsTable } from './RsiCheckedItemsTable';

type RsiFormApi = ReturnType<typeof useRsiForm>;

/**
 * Editable fields of an outgoing RSI draft — the eight blocks from LJVIS2-147 §4:
 * "Teate andmed", "Sõiduki andmed", "Juhi andmed" (optional), "Veoettevõtja või omaniku
 * andmed" (optional choice), "Liiklevate sõidukite tehnokontrolli andmed",
 * "Tehnokontrolli tulemused", "Kontrollitud punkt". "Vastuse andmed" is read-only and
 * rendered separately (RsiFormPage), since it only exists once a response has arrived.
 *
 * Notable spec rules (LJVIS2-147 §4):
 *  - rsiFrom (Teate esitanud liikmesriik) is always "EE" and shown as the country name.
 *  - rsiTo (Sihtliikmesriik) is derived from vehicleRegistrationCountry — read-only.
 *  - inspectionPassed (Vastab nõuetele) is always "Ei" for outgoing EE messages.
 *  - Optional blocks reset their fields when toggled off.
 *  - odometerReading accepts only non-negative integers.
 */
export function RsiMessageFields({ form }: { form: RsiFormApi }) {
  const { t } = useTranslation();
  const {
    formik,
    countries,
    vehicleCategories,
    parts,
    defectsByPartKey,
    driverBlockOpen,
    setDriverBlockOpen,
    identificationBlockOpen,
    setIdentificationBlockOpen,
    setPartStatus,
    applyPartDefects,
    removeDefect,
  } = form;

  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const err = (field: string) => fieldError(formik, field);
  const dateErr = (field: string) => dateFieldError(formik, field);
  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;
  const dateValue = parseIsoDate;

  // Derived rsiTo: country label from vehicleRegistrationCountry (shown as read-only).
  const rsiToLabel = selected(countries, formik.values.vehicleRegistrationCountry)?.label ?? '';

  // Each ChoiceGroup needs its own items array with unique IDs — browsers resolve
  // <label for="yes"> to the first matching id on the page, so shared ids across
  // multiple radio groups cause all labels to target the first group's inputs.
  const yesNo = (prefix: string) => [
    { id: `${prefix}-yes`, value: 'true', label: t('common.yes') },
    { id: `${prefix}-no`, value: 'false', label: t('common.no') },
  ];

  const gridClass =
    isDesktop ? 'form-grid-desktop' : 'form-grid-mobile';

  return (
    <>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.rsi.form.headerBlock')}
          </Heading>
          {/* rsiFrom: always EE — show country name, not code (LJVIS2-147 §4) */}
          <div className={gridClass}>
            <TextField
              id="rsi-from"
              label={t('erru.rsi.form.rsiFrom')}
              value={selected(countries, 'EE')?.label ?? 'Eesti'}
              disabled
              onChange={() => undefined}
            />
            <TextField
              id="rsi-originating-authority"
              label={t('erru.rsi.form.originatingAuthority')}
              required
              value={formik.values.originatingAuthority}
              onChange={(v) => formik.setFieldValue('originatingAuthority', v)}
              {...err('originatingAuthority')}
            />
            {/* rsiTo: derived from vehicleRegistrationCountry — read-only (LJVIS2-147 §4) */}
            <TextField
              id="rsi-to"
              label={t('erru.rsi.form.rsiTo')}
              value={rsiToLabel}
              disabled
              onChange={() => undefined}
              helper={{
                text: t('erru.rsi.form.rsiToHint'),
              }}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.rsi.form.vehicleBlock')}
          </Heading>
          <div className={gridClass}>
            <Select
              id="rsi-vehicle-category"
              label={t('erru.rsi.form.vehicleCategory')}
              options={opts(vehicleCategories)}
              value={selected(vehicleCategories, formik.values.vehicleCategory)}
              onChange={(o) => formik.setFieldValue('vehicleCategory', pick(o))}
            />
            <TextField
              id="rsi-vehicle-registration-number"
              label={t('erru.rsi.form.vehicleRegistrationNumber')}
              required
              value={formik.values.vehicleRegistrationNumber}
              onChange={(v) =>
                formik.setFieldValue('vehicleRegistrationNumber', v)
              }
              {...err('vehicleRegistrationNumber')}
            />
            <Select
              id="rsi-vehicle-registration-country"
              label={t('erru.rsi.form.vehicleRegistrationCountry')}
              required
              options={opts(countries)}
              value={selected(
                countries,
                formik.values.vehicleRegistrationCountry,
              )}
              onChange={(o) =>
                formik.setFieldValue('vehicleRegistrationCountry', pick(o))
              }
              {...err('vehicleRegistrationCountry')}
            />
            <TextField
              id="rsi-vehicle-identification-number"
              label={t('erru.rsi.form.vehicleIdentificationNumber')}
              value={formik.values.vehicleIdentificationNumber}
              onChange={(v) =>
                formik.setFieldValue('vehicleIdentificationNumber', v)
              }
              {...err('vehicleIdentificationNumber')}
            />
            {/* Non-negative integer only (LJVIS2-147 §4 "Mittenegatiivne täisarv") */}
            <TextField
              id="rsi-odometer-reading"
              label={t('erru.rsi.form.odometerReading')}
              value={formik.values.odometerReading}
              onChange={(v) => {
                const numericValue = v.replace(/\D/g, '');
                const parsedValue = parseInt(numericValue, 10) || 0;
                formik.setFieldValue(
                  'odometerReading',
                  numericValue ? String(parsedValue) : '',
                );
              }}
              input={{ maxLength: 8 }}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h2">{t('erru.rsi.form.driverBlock')}</Heading>
            <ChoiceGroup
              id="rsi-driver-block-open"
              name="rsi-driver-block-open"
              label={t('erru.rsi.form.driverBlockOpen')}
              inputType="checkbox"
              value={driverBlockOpen ? ['open'] : []}
              onChange={(v) =>
                setDriverBlockOpen((v as string[]).includes('open'))
              }
              items={[
                {
                  id: 'rsi-driver-block-open-item',
                  value: 'open',
                  label: t('erru.rsi.form.driverBlockOpen'),
                },
              ]}
            />
          </div>
          {driverBlockOpen && (
            <>
              <div className={gridClass}>
                <TextField
                  id="rsi-driver-first-name"
                  label={t('erru.rsi.form.driverFirstName')}
                  required
                  value={formik.values.driverFirstName}
                  onChange={(v) => formik.setFieldValue('driverFirstName', v)}
                  {...err('driverFirstName')}
                />
                <TextField
                  id="rsi-driver-family-name"
                  label={t('erru.rsi.form.driverFamilyName')}
                  required
                  value={formik.values.driverFamilyName}
                  onChange={(v) => formik.setFieldValue('driverFamilyName', v)}
                  {...err('driverFamilyName')}
                />
                <TextField
                  id="rsi-driver-licence-number"
                  label={t('erru.rsi.form.driverLicenceNumber')}
                  value={formik.values.driverLicenceNumber}
                  onChange={(v) =>
                    formik.setFieldValue('driverLicenceNumber', v)
                  }
                />
                <Select
                  id="rsi-driver-licence-country"
                  label={t('erru.rsi.form.driverLicenceCountry')}
                  options={opts(countries)}
                  value={selected(
                    countries,
                    formik.values.driverLicenceCountry,
                  )}
                  onChange={(o) =>
                    formik.setFieldValue('driverLicenceCountry', pick(o))
                  }
                />
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h2">
              {t('erru.rsi.form.identificationBlock')}
            </Heading>
            <ChoiceGroup
              id="rsi-identification-block-open"
              name="rsi-identification-block-open"
              label={t('erru.rsi.form.identificationBlockOpen')}
              inputType="checkbox"
              value={identificationBlockOpen ? ['open'] : []}
              onChange={(v) =>
                setIdentificationBlockOpen((v as string[]).includes('open'))
              }
              items={[
                {
                  id: 'rsi-identification-block-open-item',
                  value: 'open',
                  label: t('erru.rsi.form.identificationBlockOpen'),
                },
              ]}
            />
          </div>
          {identificationBlockOpen && (
            <>
              <ChoiceGroup
                id="rsi-identification-holder"
                name="rsi-identification-holder"
                label={t('erru.rsi.form.identificationHolder')}
                className="mb-05"
                required
                inputType="radio"
                direction="row"
                value={formik.values.identification.isVehicleHolder}
                onChange={(v) =>
                  formik.setFieldValue('identification.isVehicleHolder', v)
                }
                items={[
                  {
                    id: 'rsi-holder-tu',
                    value: 'transport_undertaking',
                    label: t('erru.rsi.form.identificationHolderUndertaking'),
                  },
                  {
                    id: 'rsi-holder-owner',
                    value: 'owner',
                    label: t('erru.rsi.form.identificationHolderOwner'),
                  },
                ]}
                {...err('identification.isVehicleHolder')}
              />

              {formik.values.identification.isVehicleHolder ===
                'transport_undertaking' && (
                <>
                  <div className={`${gridClass} mb-1`}>
                    <TextField
                      id="rsi-identification-tu-name"
                      label={t('erru.rsi.form.identificationUndertakingName')}
                      required
                      value={
                        formik.values.identification.transportUndertakingName
                      }
                      onChange={(v) =>
                        formik.setFieldValue(
                          'identification.transportUndertakingName',
                          v,
                        )
                      }
                      {...err('identification.transportUndertakingName')}
                    />
                    <TextField
                      id="rsi-identification-tu-licence"
                      label={t(
                        'erru.rsi.form.identificationCommunityLicenceNumber',
                      )}
                      required
                      value={
                        formik.values.identification.communityLicenceNumber
                      }
                      onChange={(v) =>
                        formik.setFieldValue(
                          'identification.communityLicenceNumber',
                          v,
                        )
                      }
                      {...err('identification.communityLicenceNumber')}
                    />
                  </div>
                </>
              )}

              {formik.values.identification.isVehicleHolder === 'owner' && (
                <>
                  <ChoiceGroup
                    id="rsi-identification-owner-type"
                    name="rsi-identification-owner-type"
                    label={t('erru.rsi.form.identificationOwnerType')}
                    className="mb-05"
                    required
                    inputType="radio"
                    direction="row"
                    value={formik.values.identification.isNaturalPerson}
                    onChange={(v) =>
                      formik.setFieldValue('identification.isNaturalPerson', v)
                    }
                    items={[
                      {
                        id: 'rsi-owner-company',
                        value: 'company',
                        label: t('erru.rsi.form.identificationOwnerCompany'),
                      },
                      {
                        id: 'rsi-owner-natural',
                        value: 'natural_person',
                        label: t('erru.rsi.form.identificationOwnerNatural'),
                      },
                    ]}
                    {...err('identification.isNaturalPerson')}
                  />
                  {formik.values.identification.isNaturalPerson ===
                    'company' && (
                    <div className={`${gridClass} mb-1`}>
                      <TextField
                        id="rsi-identification-company-name"
                        label={t('erru.rsi.form.identificationCompanyName')}
                        required
                        value={formik.values.identification.companyName}
                        onChange={(v) =>
                          formik.setFieldValue('identification.companyName', v)
                        }
                        {...err('identification.companyName')}
                      />
                    </div>
                  )}
                  {formik.values.identification.isNaturalPerson ===
                    'natural_person' && (
                    <>
                      <div className={`${gridClass} mb-1`}>
                        <TextField
                          id="rsi-identification-owner-first-name"
                          label={t(
                            'erru.rsi.form.identificationOwnerFirstName',
                          )}
                          required
                          value={formik.values.identification.firstName}
                          onChange={(v) =>
                            formik.setFieldValue('identification.firstName', v)
                          }
                          {...err('identification.firstName')}
                        />
                        <TextField
                          id="rsi-identification-owner-family-name"
                          label={t(
                            'erru.rsi.form.identificationOwnerFamilyName',
                          )}
                          required
                          value={formik.values.identification.familyName}
                          onChange={(v) =>
                            formik.setFieldValue('identification.familyName', v)
                          }
                          {...err('identification.familyName')}
                        />
                      </div>
                    </>
                  )}
                  <div className={`${gridClass} mb-1`}>
                    <TextField
                      id="rsi-identification-registration-certificate"
                      label={t(
                        'erru.rsi.form.identificationRegistrationCertificate',
                      )}
                      value={
                        formik.values.identification.registrationCertificate
                      }
                      onChange={(v) =>
                        formik.setFieldValue(
                          'identification.registrationCertificate',
                          v,
                        )
                      }
                    />
                  </div>
                </>
              )}
              <div className={gridClass}>
                <TextField
                  id="rsi-identification-address"
                  label={t('erru.rsi.form.identificationAddress')}
                  required
                  value={formik.values.identification.address}
                  onChange={(v) =>
                    formik.setFieldValue('identification.address', v)
                  }
                  {...err('identification.address')}
                />
                <TextField
                  id="rsi-identification-city"
                  label={t('erru.rsi.form.identificationCity')}
                  required
                  value={formik.values.identification.city}
                  onChange={(v) =>
                    formik.setFieldValue('identification.city', v)
                  }
                  {...err('identification.city')}
                />
                <Select
                  id="rsi-identification-country"
                  label={t('erru.rsi.form.identificationCountry')}
                  required
                  options={opts(countries)}
                  value={selected(
                    countries,
                    formik.values.identification.country,
                  )}
                  onChange={(o) =>
                    formik.setFieldValue('identification.country', pick(o))
                  }
                  {...err('identification.country')}
                />
                <TextField
                  id="rsi-identification-post-code"
                  label={t('erru.rsi.form.identificationPostCode')}
                  required
                  value={formik.values.identification.postCode}
                  onChange={(v) =>
                    formik.setFieldValue('identification.postCode', v)
                  }
                  {...err('identification.postCode')}
                />
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.rsi.form.inspectionBlock')}
          </Heading>
          <div className={gridClass}>
            <TextField
              id="rsi-inspection-identifier"
              label={t('erru.rsi.form.inspectionIdentifier')}
              value={formik.values.inspectionIdentifier}
              onChange={(v) => formik.setFieldValue('inspectionIdentifier', v)}
            />
            <TextField
              id="rsi-inspection-location"
              label={t('erru.rsi.form.inspectionLocation')}
              required
              value={formik.values.inspectionLocation}
              onChange={(v) => formik.setFieldValue('inspectionLocation', v)}
              {...err('inspectionLocation')}
            />
            <DateField
              id="rsi-inspection-date"
              label={t('erru.rsi.form.inspectionDate')}
              required
              selected={dateValue(formik.values.inspectionDate)}
              onSelect={(v) =>
                formik.setFieldValue(
                  'inspectionDate',
                  toIsoDate(v as Date | undefined),
                )
              }
              monthYearSelectType="grid"
              {...dateErr('inspectionDate')}
            />
            <TimeField
              id="rsi-inspection-time"
              label={t('erru.rsi.form.inspectionTime')}
              required
              value={formik.values.inspectionTime || undefined}
              onChange={(v) => formik.setFieldValue('inspectionTime', v ?? '')}
              {...dateErr('inspectionTime')}
            />
            <TextField
              id="rsi-inspection-authority"
              label={t('erru.rsi.form.inspectionAuthorityOrName')}
              required
              value={formik.values.inspectionAuthorityOrName}
              onChange={(v) =>
                formik.setFieldValue('inspectionAuthorityOrName', v)
              }
              {...err('inspectionAuthorityOrName')}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">{t('erru.rsi.form.resultsBlock')}</Heading>
          {/* inspectionPassed is always "Ei" for outgoing EE (LJVIS2-147 §4):
              "Eesti väljaminevatel teadetel on väärtus alati „Ei", sest teavitatakse
              ainult mittevastavustest." — rendered as disabled. */}
          <ChoiceGroup
            id="rsi-inspection-passed"
            name="rsi-inspection-passed"
            label={t('erru.rsi.form.inspectionPassed')}
            className="mb-05"
            inputType="radio"
            direction="row"
            value="false"
            onChange={() => undefined}
            items={yesNo('rsi-inspection-passed').map((item) => ({
              ...item,
              disabled: true,
            }))}
          />
          <ChoiceGroup
            id="rsi-pti-requested"
            name="rsi-pti-requested"
            label={t('erru.rsi.form.ptiRequested')}
            className="mb-05"
            required
            inputType="radio"
            direction="row"
            value={formik.values.ptiRequested}
            onChange={(v) => formik.setFieldValue('ptiRequested', v)}
            items={yesNo('rsi-pti-requested')}
            {...err('ptiRequested')}
          />
          <ChoiceGroup
            id="rsi-vehicle-prohibition"
            name="rsi-vehicle-prohibition"
            label={t('erru.rsi.form.vehicleProhibitionOrRestriction')}
            required
            inputType="radio"
            direction="row"
            value={formik.values.vehicleProhibitionOrRestriction}
            onChange={(v) =>
              formik.setFieldValue('vehicleProhibitionOrRestriction', v)
            }
            items={yesNo('rsi-vehicle-prohibition')}
            {...err('vehicleProhibitionOrRestriction')}
          />
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2">{t('erru.rsi.form.checkedItemsBlock')}</Heading>
          <RsiCheckedItemsTable
            parts={parts}
            defectsByPartKey={defectsByPartKey}
            items={formik.values.checkedItems}
            onStatusChange={setPartStatus}
            onDefectsChange={applyPartDefects}
            onRemoveDefect={removeDefect}
          />
        </Card.Content>
      </Card>
    </>
  );
}
