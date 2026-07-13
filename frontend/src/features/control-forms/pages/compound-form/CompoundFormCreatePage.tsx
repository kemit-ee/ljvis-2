import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OTHER, ROAD } from '../../../../constants/constants';

import {
  Button,
  Heading,
  TextField,
  Select,
  Row,
  Col,
  Card,
  Text,
  Alert,
  ChoiceGroup,
  TextArea,
  Tooltip,
  InfoButton,
  Tabs
} from '@tedi-design-system/react/tedi';
import { DatePicker, TimePicker } from '@tedi-design-system/react/community';
import { useCompoundForm, emptyTrailer, emptyDriver } from './useCompoundForm';
import type { Trailer } from '../../types';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, COUNTRIES } from '../../../../constants/constants';
import dayjs from 'dayjs';
import { toIsoDate } from '../../../../hooks/dateUtils';
import styles from './CompoundFormPage.module.css';

export function CompoundFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const forbidden = !hasPermission('foreign_violation_form.write');
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const handleSaved = () => {
    navigate('/', { state: { justCreated: true } });
  };

  const countries = COUNTRIES.map((country) => ({
    ...country,
    label: t(country.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  const {
    formik,
    structureUnits,
    orgOptions,
    roads,
    trailerCategories,
    vehicleCategories,
    counties,
    citiesParishes,
    handleCountyChange,
    companyCitiesParishes,
    handleCompanyCountyChange,
    handleOrgChange,
    handleStructuralUnitChange,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    handleCompanySearch,
    handleVehicleSearch,
    trailerSearchError,
    setTrailerSearchError,
    handleTrailerSearch,
    mtrSearchError,
    setMtrSearchError,
    handleMtrSearch,
  } = useCompoundForm(undefined, handleSaved);

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  const gridClass = styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'];

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
        <div className="card-main">
          <Heading element="h1">
            {t('forms.compound_form')}
          </Heading>
        </div>

        <Tabs defaultValue="tab-1">
          <Tabs.List aria-label={t('forms.compound_form')}>
            <Tabs.Trigger id="tab-1">{t('forms.compound.generalPart')}</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content id="tab-1" className="p-1">
        <div>

          {/* Plokk: Kontrolli koht */}
          <Row className="m-0">
            <Col className="p-0">
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
                          formik.setFieldValue('road_other', '');
                          formik.setFieldValue('kilometer', '');
                          formik.setFieldValue('road_type', ROAD.NATIONAL);
                        }
                      }}
                      {...(formik.touched.address && formik.errors.address
                          ? {
                            helper: {
                              text: formik.errors.address,
                              type: 'error' as const,
                            },
                          }
                          : {})}
                    />
                    <Select
                      id="road"
                      label={t('forms.compound.road')}
                      options={(roads ?? []).map((r) => ({ value: r.code, label: r.name }))}
                      value={(roads ?? []).map((r) => ({ value: r.code, label: r.name })).find((o) => o.value === formik.values.road) ?? null}
                      onChange={(val) => {
                        const roadValue = val && !Array.isArray(val) ? (val as { value: string }).value : '';
                        formik.setFieldValue('road', roadValue);
                        if (roadValue === OTHER.ROAD) {
                          formik.setFieldValue('road_type', ROAD.LOCAL);
                        } else if (roadValue) {
                          formik.setFieldValue('road_type', ROAD.NATIONAL);
                        } else {
                          formik.setFieldValue('road_type', ROAD.NATIONAL);
                        }
                        if (roadValue) {
                          formik.setFieldValue('address', '');
                        }
                      }}
                      {...(formik.touched.road && formik.errors.road
                          ? {
                            helper: {
                              text: formik.errors.road,
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
                        input={{maxLength: 3 }}
                        required={!!formik.values.road}
                        {...(formik.touched.kilometer && formik.errors.kilometer
                          ? { helper: { text: formik.errors.kilometer, type: 'error' as const } }
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
                      <div></div>
                    )}
                    <div className={styles[isDesktop ? 'three-col-desktop' : 'three-col-mobile']}>
                      <Select
                          id="controlCountryCode"
                          label={t('forms.foreign_violation.control_country_code')}
                          options={countries}
                          value={countries.find((o) => o.value === formik.values.controlCountryCode) ?? null}
                          onChange={(val) =>
                              formik.setFieldValue(
                                  'controlCountryCode',
                                  val && !Array.isArray(val) ? (val as { value: string }).value : '',
                              )
                          }
                          required
                          {...(formik.touched.controlCountryCode && formik.errors.controlCountryCode
                              ? {
                                helper: {
                                  text: formik.errors.controlCountryCode,
                                  type: 'error' as const,
                                },
                              }
                              : {})}
                      />
                      <Select
                        id="county"
                        label={t('forms.foreign_violation.county')}
                        options={(counties ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                        value={(counties ?? []).map((c) => ({ value: String(c.id), label: c.name })).find((o) => o.value === formik.values.county) ?? null}
                        onChange={(val) => {
                          const v = val && !Array.isArray(val) ? (val as { value: string }).value : '';
                          formik.setFieldValue('county', v);
                          formik.setFieldValue('city', '');
                          handleCountyChange(v ? Number(v) : undefined);
                        }}
                        required
                        {...(formik.touched.county && formik.errors.county
                            ? {
                              helper: {
                                text: formik.errors.county,
                                type: 'error' as const,
                              },
                            }
                            : {})}
                      />
                      <Select
                        id="city"
                        label={t('forms.foreign_violation.city')}
                        options={(citiesParishes ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                        value={(citiesParishes ?? []).map((c) => ({ value: String(c.id), label: c.name })).find((o) => o.value === formik.values.city) ?? null}
                        onChange={(val) => {
                          const v = val && !Array.isArray(val) ? (val as { value: string }).value : '';
                          formik.setFieldValue('city', v);
                        }}
                        disabled={!formik.values.county}
                      />
                    </div>
                    <Text
                      id="road_type"
                    >
                        Tee liik: {formik.values.road_type}
                    </Text>
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>

          {/* Plokk: Kontrolli aeg */}
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.compound.controlTimeBasicInfo')}
                  </Heading>
                  <div
                    className={gridClass}
                    style={{ alignItems: 'start' }}
                  >
                    <div className={styles[isDesktop ? 'date-row-desktop' : 'date-row-mobile']}>
                      <DatePicker
                        id="controlDate"
                        label={t('forms.compound.controlDate')}
                        disableFuture
                        value={formik.values.controlDate ? dayjs(formik.values.controlDate) : null}
                        onChange={(v) => formik.setFieldValue('controlDate', v)}
                        placeholder={t('common.datePickerPlaceholder')}
                        required
                        {...(formik.touched.controlDate && formik.errors.controlDate
                          ? { helper: { text: formik.errors.controlDate, type: 'error' as const } }
                          : {})}
                      />
                      <TimePicker
                        id="controlTime"
                        label={t('forms.compound.controlTime')}
                        value={formik.values.controlTime ? dayjs(formik.values.controlTime) : null}
                        onChange={(v) => formik.setFieldValue('controlTime', v)}
                        placeholder={t('common.timePickerPlaceholder')}
                        required
                        {...(formik.touched.controlTime && formik.errors.controlTime
                            ? { helper: { text: formik.errors.controlTime, type: 'error' as const } }
                            : {})}
                      />
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>

          {/* Plokk: Mootorsõiduk */}
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.compound.vehicleBasicInfo')}
                  </Heading>
                  {vehicleSearchError && (
                    <div className="mb-1">
                      <Alert type="danger" size="small" onClose={() => setVehicleSearchError(false)}>
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
                          onChange={(v) => formik.setFieldValue('vehicleRegNr', v.toUpperCase())}
                          required
                          {...(formik.touched.vehicleRegNr && formik.errors.vehicleRegNr
                              ? {
                                helper: {
                                  text: formik.errors.vehicleRegNr,
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
                    <div></div>
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
                      value={countries.find((o) => o.value === formik.values.vehicleCountryCode) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'vehicleCountryCode',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
                        )
                      }
                      required
                      {...(formik.touched.vehicleCountryCode && formik.errors.vehicleCountryCode
                          ? {
                            helper: {
                              text: formik.errors.vehicleCountryCode,
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
                    <div className={styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']}>
                      <DatePicker
                        id="vehicleFirstRegistration"
                        label={t('forms.compound.vehicleFirstRegistration')}
                        value={formik.values.vehicleFirstRegistration ? dayjs(formik.values.vehicleFirstRegistration) : null}
                        onChange={(v) => formik.setFieldValue('vehicleFirstRegistration', v)}
                        placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                      />
                    </div>
                    <Select
                      id="vehicleCategoryCode"
                      label={t('forms.compound.vehicleCategory')}
                      options={(vehicleCategories ?? []).map((c) => ({ value: c.code, label: c.name }))}
                      value={(vehicleCategories ?? []).map((c) => ({ value: c.code, label: c.name })).find((o) => o.value === formik.values.vehicleCategoryCode) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'vehicleCategoryCode',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
                        )
                      }
                      required
                      {...(formik.touched.vehicleCategoryCode && formik.errors.vehicleCategoryCode
                          ? {
                            helper: {
                              text: formik.errors.vehicleCategoryCode,
                              type: 'error' as const,
                            },
                          }
                          : {})}
                    />
                    {formik.values.vehicleCategoryCode === OTHER.VEHICLE_CATEGORY ? (
                        <TextField
                            id="vehicleCategoryOther"
                            label={t('forms.compound.vehicleCategoryOther')}
                            value={formik.values.vehicleCategoryOther}
                            input={{ maxLength: 100 }}
                            onChange={(v) => formik.setFieldValue('vehicleCategoryOther', v)}
                            required
                            {...(formik.touched.vehicleCategoryOther && formik.errors.vehicleCategoryOther
                                ? {
                                  helper: {
                                    text: formik.errors.vehicleCategoryOther,
                                    type: 'error' as const,
                                  },
                                }
                                : {})}
                        />
                    ) : (
                        <div></div>
                    )}
                    <TextField
                        id="vehicleMileage"
                        label={t('forms.compound.vehicleMileage')}
                        value={formik.values.vehicleMileage}
                        onChange={(v) => {
                          const numericValue = v.replace(/\D/g, '');
                          const parsedValue = parseInt(numericValue, 10) || 0;
                          formik.setFieldValue('vehicleMileage', String(parsedValue));
                        }}
                        input={{maxLength: 8 }}
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>

          {/* Plokk: Andmed teekasutustasu nõude rikkumise kohta */}
          <Row className="m-0">
            <Col className="p-0">
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
                      onChange={(val) => formik.setFieldValue('roadTaxStatus', val)}
                      items={[
                        { id: 'road_tax_status_1', value: 'Ei kohaldu', label: t('forms.compound.roadTaxStatusNotApplicable') },
                        { id: 'road_tax_status_2', value: 'Tasumata', label: t('forms.compound.roadTaxStatusUnpaid') },
                        { id: 'road_tax_status_3', value: 'Tasutud väiksemas määras', label: t('forms.compound.roadTaxStatusUnderpaid') },
                      ]}
                    />
                    <div></div>
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
            </Col>
          </Row>

          {/* Plokk: Haagis */}
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.compound.trailer')}
                  </Heading>
                    <Button onClick={() => formik.values.trailers.length < 3 && formik.setFieldValue('trailers', [...formik.values.trailers, emptyTrailer()])} disabled={formik.values.trailers.length >= 3}>
                      {t('forms.compound.addTrailer')}
                    </Button>
                  {formik.values.trailers.map((trailer: Trailer, index: number) => (
                      <Row className="m-0" key={index}>
                        <Col className="p-0 mt-1">
                          <Card className="mb-1">
                            <Card.Content>
                              {trailerSearchError === index && (
                                <div className="mb-1">
                                  <Alert type="danger" size="small" onClose={() => setTrailerSearchError(null)}>
                                    {t('common.noResults')}
                                  </Alert>
                                </div>
                              )}
                              <div className={gridClass} style={{ alignItems: 'start' }}>
                                <div className={styles['select-row']}>
                                  <div className={styles['select-wrapper']}>
                                    <TextField
                                        id={`trailerRegNr_${index}`}
                                        label={t('forms.compound.trailerRegNr')}
                                        value={trailer.regNr}
                                        input={{ maxLength: 20 }}
                                        onChange={(v) => {
                                          const updated = [...formik.values.trailers];
                                          updated[index] = { ...updated[index], regNr: v.toUpperCase() };
                                          formik.setFieldValue('trailers', updated);
                                        }}
                                        required
                                        {...((formik.touched.trailers as any)?.[index]?.regNr && (formik.errors.trailers as any)?.[index]?.regNr
                                            ? {
                                              helper: {
                                                text: (formik.errors.trailers as any)[index].regNr,
                                                type: 'error' as const,
                                              },
                                            }
                                            : {})}
                                    />
                                  </div>
                                  <Button type="button" onClick={() => handleTrailerSearch(index)}>
                                    {t('common.search')}
                                  </Button>
                                </div>
                                <div></div>
                                <TextField
                                    id={`trailerMake_${index}`}
                                    label={t('forms.compound.trailerMake')}
                                    value={trailer.make}
                                    input={{ maxLength: 100 }}
                                    onChange={(v) => { const u = [...formik.values.trailers]; u[index] = { ...u[index], make: v }; formik.setFieldValue('trailers', u); }}
                                />
                                <TextField
                                    id={`trailerModel_${index}`}
                                    label={t('forms.compound.trailerModel')}
                                    value={trailer.model}
                                    input={{ maxLength: 100 }}
                                    onChange={(v) => { const u = [...formik.values.trailers]; u[index] = { ...u[index], model: v }; formik.setFieldValue('trailers', u); }}
                                />
                                <TextField
                                    id={`trailerVin_${index}`}
                                    label={t('forms.compound.trailerVin')}
                                    value={trailer.vin}
                                    input={{ maxLength: 17 }}
                                    onChange={(v) => { const u = [...formik.values.trailers]; u[index] = { ...u[index], vin: v }; formik.setFieldValue('trailers', u); }}
                                />
                                <Select
                                    id={`trailerCountryCode_${index}`}
                                    label={t('forms.compound.trailerCountry')}
                                    options={countries}
                                    value={countries.find((o) => o.value === trailer.countryCode) ?? null}
                                    onChange={(val) => { const u = [...formik.values.trailers]; u[index] = { ...u[index], countryCode: val && !Array.isArray(val) ? (val as { value: string }).value : '' }; formik.setFieldValue('trailers', u); }}
                                    required
                                    {...((formik.touched.trailers as any)?.[index]?.countryCode && (formik.errors.trailers as any)?.[index]?.countryCode
                                        ? { helper: { text: (formik.errors.trailers as any)[index].countryCode, type: 'error' as const } }
                                        : {})}
                                />
                                <TextField
                                    id={`trailerBodyType_${index}`}
                                    label={t('forms.compound.trailerBodyType')}
                                    value={trailer.bodyType}
                                    input={{ maxLength: 50 }}
                                    onChange={(v) => { const u = [...formik.values.trailers]; u[index] = { ...u[index], bodyType: v }; formik.setFieldValue('trailers', u); }}
                                />
                                <div className={styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']}>
                                  <DatePicker
                                      id={`trailerFirstRegistration_${index}`}
                                      label={t('forms.compound.trailerFirstRegistration')}
                                      value={trailer.firstRegistration ? dayjs(trailer.firstRegistration) : null}
                                      onChange={(v) => { const u = [...formik.values.trailers]; u[index] = { ...u[index], firstRegistration: toIsoDate(v) }; formik.setFieldValue('trailers', u); }}
                                      placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                                  />
                                </div>
                                <Select
                                    id={`trailerCategoryCode_${index}`}
                                    label={t('forms.compound.trailerCategory')}
                                    options={(trailerCategories ?? []).map((c) => ({ value: c.code, label: c.name }))}
                                    value={(trailerCategories ?? []).map((c) => ({ value: c.code, label: c.name })).find((o) => o.value === trailer.categoryCode) ?? null}
                                    onChange={(val) => { const u = [...formik.values.trailers]; u[index] = { ...u[index], categoryCode: val && !Array.isArray(val) ? (val as { value: string }).value : '' }; formik.setFieldValue('trailers', u); }}
                                    required
                                    {...((formik.touched.trailers as any)?.[index]?.categoryCode && (formik.errors.trailers as any)?.[index]?.categoryCode
                                        ? { helper: { text: (formik.errors.trailers as any)[index].categoryCode, type: 'error' as const } }
                                        : {})}
                                />
                                {trailer.categoryCode === OTHER.TRAILER_CATEGORY ? (
                                    <TextField
                                        id={`trailerCategoryOther_${index}`}
                                        label={t('forms.compound.trailerCategoryOther')}
                                        value={trailer.categoryOther}
                                        input={{ maxLength: 100 }}
                                        onChange={(v) => { const u = [...formik.values.trailers]; u[index] = { ...u[index], categoryOther: v }; formik.setFieldValue('trailers', u); }}
                                        required
                                        {...((formik.touched.trailers as any)?.[index]?.categoryOther && (formik.errors.trailers as any)?.[index]?.categoryOther
                                            ? { helper: { text: (formik.errors.trailers as any)[index].categoryOther, type: 'error' as const } }
                                            : {})}
                                    />
                                ) : (
                                    <div></div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }} className={styles['full-span']}>
                                  <Button type="button" visualType="secondary" onClick={() => formik.setFieldValue('trailers', formik.values.trailers.filter((_: Trailer, i: number) => i !== index))}>
                                    {t('forms.compound.removeTrailer')}
                                  </Button>
                                </div>
                              </div>
                            </Card.Content>
                          </Card>
                        </Col>
                      </Row>
                  ))}
                </Card.Content>
              </Card>
            </Col>
          </Row>

          {/* Plokk: Vedu teostav ettevõte või sõiduki omanik */}
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3">
                    {t('forms.compound.company')}
                  </Heading>
                  <p className="mb-1">{t('forms.compound.companySubtitle')}</p>
                  <Card className="mb-1">
                    <Card.Content>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="mb-1">
                        <Heading element="h4">
                          {t('forms.compound.companyBusinessRegistrySearch')}
                        </Heading>
                        <Tooltip>
                          <Tooltip.Trigger>
                            <InfoButton />
                          </Tooltip.Trigger>
                          <Tooltip.Content>{t('forms.compound.companyBusinessRegistryTooltip')}</Tooltip.Content>
                        </Tooltip>
                      </div>
                      {companySearchError && (
                        <div className="mb-1">
                          <Alert type="danger" size="small" onClose={() => setCompanySearchError(false)}>
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
                          onChange={(v) => formik.setFieldValue('companyRegCode', v)}
                          required
                          {...(formik.touched.companyRegCode && formik.errors.companyRegCode
                              ? {
                                helper: {
                                  text: formik.errors.companyRegCode,
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
                          required
                          {...(formik.touched.companyName && formik.errors.companyName
                              ? {
                                helper: {
                                  text: formik.errors.companyName,
                                  type: 'error' as const,
                                },
                              }
                              : {})}
                        />
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                          <Button type="button" onClick={handleCompanySearch}>
                            {t('forms.compound.companySearchButton')}
                          </Button>
                        </div>
                        <Select
                          id="companyCountryCode"
                          label={t('forms.compound.companyCountryCode')}
                          options={countries}
                          value={countries.find((o) => o.value === formik.values.companyCountryCode) ?? null}
                          onChange={(val) =>
                            formik.setFieldValue(
                              'companyCountryCode',
                              val && !Array.isArray(val) ? (val as { value: string }).value : '',
                            )
                          }
                          required
                          {...(formik.touched.companyCountryCode && formik.errors.companyCountryCode
                              ? {
                                helper: {
                                  text: formik.errors.companyCountryCode,
                                  type: 'error' as const,
                                },
                              }
                              : {})}
                        />
                        <Select
                          id="companyCounty"
                          label={t('forms.compound.companyCounty')}
                          options={(counties ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                          value={(counties ?? []).map((c) => ({ value: String(c.id), label: c.name })).find((o) => o.value === formik.values.companyCounty) ?? null}
                          onChange={(val) => {
                            const v = val && !Array.isArray(val) ? (val as { value: string }).value : '';
                            formik.setFieldValue('companyCounty', v);
                            formik.setFieldValue('companyCity', '');
                            handleCompanyCountyChange(v ? Number(v) : undefined);
                          }}
                        />
                        <Select
                          id="companyCity"
                          label={t('forms.compound.companyCity')}
                          options={(companyCitiesParishes ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                          value={(companyCitiesParishes ?? []).map((c) => ({ value: String(c.id), label: c.name })).find((o) => o.value === formik.values.companyCity) ?? null}
                          onChange={(val) => {
                            const v = val && !Array.isArray(val) ? (val as { value: string }).value : '';
                            formik.setFieldValue('companyCity', v);
                          }}
                          disabled={!formik.values.companyCounty}
                        />
                        <TextField
                          id="companyAddressLine1"
                          label={t('forms.compound.companyAddressLine1')}
                          value={formik.values.companyAddressLine1}
                          input={{ maxLength: 300 }}
                          onChange={(v) => formik.setFieldValue('companyAddressLine1', v)}
                        />
                        <TextField
                          id="companyPostalCode"
                          label={t('forms.compound.companyPostalCode')}
                          value={formik.values.companyPostalCode}
                          input={{ maxLength: 20 }}
                          onChange={(v) => formik.setFieldValue('companyPostalCode', v)}
                        />
                        <div></div>
                        <TextField
                          id="companyOwnerFirstName"
                          label={t('forms.compound.companyOwnerFirstName')}
                          value={formik.values.companyOwnerFirstName}
                          input={{ maxLength: 100 }}
                          onChange={(v) => formik.setFieldValue('companyOwnerFirstName', v)}
                        />
                        <TextField
                          id="companyOwnerLastName"
                          label={t('forms.compound.companyOwnerLastName')}
                          value={formik.values.companyOwnerLastName}
                          input={{ maxLength: 100 }}
                          onChange={(v) => formik.setFieldValue('companyOwnerLastName', v)}
                        />
                      </div>
                    </Card.Content>
                  </Card>

                  <Card className="mt-1">
                    <Card.Content>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="mb-1">
                        <Heading element="h4">
                          {t('forms.compound.mtrSearch')}
                        </Heading>
                        <Tooltip>
                          <Tooltip.Trigger>
                            <InfoButton />
                          </Tooltip.Trigger>
                          <Tooltip.Content>{t('forms.compound.mtrTooltip')}</Tooltip.Content>
                        </Tooltip>
                      </div>
                      {mtrSearchError && (
                        <div className="mb-1">
                          <Alert type="danger" size="small" onClose={() => setMtrSearchError(false)}>
                            {t('common.noResults')}
                          </Alert>
                        </div>
                      )}
                      <p className="mb-1">
                        {t('forms.compound.companyRegCode')}: <strong>{formik.values.companyRegCode || '—'}</strong>
                        {'  '}
                        {t('forms.compound.vehicleRegNr')}: <strong>{formik.values.vehicleRegNr || '—'}</strong>
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', width: isDesktop ? '80%' : '100%' }}>
                        <div style={{ flex: 1 }}>
                          <TextField
                            id="companyActivityLicenceCopyNumber"
                            label={t('forms.compound.companyActivityLicenceCopyNumber')}
                            value={formik.values.companyActivityLicenceCopyNumber}
                            input={{ maxLength: 100 }}
                            onChange={(v) => formik.setFieldValue('companyActivityLicenceCopyNumber', v)}
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
            </Col>
          </Row>

          {/* Plokk: Sõidukijuhi andmed */}
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.compound.driver')}
                  </Heading>
                  <div className={gridClass} style={{ alignItems: 'start' }}>
                    <TextField
                      id="driverFirstName"
                      label={t('forms.compound.driverFirstName')}
                      value={formik.values.drivers[0]?.firstName ?? ''}
                      input={{ maxLength: 100 }}
                      onChange={(v) => { const u = [...formik.values.drivers]; u[0] = { ...u[0], firstName: v }; formik.setFieldValue('drivers', u); }}
                      required
                      {...((formik.touched.drivers as any)?.[0]?.firstName && (formik.errors.drivers as any)?.[0]?.firstName
                          ? { helper: { text: (formik.errors.drivers as any)[0].firstName, type: 'error' as const } }
                          : {})}
                    />
                    <TextField
                      id="driverLastName"
                      label={t('forms.compound.driverLastName')}
                      value={formik.values.drivers[0]?.lastName ?? ''}
                      input={{ maxLength: 100 }}
                      onChange={(v) => { const u = [...formik.values.drivers]; u[0] = { ...u[0], lastName: v }; formik.setFieldValue('drivers', u); }}
                      required
                      {...((formik.touched.drivers as any)?.[0]?.lastName && (formik.errors.drivers as any)?.[0]?.lastName
                          ? { helper: { text: (formik.errors.drivers as any)[0].lastName, type: 'error' as const } }
                          : {})}
                    />
                    <TextField
                      id="driverPersonalCodeForeign"
                      label={t('forms.compound.driverPersonalCodeForeign')}
                      value={formik.values.drivers[0]?.personalCodeForeign ?? ''}
                      input={{ maxLength: 50 }}
                      onChange={(v) => { const u = [...formik.values.drivers]; u[0] = { ...u[0], personalCodeForeign: v }; formik.setFieldValue('drivers', u); }}
                      required
                      {...((formik.touched.drivers as any)?.[0]?.personalCodeForeign && (formik.errors.drivers as any)?.[0]?.personalCodeForeign
                          ? { helper: { text: (formik.errors.drivers as any)[0].personalCodeForeign, type: 'error' as const } }
                          : {})}
                    />
                    <TextField
                      id="driverPersonalCodeEe"
                      label={t('forms.compound.driverPersonalCodeEe')}
                      value={formik.values.drivers[0]?.personalCodeEe ?? ''}
                      input={{ maxLength: 11 }}
                      onChange={(v) => { const u = [...formik.values.drivers]; u[0] = { ...u[0], personalCodeEe: v }; formik.setFieldValue('drivers', u); }}
                    />
                    <Select
                      id="driverCitizenshipCode"
                      label={t('forms.compound.driverCitizenshipCode')}
                      options={countries}
                      value={countries.find((o) => o.value === formik.values.drivers[0]?.citizenshipCode) ?? null}
                      onChange={(val) => { const u = [...formik.values.drivers]; u[0] = { ...u[0], citizenshipCode: val && !Array.isArray(val) ? (val as { value: string }).value : '' }; formik.setFieldValue('drivers', u); }}
                    />
                    <div className={styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']}>
                      <DatePicker
                        id="driverBirthDate"
                        label={t('forms.compound.driverBirthDate')}
                        value={formik.values.drivers[0]?.birthDate ? dayjs(formik.values.drivers[0].birthDate) : null}
                        onChange={(v) => { const u = [...formik.values.drivers]; u[0] = { ...u[0], birthDate: toIsoDate(v) }; formik.setFieldValue('drivers', u); }}
                        placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                        required
                        {...((formik.touched.drivers as any)?.[0]?.birthDate && (formik.errors.drivers as any)?.[0]?.birthDate
                            ? { helper: { text: (formik.errors.drivers as any)[0].birthDate, type: 'error' as const } }
                            : {})}
                      />
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>

          {/* Plokk: Teise juhi / meeskonna liikme andmed */}
          {false && (
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.compound.driver2')}
                  </Heading>
                    <div className={gridClass} style={{ alignItems: 'start' }}>
                      <TextField
                        id="driver2FirstName"
                        label={t('forms.compound.driverFirstName')}
                        value={formik.values.drivers[1]?.firstName ?? ''}
                        input={{ maxLength: 100 }}
                        onChange={(v) => { const u = [...formik.values.drivers]; u[1] = { ...emptyDriver(), ...u[1], firstName: v }; formik.setFieldValue('drivers', u); }}
                      />
                      <TextField
                        id="driver2LastName"
                        label={t('forms.compound.driverLastName')}
                        value={formik.values.drivers[1]?.lastName ?? ''}
                        input={{ maxLength: 100 }}
                        onChange={(v) => { const u = [...formik.values.drivers]; u[1] = { ...emptyDriver(), ...u[1], lastName: v }; formik.setFieldValue('drivers', u); }}
                      />
                      <TextField
                        id="driver2PersonalCodeForeign"
                        label={t('forms.compound.driverPersonalCodeForeign')}
                        value={formik.values.drivers[1]?.personalCodeForeign ?? ''}
                        input={{ maxLength: 50 }}
                        onChange={(v) => { const u = [...formik.values.drivers]; u[1] = { ...emptyDriver(), ...u[1], personalCodeForeign: v }; formik.setFieldValue('drivers', u); }}
                      />
                      <TextField
                        id="driver2PersonalCodeEe"
                        label={t('forms.compound.driverPersonalCodeEe')}
                        value={formik.values.drivers[1]?.personalCodeEe ?? ''}
                        input={{ maxLength: 11 }}
                        onChange={(v) => { const u = [...formik.values.drivers]; u[1] = { ...emptyDriver(), ...u[1], personalCodeEe: v }; formik.setFieldValue('drivers', u); }}
                      />
                      <Select
                        id="driver2CitizenshipCode"
                        label={t('forms.compound.driverCitizenshipCode')}
                        options={countries}
                        value={countries.find((o) => o.value === formik.values.drivers[1]?.citizenshipCode) ?? null}
                        onChange={(val) => { const u = [...formik.values.drivers]; u[1] = { ...emptyDriver(), ...u[1], citizenshipCode: val && !Array.isArray(val) ? (val as { value: string }).value : '' }; formik.setFieldValue('drivers', u); }}
                      />
                      <div className={styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']}>
                        <DatePicker
                          id="driver2BirthDate"
                          label={t('forms.compound.driverBirthDate')}
                          value={formik.values.drivers[1]?.birthDate ? dayjs(formik.values.drivers[1].birthDate) : null}
                          onChange={(v) => { const u = [...formik.values.drivers]; u[1] = { ...emptyDriver(), ...u[1], birthDate: toIsoDate(v) }; formik.setFieldValue('drivers', u); }}
                          placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                          required
                          {...((formik.touched.drivers as any)?.[1]?.birthDate && (formik.errors.drivers as any)?.[1]?.birthDate
                              ? { helper: { text: (formik.errors.drivers as any)[1].birthDate, type: 'error' as const } }
                              : {})}
                        />
                      </div>
                    </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          )}

          {/* Plokk: Sõidukit kontrollinud ametiisiku andmed */}
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.compound.inspector')}
                  </Heading>
                  <div className={styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']}>
                    <TextField
                        id="inspectorFirstName"
                        label={t('forms.compound.inspectorFirstName')}
                        value={formik.values.inspectorFirstName}
                        input={{ maxLength: 100 }}
                        required
                        onChange={(v) => formik.setFieldValue('inspectorFirstName', v)}
                        {...(formik.touched.inspectorFirstName && formik.errors.inspectorFirstName
                            ? {
                              helper: {
                                text: formik.errors.inspectorFirstName,
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
                        onChange={(v) => formik.setFieldValue('inspectorLastName', v)}
                        {...(formik.touched.inspectorLastName && formik.errors.inspectorLastName
                            ? {
                              helper: {
                                text: formik.errors.inspectorLastName,
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
                                (o) => o.value === String(formik.values.inspectorOrganisationId),
                            ) ?? null
                        }
                        onChange={handleOrgChange}
                        required
                        {...(formik.touched.inspectorOrganisationId && formik.errors.inspectorOrganisationId
                            ? {
                              helper: {
                                text: formik.errors.inspectorOrganisationId,
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
                            structureUnits.map((opt) => ({
                              label: opt.name,
                              value: opt.code,
                            })).find(
                                (o) => o.value === formik.values.inspectorUnit,
                            ) ?? null
                        }
                        onChange={handleStructuralUnitChange}
                    />
                    <TextField
                      id="inspectorProfession"
                      label={t('forms.compound.inspectorProfession')}
                      value={formik.values.inspectorProfession}
                      input={{ maxLength: 150 }}
                      onChange={(v) => formik.setFieldValue('inspectorProfession', v)}
                      required
                      {...(formik.touched.inspectorProfession && formik.errors.inspectorProfession
                          ? {
                            helper: {
                              text: formik.errors.inspectorProfession,
                              type: 'error' as const,
                            },
                          }
                          : {})}
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
        </div>
          </Tabs.Content>
        </Tabs>

        <div className="page-actions mt-1">
          <div className="page-actions-buttons">
            <Button visualType="secondary" onClick={() => navigate('/')}>
              {t('common.back')}
            </Button>
            <Button type="submit">
              {t('common.save')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
