import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  DateField,
  Heading,
  TextField,
  Text,
  Select,
  Alert,
  ChoiceGroup,
  TextArea,
  Tooltip,
  InfoButton,
} from '@tedi-design-system/react/tedi';
import type { FormikProps } from 'formik';
import type { Trailer, Driver } from '../../types';
import { COUNTRIES, OTHER, ROAD } from '../../../../constants/constants';
import { vehicleCategoryColWidth } from './vehicleCategoryLayout';
import styles from '../../pages/compound-form/CompoundFormPage.module.css';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import { emptyTrailer } from '../../pages/compound-form/useCompoundForm';
import { toIsoDate, birthDateFromEstonianCode } from '../../../../hooks/dateUtils';
import { MaskedDateField } from '../shared/MaskedDateField';
import { MaskedTimeField } from '../shared/MaskedTimeField';
import React from 'react';

interface CompoundFormValues {
  id: string;
  formNumber: string;
  controlCountryCode: string;
  address: string;
  road: string;
  roadOther: string;
  kilometer: string;
  county: string;
  city: string;
  controlDate: string;
  controlTime: string;
  road_type: string;
  vehicleRegNr: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleCountryCode: string;
  vehicleVin: string;
  vehicleFirstRegistration: string;
  vehicleBodyType: string;
  vehicleCategoryCode: string;
  vehicleCategoryOther: string;
  vehicleMileage: string;
  roadTaxStatus: string;
  roadTaxNotes: string;
  trailers: Trailer[];
  companyRegCode: string;
  companyName: string;
  companyCountryCode: string;
  companyCounty: string;
  companyCity: string;
  companyAddressLine1: string;
  companyPostalCode: string;
  companyOwnerFirstName: string;
  companyOwnerLastName: string;
  companyActivityLicenceCopyNumber: string;
  drivers: Driver[];
  inspectorFirstName: string;
  inspectorLastName: string;
  inspectorOrganisationId: string;
  inspectorUnit: string;
  inspectorProfession: string;
}

interface TrailerTouched {
  regNr?: boolean;
  countryCode?: boolean;
  categoryCode?: boolean;
  categoryOther?: boolean;
}

interface TrailerErrors {
  regNr?: string;
  countryCode?: string;
  categoryCode?: string;
  categoryOther?: string;
}

interface DriverErrors {
  firstName?: string;
  lastName?: string;
  personalCodeForeign?: string;
  personalCodeEe?: string;
  birthDate?: string;
}

