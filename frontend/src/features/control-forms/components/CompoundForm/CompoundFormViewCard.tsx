import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Heading,
  Select,
  Tabs,
  TextField,
    Text
} from '@tedi-design-system/react/tedi';
import { DatePicker, TimePicker } from '@tedi-design-system/react/community';
import type { CompoundForm, Trailer, Driver } from '../../types';
import { COUNTRIES } from '../../../../constants/constants';
import styles from '../../pages/compound-form/CompoundFormPage.module.css';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import type { Dayjs } from 'dayjs';

interface CompoundFormViewCardProps {
  form: CompoundForm;
  isDesktop: boolean;
  canEdit: boolean;
  orgOptions: { label: string; value: string }[];
  structureUnits: { code: string; name: string }[];
  roads: { code: string; name: string }[];
  trailerCategories: { code: string; name: string }[];
  vehicleCategories: { code: string; name: string }[];
  counties: { id: number; name: string }[];
  citiesParishes: { id: number; name: string }[];
  companyCitiesParishes: { id: number; name: string }[];
  onEdit: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
  isSnapshot?: boolean;
  formType: string;
  toDateValue: (date?: string) => Dayjs | null;
  toTimeValue: (date?: string, time?: string) => Dayjs | null;
}

export function CompoundFormViewCard({
  form,
  isDesktop,
  canEdit,
  orgOptions,
  structureUnits,
  roads,
  trailerCategories,
  vehicleCategories,
  counties,
  citiesParishes,
  companyCitiesParishes,
  onEdit,
  isSnapshot,
  formType,
  toDateValue,
  toTimeValue,
}: CompoundFormViewCardProps) {
  const { t } = useTranslation();

  const countries = COUNTRIES.map((country) => ({
    ...country,
    label: t(country.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  const disabled = true;
  const gridClass =
    styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'];

  const trailers: Trailer[] = Array.isArray(form.trailers)
    ? form.trailers
    : typeof form.trailers === 'string'
      ? JSON.parse(form.trailers)
      : [];

  const drivers: Driver[] = Array.isArray(form.drivers)
    ? form.drivers
    : typeof form.drivers === 'string'
      ? JSON.parse(form.drivers)
      : [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <Heading element="h1">
            {(form.formNumber ?? '').split('/')[0]}
          </Heading>
        </div>
      </div>

      <Tabs defaultValue="tab-1">
        <Tabs.List aria-label={t('forms.compound_form')}>
          <Tabs.Trigger id="tab-1">
            {t('forms.compound.generalPart')}
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content id="tab-1" className="p-1">
          {/* Kontrolli koht */}
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.compound.controlPlaceBasicInfo')}
              </Heading>
              <div className={gridClass}>
                <TextField
                  id="address"
                  label={t('forms.compound.address')}
                  value={form.address ?? ''}
                  disabled={disabled}
                />
                <Select
                  id="road"
                  label={t('forms.compound.road')}
                  options={roads.map((r) => ({ value: r.code, label: r.name }))}
                  value={
                    roads
                      .map((r) => ({ value: r.code, label: r.name }))
                      .find((o) => o.value === form.road) ?? null
                  }
                  disabled={disabled}
                />
                <TextField
                  id="kilometer"
                  label={t('forms.compound.kilometer')}
                  value={form.kilometer ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="roadOther"
                  label={t('forms.compound.road_other')}
                  value={form.roadOther ?? ''}
                  disabled={disabled}
                />
                <div
                  className={
                    styles[isDesktop ? 'three-col-desktop' : 'three-col-mobile']
                  }
                >
                  <Select
                    id="controlCountryCode"
                    label={t('forms.foreign_violation.control_country_code')}
                    options={countries}
                    value={
                      countries.find(
                        (o) => o.value === form.controlCountryCode,
                      ) ?? null
                    }
                    disabled={disabled}
                  />
                  <Select
                    id="county"
                    label={t('forms.foreign_violation.county')}
                    options={counties.map((c) => ({
                      value: String(c.id),
                      label: c.name,
                    }))}
                    value={
                      counties
                        .map((c) => ({ value: String(c.id), label: c.name }))
                        .find((o) => o.value === form.county) ?? null
                    }
                    disabled={disabled}
                  />
                  <Select
                    id="city"
                    label={t('forms.foreign_violation.city')}
                    options={citiesParishes.map((c) => ({
                      value: String(c.id),
                      label: c.name,
                    }))}
                    value={
                      citiesParishes
                        .map((c) => ({ value: String(c.id), label: c.name }))
                        .find((o) => o.value === form.city) ?? null
                    }
                    disabled={disabled}
                  />
                </div>
                <Text id="road_type">
                  Tee liik: {form.road_type}
                </Text>
              </div>
            </Card.Content>
          </Card>

          {/* Kontrolli aeg */}
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.compound.controlTimeBasicInfo')}
              </Heading>
              <div className={gridClass} style={{ alignItems: 'start' }}>
                <div
                  className={
                    styles[isDesktop ? 'date-row-desktop' : 'date-row-mobile']
                  }
                >
                  <DatePicker
                    id="controlDate"
                    label={t('forms.compound.controlDate')}
                    value={toDateValue(form.controlDate)}
                    onChange={() => {}}
                    placeholder={t('common.datePickerPlaceholder')}
                    disabled={disabled}
                  />
                  <TimePicker
                    id="controlTime"
                    label={t('forms.compound.controlTime')}
                    value={toTimeValue(form.controlDate, form.controlTime)}
                    onChange={() => {}}
                    placeholder={t('common.timePickerPlaceholder')}
                    disabled={disabled}
                  />
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Mootorsõiduk */}
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.compound.vehicleBasicInfo')}
              </Heading>
              <div className={gridClass} style={{ alignItems: 'start' }}>
                <TextField
                  id="vehicleRegNr"
                  label={t('forms.compound.vehicleRegNr')}
                  value={form.vehicleRegNr ?? ''}
                  disabled={disabled}
                />
                <div />
                <TextField
                  id="vehicleMake"
                  label={t('forms.compound.vehicleMake')}
                  value={form.vehicleMake ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="vehicleModel"
                  label={t('forms.compound.vehicleModel')}
                  value={form.vehicleModel ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="vehicleVin"
                  label={t('forms.compound.vehicleVin')}
                  value={form.vehicleVin ?? ''}
                  disabled={disabled}
                />
                <Select
                  id="vehicleCountryCode"
                  label={t('forms.compound.vehicleCountry')}
                  options={countries}
                  value={
                    countries.find(
                      (o) => o.value === form.vehicleCountryCode,
                    ) ?? null
                  }
                  disabled={disabled}
                />
                <TextField
                  id="vehicleBodyType"
                  label={t('forms.compound.vehicleBodyType')}
                  value={form.vehicleBodyType ?? ''}
                  disabled={disabled}
                />
                <div
                  className={
                    styles[
                      isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                    ]
                  }
                >
                  <DatePicker
                    id="vehicleFirstRegistration"
                    label={t('forms.compound.vehicleFirstRegistration')}
                    value={toDateValue(form.vehicleFirstRegistration)}
                    onChange={() => {}}
                    placeholder={t(
                      'forms.foreign_violation.datePickerPlaceholder',
                    )}
                    disabled={disabled}
                  />
                </div>
                <Select
                  id="vehicleCategoryCode"
                  label={t('forms.compound.vehicleCategory')}
                  options={vehicleCategories.map((c) => ({
                    value: c.code,
                    label: c.name,
                  }))}
                  value={
                    vehicleCategories
                      .map((c) => ({ value: c.code, label: c.name }))
                      .find((o) => o.value === form.vehicleCategoryCode) ?? null
                  }
                  disabled={disabled}
                />
                <TextField
                  id="vehicleCategoryOther"
                  label={t('forms.compound.vehicleCategoryOther')}
                  value={form.vehicleCategoryOther ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="vehicleMileage"
                  label={t('forms.compound.vehicleMileage')}
                  value={form.vehicleMileage ?? ''}
                  disabled={disabled}
                />
              </div>
            </Card.Content>
          </Card>

          {/* Teekasutustasu */}
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.compound.roadUsageViolation')}
              </Heading>
              <div className={gridClass}>
                <TextField
                  id="roadTaxStatus"
                  label={t('forms.compound.roadTaxStatus')}
                  value={form.roadTaxStatus ?? ''}
                  disabled={disabled}
                />
                <div />
                <TextField
                  id="roadTaxNotes"
                  label={t('forms.compound.roadTaxNotes')}
                  value={form.roadTaxNotes ?? ''}
                  disabled={disabled}
                />
              </div>
            </Card.Content>
          </Card>

          {/* Haagised */}
          {trailers.length > 0 && (
            <Card className="mb-1">
              <Card.Content>
                <Heading element="h3" className="mb-1">
                  {t('forms.compound.trailer')}
                </Heading>
                {trailers.map((trailer: Trailer, index: number) => (
                  <Card key={index} className="mb-1">
                    <Card.Content>
                      <div
                        className={gridClass}
                        style={{ alignItems: 'start' }}
                      >
                        <TextField
                          id={`trailerRegNr_${index}`}
                          label={t('forms.compound.trailerRegNr')}
                          value={trailer.regNr ?? ''}
                          disabled={disabled}
                        />
                        <div />
                        <TextField
                          id={`trailerMake_${index}`}
                          label={t('forms.compound.trailerMake')}
                          value={trailer.make ?? ''}
                          disabled={disabled}
                        />
                        <TextField
                          id={`trailerModel_${index}`}
                          label={t('forms.compound.trailerModel')}
                          value={trailer.model ?? ''}
                          disabled={disabled}
                        />
                        <TextField
                          id={`trailerVin_${index}`}
                          label={t('forms.compound.trailerVin')}
                          value={trailer.vin ?? ''}
                          disabled={disabled}
                        />
                        <Select
                          id={`trailerCountryCode_${index}`}
                          label={t('forms.compound.trailerCountry')}
                          options={countries}
                          value={
                            countries.find(
                              (o) => o.value === trailer.countryCode,
                            ) ?? null
                          }
                          disabled={disabled}
                        />
                        <TextField
                          id={`trailerBodyType_${index}`}
                          label={t('forms.compound.trailerBodyType')}
                          value={trailer.bodyType ?? ''}
                          disabled={disabled}
                        />
                        <div
                          className={
                            styles[
                              isDesktop
                                ? 'date-row-desktop-50'
                                : 'date-row-mobile'
                            ]
                          }
                        >
                          <DatePicker
                            id={`trailerFirstRegistration_${index}`}
                            label={t('forms.compound.trailerFirstRegistration')}
                            value={toDateValue(trailer.firstRegistration)}
                            onChange={() => {}}
                            placeholder={t(
                              'forms.foreign_violation.datePickerPlaceholder',
                            )}
                            disabled={disabled}
                          />
                        </div>
                        <Select
                          id={`trailerCategoryCode_${index}`}
                          label={t('forms.compound.trailerCategory')}
                          options={trailerCategories.map((c) => ({
                            value: c.code,
                            label: c.name,
                          }))}
                          value={
                            trailerCategories
                              .map((c) => ({ value: c.code, label: c.name }))
                              .find((o) => o.value === trailer.categoryCode) ??
                            null
                          }
                          disabled={disabled}
                        />
                        <TextField
                          id={`trailerCategoryOther_${index}`}
                          label={t('forms.compound.trailerCategoryOther')}
                          value={trailer.categoryOther ?? ''}
                          disabled={disabled}
                        />
                      </div>
                    </Card.Content>
                  </Card>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Ettevõte */}
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3">{t('forms.compound.company')}</Heading>
              <p className="mb-1">{t('forms.compound.companySubtitle')}</p>
              <div className={gridClass}>
                <TextField
                  id="companyRegCode"
                  label={t('forms.compound.companyRegCode')}
                  value={form.companyRegCode ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="companyName"
                  label={t('forms.compound.companyName')}
                  value={form.companyName ?? ''}
                  disabled={disabled}
                />
                <Select
                  id="companyCountryCode"
                  label={t('forms.compound.companyCountryCode')}
                  options={countries}
                  value={
                    countries.find(
                      (o) => o.value === form.companyCountryCode,
                    ) ?? null
                  }
                  disabled={disabled}
                />
                <Select
                  id="companyCounty"
                  label={t('forms.compound.companyCounty')}
                  options={counties.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  }))}
                  value={
                    counties
                      .map((c) => ({ value: String(c.id), label: c.name }))
                      .find((o) => o.value === form.companyCounty) ?? null
                  }
                  disabled={disabled}
                />
                <Select
                  id="companyCity"
                  label={t('forms.compound.companyCity')}
                  options={companyCitiesParishes.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  }))}
                  value={
                    companyCitiesParishes
                      .map((c) => ({ value: String(c.id), label: c.name }))
                      .find((o) => o.value === form.companyCity) ?? null
                  }
                  disabled={disabled}
                />
                <TextField
                  id="companyAddressLine1"
                  label={t('forms.compound.companyAddressLine1')}
                  value={form.companyAddressLine1 ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="companyPostalCode"
                  label={t('forms.compound.companyPostalCode')}
                  value={form.companyPostalCode ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="companyOwnerFirstName"
                  label={t('forms.compound.companyOwnerFirstName')}
                  value={form.companyOwnerFirstName ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="companyOwnerLastName"
                  label={t('forms.compound.companyOwnerLastName')}
                  value={form.companyOwnerLastName ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="companyActivityLicenceCopyNumber"
                  label={t('forms.compound.companyActivityLicenceCopyNumber')}
                  value={form.companyActivityLicenceCopyNumber ?? ''}
                  disabled={disabled}
                />
              </div>
            </Card.Content>
          </Card>

          {/* Juht */}
          {drivers.map((driver, index) => (
            <Card key={index} className="mb-1">
              <Card.Content>
                <Heading element="h3" className="mb-1">
                  {drivers.length > 1
                    ? `${t('forms.compound.driver')} ${index + 1}`
                    : t('forms.compound.driver')}
                </Heading>
                <div className={gridClass} style={{ alignItems: 'start' }}>
                  <TextField
                    id={`driverFirstName_${index}`}
                    label={t('forms.compound.driverFirstName')}
                    value={driver.firstName ?? ''}
                    disabled={disabled}
                  />
                  <TextField
                    id={`driverLastName_${index}`}
                    label={t('forms.compound.driverLastName')}
                    value={driver.lastName ?? ''}
                    disabled={disabled}
                  />
                  <TextField
                    id={`driverPersonalCodeForeign_${index}`}
                    label={t('forms.compound.driverPersonalCodeForeign')}
                    value={driver.personalCodeForeign ?? ''}
                    disabled={disabled}
                  />
                  <TextField
                    id={`driverPersonalCodeEe_${index}`}
                    label={t('forms.compound.driverPersonalCodeEe')}
                    value={driver.personalCodeEe ?? ''}
                    disabled={disabled}
                  />
                  <Select
                    id={`driverCitizenshipCode_${index}`}
                    label={t('forms.compound.driverCitizenshipCode')}
                    options={countries}
                    value={
                      countries.find(
                        (o) => o.value === driver.citizenshipCode,
                      ) ?? null
                    }
                    disabled={disabled}
                  />
                  <div
                    className={
                      styles[
                        isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                      ]
                    }
                  >
                    <DatePicker
                      id={`driverBirthDate_${index}`}
                      label={t('forms.compound.driverBirthDate')}
                      value={toDateValue(driver.birthDate)}
                      onChange={() => {}}
                      placeholder={t(
                        'forms.foreign_violation.datePickerPlaceholder',
                      )}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}

          {/* Inspektor */}
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.compound.inspector')}
              </Heading>
              <div className={gridClass}>
                <TextField
                  id="inspectorFirstName"
                  label={t('forms.compound.inspectorFirstName')}
                  value={form.inspectorFirstName ?? ''}
                  disabled={disabled}
                />
                <TextField
                  id="inspectorLastName"
                  label={t('forms.compound.inspectorLastName')}
                  value={form.inspectorLastName ?? ''}
                  disabled={disabled}
                />
                <Select
                  id="inspectorOrganisation"
                  label={t('forms.compound.inspectorOrganisation')}
                  options={orgOptions}
                  value={
                    orgOptions.find(
                      (o) => o.value === String(form.inspectorOrganisationId),
                    ) ?? null
                  }
                  disabled={disabled}
                />
                <Select
                  id="inspectorUnit"
                  label={t('forms.compound.inspectorUnit')}
                  options={structureUnits.map((opt) => ({
                    label: opt.name,
                    value: opt.code,
                  }))}
                  value={
                    structureUnits
                      .map((opt) => ({ label: opt.name, value: opt.code }))
                      .find((o) => o.value === form.inspectorUnit) ?? null
                  }
                  disabled={disabled}
                />
                <TextField
                  id="inspectorProfession"
                  label={t('forms.compound.inspectorProfession')}
                  value={form.inspectorProfession ?? ''}
                  disabled={disabled}
                />
              </div>
            </Card.Content>
          </Card>

          {form.id && (
            <FormVersionsTable formId={form.id} formType={formType} />
          )}
        </Tabs.Content>
      </Tabs>

      {!isSnapshot && (
        <div className="page-actions mt-1">
          <div className="page-actions-buttons">
            {canEdit && (
              <Button
                iconLeft="edit"
                visualType="secondary"
                type="button"
                onClick={onEdit}
              >
                {t('common.edit')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