interface CompoundFormEditCardProps {
  formik: FormikProps<CompoundFormValues>;
  isDesktop: boolean;
  orgOptions: { label: string; value: string }[];
  structureUnits: { code: string; name: string }[];
  roads: { code: string; name: string }[];
  trailerCategories: { code: string; name: string }[];
  vehicleCategories: { code: string; name: string }[];
  counties: { id: number; name: string }[];
  citiesParishes: { id: number; name: string }[];
  companyCitiesParishes: { id: number; name: string }[];
  canConfirm: boolean;
  canDelete: boolean;
  companySearchError: boolean;
  setCompanySearchError: (v: boolean) => void;
  vehicleSearchError: boolean;
  setVehicleSearchError: (v: boolean) => void;
  trailerSearchError: number | null;
  setTrailerSearchError: (v: number | null) => void;
  mtrSearchError: boolean;
  setMtrSearchError: (v: boolean) => void;
  handleOrgChange: (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => void;
  handleStructuralUnitChange: (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => void;
  handleCountyChange: (countyId?: number) => void;
  handleCompanyCountyChange: (countyId?: number) => void;
  handleCompanySearch: () => void;
  handleVehicleSearch: () => void;
  handleTrailerSearch: (index: number) => void;
  handleMtrSearch: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onDelete: () => void;
  formType: string;
  versionsRefreshKey?: number;
  trailerFormRegNrs?: (string | null)[];
  onAddTrailerControlForm?: (index: number) => void;
  onEditTrailerControlForm?: (index: number) => void;
  onRemoveTrailer?: (index: number) => void;
}

export function CompoundFormEditCard({
  formik,
  isDesktop,
  orgOptions,
  structureUnits,
  roads,
  trailerCategories,
  vehicleCategories,
  counties,
  citiesParishes,
  companyCitiesParishes,
  companySearchError,
  setCompanySearchError,
  vehicleSearchError,
  setVehicleSearchError,
  trailerSearchError,
  setTrailerSearchError,
  mtrSearchError,
  setMtrSearchError,
  handleOrgChange,
  handleStructuralUnitChange,
  handleCountyChange,
  handleCompanyCountyChange,
  handleCompanySearch,
  handleVehicleSearch,
  handleTrailerSearch,
  handleMtrSearch,
  formType,
  versionsRefreshKey,
  trailerFormRegNrs,
  onAddTrailerControlForm,
  onEditTrailerControlForm,
  onRemoveTrailer,
}: CompoundFormEditCardProps) {
  const { t } = useTranslation();

  const countries = COUNTRIES.map((country) => ({
    ...country,
    label: t(country.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  const gridClass =
    styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'];

  return (
    <Card className="mb-1">
      <Card.Content>
        <form onSubmit={formik.handleSubmit}>
          <div className="mb-1">
            <div className="page-header-title">
              <Heading element="h1">
                {(formik.values.formNumber ?? '').split('/')[0]}
              </Heading>
            </div>
          </div>

          <div className="p-0">
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
                    value={formik.values.address}
                    input={{ maxLength: 300 }}
                    onChange={(v) => {
                      formik.setFieldValue('address', v);
                      if (v) {
                        formik.setFieldValue('road', '');
                        formik.setFieldValue('roadOther', '');
                        formik.setFieldValue('kilometer', '');
                        formik.setFieldValue('road_type', ROAD.LOCAL);
                      }
                    }}
                    {...(formik.touched.address && formik.errors.address
                      ? {
                          helper: {
                            text: formik.errors.address as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
                  />
                  <Select
                    id="road"
                    label={t('forms.compound.road')}
                    options={[
                      { value: '', label: '\u00a0' },
                      ...roads.map((r) => ({
                        value: r.code,
                        label: r.name,
                      })),
                    ]}
                    value={
                      [
                        { value: '', label: '\u00a0' },
                        ...roads.map((r) => ({ value: r.code, label: r.name })),
                      ].find((o) => o.value === formik.values.road) ?? null
                    }
                    onChange={(val) => {
                      const roadValue =
                        val && !Array.isArray(val)
                          ? (val as { value: string }).value
                          : '';
                      formik.setFieldValue('road', roadValue);
                      if (!roadValue) {
                        formik.setFieldValue('kilometer', '');
                        formik.setFieldValue('roadOther', '');
                      } else if (roadValue) {
                        formik.setFieldValue('road_type', ROAD.NATIONAL);
                        if (roadValue !== OTHER.ROAD) {
                          formik.setFieldValue('address', '');
                        }
                      }
                    }}
                    {...(formik.touched.road && formik.errors.road
                      ? {
                          helper: {
                            text: formik.errors.road as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
                  />
                  <TextField
                    id="kilometer"
                    label={t('forms.compound.kilometer')}
                    value={formik.values.kilometer}
                    onChange={(v) => {
                      const numericValue = v.replace(/\D/g, '');
                      const parsedValue = parseInt(numericValue, 10) || 0;
                      formik.setFieldValue('kilometer', String(parsedValue));
                    }}
                    input={{ maxLength: 3 }}
                    required={!!formik.values.road}
                    {...(formik.touched.kilometer && formik.errors.kilometer
                      ? {
                          helper: {
                            text: formik.errors.kilometer as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
                  />
                  {formik.values.road === OTHER.ROAD ? (
                    <TextField
                      id="roadOther"
                      label={t('forms.compound.road_other')}
                      value={formik.values.roadOther}
                      input={{ maxLength: 200 }}
                      onChange={(v) => formik.setFieldValue('roadOther', v)}
                      required
                    />
                  ) : (
                    <div />
                  )}
                  <div
                    className={
                      styles[
                        isDesktop ? 'three-col-desktop' : 'three-col-mobile'
                      ]
                    }
                  >
                    <TextField
                      id="controlCountryCode"
                      label={t('forms.foreign_violation.control_country_code')}
                      value={t('countries.EE')}
                      disabled
                      onChange={() => undefined}
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
                          .find((o) => o.value === formik.values.county) ?? null
                      }
                      onChange={(val) => {
                        const v =
                          val && !Array.isArray(val)
                            ? (val as { value: string }).value
                            : '';
                        formik.setFieldValue('county', v);
                        formik.setFieldValue('city', '');
                        handleCountyChange(v ? Number(v) : undefined);
                      }}
                      required={formik.values.controlCountryCode === 'EE'}
                      disabled={formik.values.controlCountryCode !== 'EE'}
                      {...(formik.touched.county && formik.errors.county
                        ? {
                            helper: {
                              text: formik.errors.county as string,
                              type: 'error' as const,
                            },
                          }
                        : {})}
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
                          .find((o) => o.value === formik.values.city) ?? null
                      }
                      onChange={(val) =>
                        formik.setFieldValue(
                          'city',
                          val && !Array.isArray(val)
                            ? (val as { value: string }).value
                            : '',
                        )
                      }
                      disabled={!formik.values.county}
                    />
                  </div>
                  <Text id="road_type">
                    Tee liik: {formik.values.road_type}
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
                    <MaskedDateField
                      id="controlDate"
                      label={t('forms.compound.controlDate')}
                      monthYearSelectType="grid"
                      disableFuture
                      selected={
                        formik.values.controlDate
                          ? new Date(formik.values.controlDate)
                          : undefined
                      }
                      onSelect={(v) =>
                        formik.setFieldValue('controlDate', toIsoDate(v))
                      }
                      placeholder={t('common.dateFieldPlaceholder')}
                      required
                      inputProps={
                        formik.touched.controlDate && formik.errors.controlDate
                          ? {
                              helper: {
                                text: formik.errors.controlDate as string,
                                type: 'error' as const,
                              },
                            }
                          : undefined
                      }
                    />
                    <MaskedTimeField
                      id="controlTime"
                      label={t('forms.compound.controlTime')}
                      value={
                        formik.values.controlTime?.slice(0, 5) ?? undefined
                      }
                      onChange={(v) =>
                        formik.setFieldValue(
                          'controlTime',
                          v ? (v.length === 5 ? `${v}:00` : v) : '',
                        )
                      }
                      placeholder={t('common.timeFieldPlaceholder')}
                      required
                      inputProps={
                        formik.touched.controlTime && formik.errors.controlTime
                          ? {
                              helper: {
                                text: formik.errors.controlTime as string,
                                type: 'error' as const,
                              },
                            }
                          : undefined
                      }
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
                {vehicleSearchError && (
                  <div className="mb-1">
                    <Alert
                      type="danger"
                      size="small"
                      onClose={() => setVehicleSearchError(false)}
                    >
                      {t('common.noResults')}
                    </Alert>
                  </div>
                )}
                <div className={gridClass} style={{ alignItems: 'start' }}>
                  <div className={styles['select-row']}>
                    <div className={styles['select-wrapper']}>
                      <TextField
                        id="vehicleRegNr"
                        label={t('forms.compound.vehicleRegNr')}
                        value={formik.values.vehicleRegNr}
                        input={{ maxLength: 20 }}
                        onChange={(v) =>
                          formik.setFieldValue('vehicleRegNr', v.toUpperCase())
                        }
                        required
                        {...(formik.touched.vehicleRegNr &&
                        formik.errors.vehicleRegNr
                          ? {
                              helper: {
                                text: formik.errors.vehicleRegNr as string,
                                type: 'error' as const,
                              },
                            }
                          : {})}
                      />
                    </div>
                    <Button type="button" onClick={handleVehicleSearch}>
                      {t('common.search')}
                    </Button>
                  </div>
                  <div />
                  <TextField
                    id="vehicleMake"
                    label={t('forms.compound.vehicleMake')}
                    value={formik.values.vehicleMake}
                    input={{ maxLength: 100 }}
                    onChange={(v) => formik.setFieldValue('vehicleMake', v)}
                  />
                  <TextField
                    id="vehicleModel"
                    label={t('forms.compound.vehicleModel')}
                    value={formik.values.vehicleModel}
                    input={{ maxLength: 100 }}
                    onChange={(v) => formik.setFieldValue('vehicleModel', v)}
                  />
                  <TextField
                    id="vehicleVin"
                    label={t('forms.compound.vehicleVin')}
                    value={formik.values.vehicleVin}
                    input={{ maxLength: 17 }}
                    onChange={(v) => formik.setFieldValue('vehicleVin', v)}
                  />
                  <Select
                    id="vehicleCountryCode"
                    label={t('forms.compound.vehicleCountry')}
                    options={countries}
                    value={
                      countries.find(
                        (o) => o.value === formik.values.vehicleCountryCode,
                      ) ?? null
                    }
                    onChange={(val) =>
                      formik.setFieldValue(
                        'vehicleCountryCode',
                        val && !Array.isArray(val)
                          ? (val as { value: string }).value
                          : '',
                      )
                    }
                    required
                    {...(formik.touched.vehicleCountryCode &&
                    formik.errors.vehicleCountryCode
                      ? {
                          helper: {
                            text: formik.errors.vehicleCountryCode as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
                  />
                  <TextField
                    id="vehicleBodyType"
                    label={t('forms.compound.vehicleBodyType')}
                    value={formik.values.vehicleBodyType}
                    input={{ maxLength: 50 }}
                    onChange={(v) => formik.setFieldValue('vehicleBodyType', v)}
                  />
                  <div
                    className={
                      styles[
                        isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                      ]
                    }
                  >
                    <DateField
                      id="vehicleFirstRegistration"
                      label={t('forms.compound.vehicleFirstRegistration')}
                      monthYearSelectType="grid"
                      selected={
                        formik.values.vehicleFirstRegistration
                          ? new Date(formik.values.vehicleFirstRegistration)
                          : undefined
                      }
                      onSelect={(v) =>
                        formik.setFieldValue(
                          'vehicleFirstRegistration',
                          toIsoDate(v),
                        )
                      }
                      placeholder={t('common.dateFieldPlaceholder')}
                    />
                  </div>
                  <ChoiceGroup
                    id="vehicleCategoryCode"
                    name="vehicleCategoryCode"
                    label={t('forms.compound.vehicleCategory')}
                    inputType="radio"
                    value={formik.values.vehicleCategoryCode}
                    onChange={(val) =>
                      formik.setFieldValue('vehicleCategoryCode', val)
                    }
                    items={vehicleCategories.map((c) => ({
                      id: `vehicleCat-${c.code}`,
                      value: c.code,
                      label: c.name,
                      colProps: { width: vehicleCategoryColWidth(c.code) },
                    }))}
                    required
                    {...(formik.touched.vehicleCategoryCode &&
                    formik.errors.vehicleCategoryCode
                      ? {
                          helper: {
                            text: formik.errors.vehicleCategoryCode as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
                  />
                  {formik.values.vehicleCategoryCode ===
                  OTHER.VEHICLE_CATEGORY ? (
                    <TextField
                      id="vehicleCategoryOther"
                      label={t('forms.compound.vehicleCategoryOther')}
                      value={formik.values.vehicleCategoryOther}
                      input={{ maxLength: 100 }}
                      onChange={(v) =>
                        formik.setFieldValue(
                          'vehicleCategoryOther',
                          v.toUpperCase(),
                        )
                      }
                      required
                      {...(formik.touched.vehicleCategoryOther &&
                      formik.errors.vehicleCategoryOther
                        ? {
                            helper: {
                              text: formik.errors
                                .vehicleCategoryOther as string,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                  ) : (
                    <div />
                  )}
                  <TextField
                    id="vehicleMileage"
                    label={t('forms.compound.vehicleMileage')}
                    value={formik.values.vehicleMileage}
                    onChange={(v) => {
                      const numericValue = v.replace(/\D/g, '');
                      const parsedValue = parseInt(numericValue, 10) || 0;
                      formik.setFieldValue(
                        'vehicleMileage',
                        String(parsedValue),
                      );
                    }}
                    input={{ maxLength: 8 }}
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
                  <ChoiceGroup
                    id="roadTaxStatus"
                    label={<strong>{t('forms.compound.roadTaxStatus')}</strong>}
                    name="roadTaxStatus"
                    inputType="radio"
                    direction="row"
                    value={formik.values.roadTaxStatus}
                    onChange={(val) =>
                      formik.setFieldValue('roadTaxStatus', val)
                    }
                    items={[
                      {
                        id: 'road_tax_status_1',
                        value: 'Ei kohaldu',
                        label: t('forms.compound.roadTaxStatusNotApplicable'),
                      },
                      {
                        id: 'road_tax_status_2',
                        value: 'Tasumata',
                        label: t('forms.compound.roadTaxStatusUnpaid'),
                      },
                      {
                        id: 'road_tax_status_3',
                        value: 'Tasutud väiksemas määras',
                        label: t('forms.compound.roadTaxStatusUnderpaid'),
                      },
                    ]}
                  />
                  <div />
                  <TextArea
                    id="roadTaxNotes"
                    label={t('forms.compound.roadTaxNotes')}
                    value={formik.values.roadTaxNotes}
                    input={{ maxLength: 4000 }}
                    onChange={(v) => formik.setFieldValue('roadTaxNotes', v)}
                    className={styles['full-span']}
                  />
                </div>
              </Card.Content>
            </Card>

            {/* Haagised */}
            <Card className="mb-1">
              <Card.Content>
                <Heading element="h3" className="mb-1">
                  {t('forms.compound.trailer')}
                </Heading>
                <Button
                  type="button"
                  onClick={() =>
                    formik.values.trailers.length < 3 &&
                    formik.setFieldValue('trailers', [
                      ...formik.values.trailers,
                      emptyTrailer(),
                    ])
                  }
                  disabled={formik.values.trailers.length >= 3}
                >
                  {t('forms.compound.addTrailer')}
                </Button>
                {formik.values.trailers.map(
                  (trailer: Trailer, index: number) => (
                    <Card key={index} className="mt-1 mb-1">
                      <Card.Content>
                        {trailerSearchError === index && (
                          <div className="mb-1">
                            <Alert
                              type="danger"
                              size="small"
                              onClose={() => setTrailerSearchError(null)}
                            >
                              {t('common.noResults')}
                            </Alert>
                          </div>
                        )}
                        <Heading element="h3" className="mb-1">
                          {t('forms.compound.trailerNumber', {
                            number: index + 1,
                          })}
                        </Heading>
                        <div
                          className={gridClass}
                          style={{ alignItems: 'start' }}
                        >
                          <div className={styles['select-row']}>
                            <div className={styles['select-wrapper']}>
                              <TextField
                                id={`trailerRegNr_${index}`}
                                label={t('forms.compound.trailerRegNr')}
                                value={trailer.regNr}
                                input={{ maxLength: 20 }}
                                onChange={(v) => {
                                  const u = [...formik.values.trailers];
                                  u[index] = {
                                    ...u[index],
                                    regNr: v.toUpperCase(),
                                  };
                                  formik.setFieldValue('trailers', u);
                                }}
                                required
                                {...((
                                  formik.touched.trailers as TrailerTouched[]
                                )?.[index]?.regNr &&
                                (formik.errors.trailers as TrailerErrors[])?.[
                                  index
                                ]?.regNr
                                  ? {
                                      helper: {
                                        text: (
                                          formik.errors
                                            .trailers as TrailerErrors[]
                                        )[index].regNr,
                                        type: 'error' as const,
                                      },
                                    }
                                  : {})}
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={() => handleTrailerSearch(index)}
                            >
                              {t('common.search')}
                            </Button>
                          </div>
                          <div />
                          <TextField
                            id={`trailerMake_${index}`}
                            label={t('forms.compound.trailerMake')}
                            value={trailer.make}
                            input={{ maxLength: 100 }}
                            onChange={(v) => {
                              const u = [...formik.values.trailers];
                              u[index] = { ...u[index], make: v };
                              formik.setFieldValue('trailers', u);
                            }}
                          />
                          <TextField
                            id={`trailerModel_${index}`}
                            label={t('forms.compound.trailerModel')}
                            value={trailer.model}
                            input={{ maxLength: 100 }}
                            onChange={(v) => {
                              const u = [...formik.values.trailers];
                              u[index] = { ...u[index], model: v };
                              formik.setFieldValue('trailers', u);
                            }}
                          />
                          <TextField
                            id={`trailerVin_${index}`}
                            label={t('forms.compound.trailerVin')}
                            value={trailer.vin}
                            input={{ maxLength: 17 }}
                            onChange={(v) => {
                              const u = [...formik.values.trailers];
                              u[index] = { ...u[index], vin: v };
                              formik.setFieldValue('trailers', u);
                            }}
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
                            onChange={(val) => {
                              const u = [...formik.values.trailers];
                              u[index] = {
                                ...u[index],
                                countryCode:
                                  val && !Array.isArray(val)
                                    ? (val as { value: string }).value
                                    : '',
                              };
                              formik.setFieldValue('trailers', u);
                            }}
                            required
                            {...((
                              formik.touched.trailers as TrailerTouched[]
                            )?.[index]?.countryCode &&
                            (formik.errors.trailers as TrailerErrors[])?.[index]
                              ?.countryCode
                              ? {
                                  helper: {
                                    text: (
                                      formik.errors.trailers as TrailerErrors[]
                                    )[index].countryCode,
                                    type: 'error' as const,
                                  },
                                }
                              : {})}
                          />
                          <TextField
                            id={`trailerBodyType_${index}`}
                            label={t('forms.compound.trailerBodyType')}
                            value={trailer.bodyType}
                            input={{ maxLength: 50 }}
                            onChange={(v) => {
                              const u = [...formik.values.trailers];
                              u[index] = { ...u[index], bodyType: v };
                              formik.setFieldValue('trailers', u);
                            }}
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
                            <DateField
                              id={`trailerFirstRegistration_${index}`}
                              label={t(
                                'forms.compound.trailerFirstRegistration',
                              )}
                              monthYearSelectType="grid"
                              selected={
                                trailer.firstRegistration
                                  ? new Date(trailer.firstRegistration)
                                  : undefined
                              }
                              onSelect={(v) => {
                                const u = [...formik.values.trailers];
                                u[index] = {
                                  ...u[index],
                                  firstRegistration: toIsoDate(v),
                                };
                                formik.setFieldValue('trailers', u);
                              }}
                              placeholder={t('common.dateFieldPlaceholder')}
                            />
                          </div>
                          <ChoiceGroup
                            id={`trailerCategoryCode_${index}`}
                            name={`trailerCategoryCode_${index}`}
                            label={t('forms.compound.trailerCategory')}
                            inputType="radio"
                            direction="row"
                            value={trailer.categoryCode}
                            onChange={(val) => {
                              const u = [...formik.values.trailers];
                              u[index] = {
                                ...u[index],
                                categoryCode: val as string,
                              };
                              formik.setFieldValue('trailers', u);
                            }}
                            items={trailerCategories.map((c) => ({
                              id: `trailerCat-${index}-${c.code}`,
                              value: c.code,
                              label: c.name,
                            }))}
                            required
                            {...((
                              formik.touched.trailers as TrailerTouched[]
                            )?.[index]?.categoryCode &&
                            (formik.errors.trailers as TrailerErrors[])?.[index]
                              ?.categoryCode
                              ? {
                                  helper: {
                                    text: (
                                      formik.errors.trailers as TrailerErrors[]
                                    )[index].categoryCode,
                                    type: 'error' as const,
                                  },
                                }
                              : {})}
                          />
                          {trailer.categoryCode === OTHER.TRAILER_CATEGORY ? (
                            <TextField
                              id={`trailerCategoryOther_${index}`}
                              label={t('forms.compound.trailerCategoryOther')}
                              value={trailer.categoryOther}
                              input={{ maxLength: 100 }}
                              onChange={(v) => {
                                const u = [...formik.values.trailers];
                                u[index] = {
                                  ...u[index],
                                  categoryOther: v.toUpperCase(),
                                };
                                formik.setFieldValue('trailers', u);
                              }}
                              required
                              {...((
                                formik.touched.trailers as TrailerTouched[]
                              )?.[index]?.categoryOther &&
                              (formik.errors.trailers as TrailerErrors[])?.[
                                index
                              ]?.categoryOther
                                ? {
                                    helper: {
                                      text: (
                                        formik.errors
                                          .trailers as TrailerErrors[]
                                      )[index].categoryOther,
                                      type: 'error' as const,
                                    },
                                  }
                                : {})}
                            />
                          ) : (
                            <div />
                          )}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'flex-end',
                              gap: '0.5rem',
                            }}
                            className={styles['full-span']}
                          >
                            {(onAddTrailerControlForm ||
                              onEditTrailerControlForm) &&
                              (() => {
                                const trailerRegNrMatches =
                                  trailerFormRegNrs?.some(
                                    (r) => r && r === trailer.regNr,
                                  );
                                return trailerRegNrMatches ? (
                                  <Button
                                    type="button"
                                    visualType="secondary"
                                    onClick={() =>
                                      onEditTrailerControlForm?.(index)
                                    }
                                  >
                                    {t('forms.compound.editTrailerControlForm')}
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    visualType="secondary"
                                    disabled={!trailer.regNr}
                                    onClick={() =>
                                      onAddTrailerControlForm?.(index)
                                    }
                                  >
                                    {t('forms.compound.addTrailerControlForm')}
                                  </Button>
                                );
                              })()}
                            <Button
                              type="button"
                              visualType="secondary"
                              onClick={() => {
                                if (onRemoveTrailer) {
                                  onRemoveTrailer(index);
                                } else {
                                  formik.setFieldValue(
                                    'trailers',
                                    formik.values.trailers.filter(
                                      (_: Trailer, i: number) => i !== index,
                                    ),
                                  );
                                }
                              }}
                            >
                              {t('forms.compound.removeTrailer')}
                            </Button>
                          </div>
                        </div>
                      </Card.Content>
                    </Card>
                  ),
                )}
              </Card.Content>
            </Card>

            {/* Ettevõte */}
            <Card className="mb-1">
              <Card.Content>
                <Heading element="h3">{t('forms.compound.company')}</Heading>
                <p className="mb-1">{t('forms.compound.companySubtitle')}</p>
                <Card className="mb-1">
                  <Card.Content>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                      className="mb-1"
                    >
                      <Heading element="h4">
                        {t('forms.compound.companyBusinessRegistrySearch')}
                      </Heading>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <InfoButton />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          {t('forms.compound.companyBusinessRegistryTooltip')}
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                    {companySearchError && (
                      <div className="mb-1">
                        <Alert
                          type="danger"
                          size="small"
                          onClose={() => setCompanySearchError(false)}
                        >
                          {t('common.noResults')}
                        </Alert>
                      </div>
                    )}
                    <div className={gridClass}>
                      <TextField
                        id="companyRegCode"
                        label={t('forms.compound.companyRegCode')}
                        value={formik.values.companyRegCode}
                        input={{ maxLength: 20 }}
                        onChange={(v) =>
                          formik.setFieldValue('companyRegCode', v)
                        }
                        {...(formik.touched.companyRegCode &&
                        formik.errors.companyRegCode
                          ? {
                              helper: {
                                text: formik.errors.companyRegCode as string,
                                type: 'error' as const,
                              },
                            }
                          : {})}
                      />
                      <TextField
                        id="companyName"
                        label={t('forms.compound.companyName')}
                        value={formik.values.companyName}
                        input={{ maxLength: 300 }}
                        onChange={(v) => formik.setFieldValue('companyName', v)}
                        {...(formik.touched.companyName &&
                        formik.errors.companyName
                          ? {
                              helper: {
                                text: formik.errors.companyName as string,
                                type: 'error' as const,
                              },
                            }
                          : {})}
                      />
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Button type="button" onClick={handleCompanySearch}>
                          {t('forms.compound.companySearchButton')}
                        </Button>
                      </div>
                      <Select
                        id="companyCountryCode"
                        label={t('forms.compound.companyCountryCode')}
                        options={countries}
                        value={
                          countries.find(
                            (o) => o.value === formik.values.companyCountryCode,
                          ) ?? null
                        }
                        onChange={(val) => {
                          const newCode =
                            val && !Array.isArray(val)
                              ? (val as { value: string }).value
                              : '';
                          formik.setFieldValue('companyCountryCode', newCode);
                          if (newCode !== 'EE') {
                            formik.setFieldValue('companyCounty', '');
                            formik.setFieldValue('companyCity', '');
                          }
                        }}
                        required={!!formik.values.companyName}
                        {...(formik.touched.companyCountryCode &&
                        formik.errors.companyCountryCode
                          ? {
                              helper: {
                                text: formik.errors
                                  .companyCountryCode as string,
                                type: 'error' as const,
                              },
                            }
                          : {})}
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
                            .map((c) => ({
                              value: String(c.id),
                              label: c.name,
                            }))
                            .find(
                              (o) => o.value === formik.values.companyCounty,
                            ) ?? null
                        }
                        onChange={(val) => {
                          const v =
                            val && !Array.isArray(val)
                              ? (val as { value: string }).value
                              : '';
                          formik.setFieldValue('companyCounty', v);
                          formik.setFieldValue('companyCity', '');
                          handleCompanyCountyChange(v ? Number(v) : undefined);
                        }}
                        disabled={formik.values.companyCountryCode !== 'EE'}
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
                            .map((c) => ({
                              value: String(c.id),
                              label: c.name,
                            }))
                            .find(
                              (o) => o.value === formik.values.companyCity,
                            ) ?? null
                        }
                        onChange={(val) =>
                          formik.setFieldValue(
                            'companyCity',
                            val && !Array.isArray(val)
                              ? (val as { value: string }).value
                              : '',
                          )
                        }
                        disabled={!formik.values.companyCounty}
                      />
                      <TextField
                        id="companyAddressLine1"
                        label={t('forms.compound.companyAddressLine1')}
                        value={formik.values.companyAddressLine1}
                        input={{ maxLength: 300 }}
                        onChange={(v) =>
                          formik.setFieldValue('companyAddressLine1', v)
                        }
                      />
                      <TextField
                        id="companyPostalCode"
                        label={t('forms.compound.companyPostalCode')}
                        value={formik.values.companyPostalCode}
                        input={{ maxLength: 20 }}
                        onChange={(v) =>
                          formik.setFieldValue('companyPostalCode', v)
                        }
                      />
                      <div />
                      <TextField
                        id="companyOwnerFirstName"
                        label={t('forms.compound.companyOwnerFirstName')}
                        value={formik.values.companyOwnerFirstName}
                        input={{ maxLength: 100 }}
                        onChange={(v) =>
                          formik.setFieldValue('companyOwnerFirstName', v)
                        }
                      />
                      <TextField
                        id="companyOwnerLastName"
                        label={t('forms.compound.companyOwnerLastName')}
                        value={formik.values.companyOwnerLastName}
                        input={{ maxLength: 100 }}
                        onChange={(v) =>
                          formik.setFieldValue('companyOwnerLastName', v)
                        }
                      />
                    </div>
                  </Card.Content>
                </Card>
                <Card className="mt-1">
                  <Card.Content>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                      className="mb-1"
                    >
                      <Heading element="h4">
                        {t('forms.compound.mtrSearch')}
                      </Heading>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <InfoButton />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          {t('forms.compound.mtrTooltip')}
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                    {mtrSearchError && (
                      <div className="mb-1">
                        <Alert
                          type="danger"
                          size="small"
                          onClose={() => setMtrSearchError(false)}
                        >
                          {t('common.noResults')}
                        </Alert>
                      </div>
                    )}
                    <p className="mb-1">
                      {t('forms.compound.companyRegCode')}:{' '}
                      <strong>{formik.values.companyRegCode || '—'}</strong>
                      {'  '}
                      {t('forms.compound.vehicleRegNr')}:{' '}
                      <strong>{formik.values.vehicleRegNr || '—'}</strong>
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-end',
                        width: isDesktop ? '80%' : '100%',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <TextField
                          id="companyActivityLicenceCopyNumber"
                          label={t(
                            'forms.compound.companyActivityLicenceCopyNumber',
                          )}
                          value={formik.values.companyActivityLicenceCopyNumber}
                          input={{ maxLength: 100 }}
                          onChange={(v) =>
                            formik.setFieldValue(
                              'companyActivityLicenceCopyNumber',
                              v,
                            )
                          }
                        />
                      </div>
                      <Button type="button" onClick={handleMtrSearch}>
                        {t('forms.compound.mtrSearchButton')}
                      </Button>
                    </div>
                  </Card.Content>
                </Card>
              </Card.Content>
            </Card>

            {/* Juht */}
            {formik.values.drivers.map((_driver: Driver, index: number) => (
              <Card key={index} className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {formik.values.drivers.length > 1
                      ? `${t('forms.compound.driver')} ${index + 1}`
                      : t('forms.compound.driver')}
                  </Heading>
                  <div className={gridClass} style={{ alignItems: 'start' }}>
                    <TextField
                      id={`driverFirstName_${index}`}
                      label={t('forms.compound.driverFirstName')}
                      value={formik.values.drivers[index]?.firstName ?? ''}
                      input={{ maxLength: 100 }}
                      onChange={(v) => {
                        const u = [...formik.values.drivers];
                        u[index] = { ...u[index], firstName: v };
                        formik.setFieldValue('drivers', u);
                      }}
                      required={index === 0}
                      {...((formik.errors.drivers as DriverErrors[])?.[index]
                        ?.firstName
                        ? {
                            helper: {
                              text: (formik.errors.drivers as DriverErrors[])[
                                index
                              ].firstName,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                    <TextField
                      id={`driverLastName_${index}`}
                      label={t('forms.compound.driverLastName')}
                      value={formik.values.drivers[index]?.lastName ?? ''}
                      input={{ maxLength: 100 }}
                      onChange={(v) => {
                        const u = [...formik.values.drivers];
                        u[index] = { ...u[index], lastName: v };
                        formik.setFieldValue('drivers', u);
                      }}
                      required={index === 0}
                      {...((formik.errors.drivers as DriverErrors[])?.[index]
                        ?.lastName
                        ? {
                            helper: {
                              text: (formik.errors.drivers as DriverErrors[])[
                                index
                              ].lastName,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                    <TextField
                      id={`driverPersonalCodeForeign_${index}`}
                      label={t('forms.compound.driverPersonalCodeForeign')}
                      value={
                        formik.values.drivers[index]?.personalCodeForeign ?? ''
                      }
                      input={{ maxLength: 50 }}
                      onChange={(v) => {
                        const u = [...formik.values.drivers];
                        u[index] = { ...u[index], personalCodeForeign: v };
                        formik.setFieldValue('drivers', u);
                      }}
                      {...((formik.errors.drivers as DriverErrors[])?.[index]
                        ?.personalCodeForeign
                        ? {
                            helper: {
                              text: (formik.errors.drivers as DriverErrors[])[
                                index
                              ].personalCodeForeign,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                    <TextField
                      id={`driverPersonalCodeEe_${index}`}
                      label={t('forms.compound.driverPersonalCodeEe')}
                      value={formik.values.drivers[index]?.personalCodeEe ?? ''}
                      input={{ maxLength: 11 }}
                      onChange={(v) => {
                        const u = [...formik.values.drivers];
                        const computed = !u[index]?.birthDate ? birthDateFromEstonianCode(v) : null;
                        u[index] = { ...u[index], personalCodeEe: v, ...(computed ? { birthDate: computed } : {}) };
                        formik.setFieldValue('drivers', u);
                      }}
                      {...((formik.errors.drivers as DriverErrors[])?.[index]
                        ?.personalCodeEe
                        ? {
                            helper: {
                              text: (formik.errors.drivers as DriverErrors[])[
                                index
                              ].personalCodeEe,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                    <Select
                      id={`driverCitizenshipCode_${index}`}
                      label={t('forms.compound.driverCitizenshipCode')}
                      options={countries}
                      value={
                        countries.find(
                          (o) =>
                            o.value ===
                            formik.values.drivers[index]?.citizenshipCode,
                        ) ?? null
                      }
                      onChange={(val) => {
                        const u = [...formik.values.drivers];
                        u[index] = {
                          ...u[index],
                          citizenshipCode:
                            val && !Array.isArray(val)
                              ? (val as { value: string }).value
                              : '',
                        };
                        formik.setFieldValue('drivers', u);
                      }}
                    />
                    <div
                      className={
                        styles[
                          isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                        ]
                      }
                    >
                      <DateField
                        id={`driverBirthDate_${index}`}
                        label={t('forms.compound.driverBirthDate')}
                        monthYearSelectType="grid"
                        selected={
                          formik.values.drivers[index]?.birthDate
                            ? new Date(formik.values.drivers[index].birthDate)
                            : undefined
                        }
                        onSelect={(v) => {
                          const u = [...formik.values.drivers];
                          u[index] = { ...u[index], birthDate: toIsoDate(v) };
                          formik.setFieldValue('drivers', u);
                        }}
                        placeholder={t('common.dateFieldPlaceholder')}
                        required={index === 0}
                        inputProps={
                          (formik.errors.drivers as DriverErrors[])?.[index]
                            ?.birthDate
                            ? {
                                helper: {
                                  text: (
                                    formik.errors.drivers as DriverErrors[]
                                  )[index].birthDate,
                                  type: 'error' as const,
                                },
                              }
                            : undefined
                        }
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
                    value={formik.values.inspectorFirstName}
                    input={{ maxLength: 100 }}
                    required
                    onChange={(v) =>
                      formik.setFieldValue('inspectorFirstName', v)
                    }
                    {...(formik.touched.inspectorFirstName &&
                    formik.errors.inspectorFirstName
                      ? {
                          helper: {
                            text: formik.errors.inspectorFirstName as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
                  />
                  <TextField
                    id="inspectorLastName"
                    label={t('forms.compound.inspectorLastName')}
                    value={formik.values.inspectorLastName}
                    input={{ maxLength: 100 }}
                    required
                    onChange={(v) =>
                      formik.setFieldValue('inspectorLastName', v)
                    }
                    {...(formik.touched.inspectorLastName &&
                    formik.errors.inspectorLastName
                      ? {
                          helper: {
                            text: formik.errors.inspectorLastName as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
                  />
                  <Select
                    id="inspectorOrganisation"
                    label={t('forms.compound.inspectorOrganisation')}
                    options={orgOptions}
                    value={
                      orgOptions.find(
                        (o) =>
                          o.value ===
                          String(formik.values.inspectorOrganisationId),
                      ) ?? null
                    }
                    onChange={handleOrgChange}
                    required
                    {...(formik.touched.inspectorOrganisationId &&
                    formik.errors.inspectorOrganisationId
                      ? {
                          helper: {
                            text: formik.errors
                              .inspectorOrganisationId as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
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
                        .find((o) => o.value === formik.values.inspectorUnit) ??
                      null
                    }
                    onChange={handleStructuralUnitChange}
                  />
                  <TextField
                    id="inspectorProfession"
                    label={t('forms.compound.inspectorProfession')}
                    value={formik.values.inspectorProfession}
                    input={{ maxLength: 150 }}
                    onChange={(v) =>
                      formik.setFieldValue('inspectorProfession', v)
                    }
                    required
                    {...(formik.touched.inspectorProfession &&
                    formik.errors.inspectorProfession
                      ? {
                          helper: {
                            text: formik.errors.inspectorProfession as string,
                            type: 'error' as const,
                          },
                        }
                      : {})}
                  />
                </div>
              </Card.Content>
            </Card>

            {formik.values.id && (
              <FormVersionsTable
                formId={formik.values.id}
                formType={formType}
                refreshKey={versionsRefreshKey}
              />
            )}
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}
