import { useState, useRef, useEffect } from 'react';
import { useContainerWidth } from '../../../../hooks/useContainerWidth';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OTHER, ROAD } from '../../../../constants/constants';

import {
  Button,
  ClosingButton,
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
  Tabs,
  Dropdown,
  DateField,
  TimeField,
  StatusIndicator,
} from '@tedi-design-system/react/tedi';
import { useCompoundForm, emptyTrailer } from './useCompoundForm';
import type {
  Trailer,
  DriveRestForm,
  Driver,
  TechnicalCheckForm,
  AdrForm,
} from '../../types';

type TrailerTouched = (Partial<Record<keyof Trailer, boolean>> | undefined)[];
type TrailerErrors = (Partial<Record<keyof Trailer, string>> | undefined)[];
type DriverErrors = (Partial<Record<keyof Driver, string>> | undefined)[];
type DriverTouched = (Partial<Record<keyof Driver, boolean>> | undefined)[];
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, COUNTRIES } from '../../../../constants/constants';
import { toIsoDate, birthDateFromEstonianCode } from '../../../../hooks/dateUtils';
import styles from './CompoundFormPage.module.css';
import { DriveRestFormCreatePage } from '../drive-rest-form/DriveRestFormCreatePage';
import { TechnicalCheckFormCreatePage, type TechnicalCheckFormCreatePageRef } from '../technical-check-form/TechnicalCheckFormCreatePage';
import { AdrFormCreatePage, type AdrFormCreatePageRef } from '../adr-form/AdrFormCreatePage';
import { TransportInterruptionFormCreatePage, type TransportInterruptionFormCreatePageRef } from '../transport-interruption-form/TransportInterruptionFormCreatePage';
import type { TechnicalCheckVariant } from '../../types';
import { createDriveRestValidationSchema, serializeDriveRestFormValues } from '../drive-rest-form/useDriveRestForm';
import { createTechnicalCheckValidationSchema } from '../technical-check-form/useTechnicalCheckForm';
import { createAdrValidationSchema } from '../adr-form/useAdrForm';
import { saveDriveRestForm, saveTechnicalCheckForm, saveAdrForm, saveTransportInterruptionForm } from '../../api';
import type { TransportInterruptionForm } from '../../types';

type AnySubFormData = Partial<DriveRestForm> | Partial<TechnicalCheckForm> | Partial<AdrForm> | Partial<TransportInterruptionForm>;

interface FormRef {
  handleSubmit?: (overrideCompoundFormKey?: number) => void;
  getFormData?: () => AnySubFormData;
  setFormData?: (data: AnySubFormData) => void;
  hasErrors?: () => boolean;
  validateForm?: () => void;
}

const DRIVE_REST_ROUTES = ['/sp-driver', '/sp-teammate'] as const;
const ADR_ROUTES = ['/adr'] as const;
const TRANSPORT_INTERRUPTION_ROUTES = ['/transport-interruption'] as const;

const ROUTE_TO_TAB: Record<
  string,
  { tabId: string; type: string; labelKey: string }
> = {
  '/sp-driver': {
    tabId: 'tab-sp-driver',
    type: 'driver',
    labelKey: 'forms.driver_drive_rest_form',
  },
  '/sp-teammate': {
    tabId: 'tab-sp-teammate',
    type: 'teammate',
    labelKey: 'forms.teammate_drive_rest_form',
  },
  '/vehicle-technical': {
    tabId: 'tab-vehicle-technical',
    type: 'vehicle',
    labelKey: 'forms.technical_check.vehicleTitle',
  },
  '/trailer-technical': {
    tabId: 'tab-trailer-technical',
    type: 'trailer',
    labelKey: 'forms.technical_check.trailerTitle',
  },
  '/adr': {
    tabId: 'tab-adr',
    type: 'adr',
    labelKey: 'forms.adr.title',
  },
  '/transport-interruption': {
    tabId: 'tab-transport-interruption',
    type: 'transport-interruption',
    labelKey: 'forms.transport_interruption.title',
  },
};

export function CompoundFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');

  const initialTabRoute = type
    ? (ROUTE_TO_TAB[`/sp-${type}`] ? `/sp-${type}` : ROUTE_TO_TAB[`/${type}`] ? `/${type}` : null)
    : null;
  const initialTab = initialTabRoute ? ROUTE_TO_TAB[initialTabRoute].tabId : null;

  const [activeTab, setActiveTab] = useState(initialTab ?? 'tab-1');
  const [openTabs, setOpenTabs] = useState<string[]>(
    initialTab ? [initialTab] : [],
  );
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(new Set());
  const [trailerTabIndices, setTrailerTabIndices] = useState<Set<number>>(new Set());

  const removeTab = (tabId: string) => {
    setOpenTabs((prev) => prev.filter((t) => t !== tabId));
    delete savedFormData.current[tabId];
    setTabErrors((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setValidatedTabs((prev) => {
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
    if (tabId.startsWith('tab-trailer-technical-')) {
      const idx = Number(tabId.replace('tab-trailer-technical-', ''));
      setTrailerTabIndices((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
    setActiveTab('tab-1');
  };

  const addTrailerControlForm = (index: number, regNr: string) => {
    const tabId = `tab-trailer-technical-${index}`;
    if (!formRefs.current[tabId]) {
      formRefs.current[tabId] = { current: null };
    }
    savedFormData.current[tabId] = {
      ...savedFormData.current[tabId],
      trailerRegNr: regNr,
    } as Partial<TechnicalCheckForm>;
    setTrailerTabIndices((prev) => new Set([...prev, index]));
    if (!openTabs.includes(tabId)) {
      setOpenTabs((prev) => [...prev, tabId]);
      setTabErrors((prev) => ({ ...prev, [tabId]: false }));
    }
    handleTabChange(tabId);
    window.scrollTo(0, 0);
  };

  const editTrailerControlForm = (index: number) => {
    const tabId = `tab-trailer-technical-${index}`;
    if (!openTabs.includes(tabId)) return;
    handleTabChange(tabId);
    window.scrollTo(0, 0);
  };

  const addTab = (route: string) => {
    const tabDef = ROUTE_TO_TAB[route];
    if (!tabDef) return;
    if (!openTabs.includes(tabDef.tabId)) {
      setOpenTabs((prev) => [...prev, tabDef.tabId]);
      // A brand-new empty form should not show an error indicator
      // until the user actually tries to save
      setTabErrors((prev) => ({ ...prev, [tabDef.tabId]: false }));
    }
    handleTabChange(tabDef.tabId);
  };

  const { hasPermission } = useAuth();
  const forbidden = !hasPermission('foreign_violation_form.write');
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const containerWidth = useContainerWidth(isDesktop, openTabs);

  const formRefs = useRef<Record<string, React.MutableRefObject<FormRef | null>>>(
    Object.values(ROUTE_TO_TAB).reduce((acc, { tabId }) => {
      acc[tabId] = { current: null };
      return acc;
    }, {} as Record<string, React.MutableRefObject<FormRef | null>>)
  );
  const savedFormData = useRef<Record<string, AnySubFormData>>({});
  // Refs mirror the state below so the async save handler always reads the
  // latest value instead of a stale value captured in its closure
  const compoundFormIdRef = useRef<number | null>(null);
  const savedDriveRestFormsRef = useRef<Set<string>>(new Set());
  const savedSubFormIdsRef = useRef<Record<string, string>>({});

  const handleSaved = (id?: string) => {
    if (id) {
      compoundFormIdRef.current = Number(id);
    }
  };

  const validateAllForms = async (): Promise<boolean> => {
    // Validate compound form (tab-1) - mark all fields as touched to show errors
    const touched: Record<string, unknown> = {};
    Object.keys(formik.values).forEach(key => {
      const val = formik.values[key as keyof typeof formik.values];
      if (Array.isArray(val)) {
        touched[key] = val.map((item) =>
          item && typeof item === 'object'
            ? Object.fromEntries(Object.keys(item).map((k) => [k, true]))
            : true,
        );
      } else {
        touched[key] = true;
      }
    });
    formik.setTouched(touched as never);
    const compoundErrors = await formik.validateForm();

    // Validate all drive-rest forms against the shared schema using the
    // saved snapshot — this guarantees the same result regardless of
    // whether a tab is currently mounted (active) or not
    const driveRestSchema = createDriveRestValidationSchema(t);
    const technicalCheckSchema = createTechnicalCheckValidationSchema(t);
    const adrSchema = createAdrValidationSchema(t);
    const newTabErrors: Record<string, boolean> = {};
    for (const tabId of openTabs) {
      const isAdr = ADR_ROUTES.some(
        (route) => ROUTE_TO_TAB[route].tabId === tabId,
      );
      const isTransportInterruption = TRANSPORT_INTERRUPTION_ROUTES.some(
        (route) => ROUTE_TO_TAB[route].tabId === tabId,
      );
      const isTechnicalCheck = !isAdr && !isTransportInterruption && (
        ROUTE_TO_TAB['/vehicle-technical'].tabId === tabId ||
        tabId.startsWith('tab-trailer-technical-')
      );
      const schema = isAdr ? adrSchema : isTransportInterruption ? null : isTechnicalCheck ? technicalCheckSchema : driveRestSchema;
      const formRef = formRefs.current[tabId]?.current;
      if (formRef?.hasErrors !== undefined) {
        newTabErrors[tabId] = formRef.hasErrors();
      } else {
        newTabErrors[tabId] = schema ? !(await schema.isValid(savedFormData.current[tabId] ?? {})) : false;
      }
    }
    setTabErrors(newTabErrors);

    // Trigger each open tab's own validation so inline field errors show up
    for (const tabId of openTabs) {
      formRefs.current[tabId]?.current?.validateForm?.();
    }

    // Mark the main form and all currently open sub-forms as validated
    setValidatedTabs((prev) => {
      const next = new Set(prev);
      next.add('tab-1');
      openTabs.forEach((tabId) => next.add(tabId));
      return next;
    });

    const compoundFormHasErrors = Object.keys(compoundErrors).length > 0;
    const anyTabHasErrors = Object.values(newTabErrors).some(hasError => hasError);

    return !compoundFormHasErrors && !anyTabHasErrors;
  };

  const hasTabErrors = (tabId: string) => {
    // Only show an error indicator for tabs that have been explicitly validated
    if (!validatedTabs.has(tabId)) {
      return false;
    }
    if (tabId === 'tab-1') {
      return Object.keys(formik.errors).length > 0;
    }
    // For drive-rest forms, use tabErrors state which is updated by validateAllForms
    return tabErrors[tabId] ?? false;
  };

  const handleTabChange = (newTab: string) => {
    if (activeTab !== 'tab-1' && formRefs.current[activeTab]?.current) {
      const data = formRefs.current[activeTab].current.getFormData?.();
      if (data !== undefined) {
        savedFormData.current[activeTab] = data;
      }
    }
    // Restore new tab form data immediately
    if (newTab !== 'tab-1' && savedFormData.current[newTab]) {
      setTimeout(() => {
        if (formRefs.current[newTab]?.current) {
          formRefs.current[newTab].current.setFormData?.(savedFormData.current[newTab]);
        }
      }, 0);
    }
    setActiveTab(newTab);
  };

  useEffect(() => {
    if (activeTab !== 'tab-1' && formRefs.current[activeTab]?.current && savedFormData.current[activeTab]) {
      formRefs.current[activeTab].current.setFormData?.(savedFormData.current[activeTab]);
    }
  }, [activeTab]);

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
    availableForms,
  } = useCompoundForm(undefined, handleSaved);

  const trailerTabDynamicLabels: Record<string, string> = {};
  formik.values.trailers.forEach((tr: Trailer, idx: number) => {
    trailerTabDynamicLabels[`tab-trailer-technical-${idx}`] = tr.regNr
      ? `${t('forms.technical_check.trailerTitle')} (${tr.regNr})`
      : t('forms.technical_check.trailerTitle');
  });

  const tabLabels: Record<string, string> = {
    'tab-1': t('forms.compound_form'),
    ...Object.values(ROUTE_TO_TAB)
      .filter(({ tabId }) => tabId !== 'tab-trailer-technical')
      .reduce(
        (acc, { tabId, labelKey }) => ({ ...acc, [tabId]: t(labelKey) }),
        {} as Record<string, string>,
      ),
    ...trailerTabDynamicLabels,
  };

  const headingLabel = tabLabels[activeTab] ?? t('forms.compound_form');

  // Update tab errors from refs (safe to access refs in useEffect)
  useEffect(() => {
    setTabErrors((prev) => {
      const newTabErrors: Record<string, boolean> = {};
      const allTabIds = [
        ...Object.values(ROUTE_TO_TAB)
          .filter(({ tabId }) => tabId !== 'tab-trailer-technical')
          .map(({ tabId }) => tabId),
        ...openTabs.filter((id) => id.startsWith('tab-trailer-technical-')),
      ];
      allTabIds.forEach((tabId) => {
        if (openTabs.includes(tabId)) {
          // Only update the error state for tabs that have already been
          // validated; otherwise keep the previous value (false for new tabs)
          if (validatedTabs.has(tabId)) {
            const formRef = formRefs.current[tabId]?.current;
            // Unmounted (inactive) tabs have no ref — keep their previous
            // error state instead of resetting it
            newTabErrors[tabId] = formRef?.hasErrors
              ? formRef.hasErrors()
              : (prev[tabId] ?? false);
          } else {
            newTabErrors[tabId] = prev[tabId] ?? false;
          }
        }
      });
      return newTabErrors;
    });
  }, [openTabs, formik.values, validatedTabs]);

  // Sync trailer reg-nr changes into the corresponding trailer technical tab
  useEffect(() => {
    formik.values.trailers.forEach((trailer: Trailer, index: number) => {
      const tabId = `tab-trailer-technical-${index}`;
      const ref = formRefs.current[tabId]?.current;
      if (ref?.setFormData && trailer.regNr) {
        ref.setFormData({ trailerRegNr: trailer.regNr });
      }
    });
  }, [formik.values.trailers]);

  // Trigger validation for compound form on mount and value changes
  useEffect(() => {
    formik.validateForm();
  }, [formik.values]);

  const addableForms = (availableForms ?? []).filter(
    (form) =>
      !ROUTE_TO_TAB[form.route] ||
      !openTabs.includes(ROUTE_TO_TAB[form.route].tabId),
  );

  const addFormDropdown =
    availableForms && availableForms.length > 0 ? (
      <Dropdown width="max-content">
        <Dropdown.Trigger>
          <Button
            iconRight="keyboard_arrow_down"
            visualType="secondary"
            disabled={addableForms.length === 0}
          >
            {t('desktop.addForm')}
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          {addableForms.map((form, index) => (
            <Dropdown.Item
              key={form.route}
              index={index}
              onClick={() => addTab(form.route)}
            >
              {t(form.labelKey)}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown>
    ) : null;

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  const gridClass =
    styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'];

  return (
    <div
      style={{
        maxWidth: containerWidth,
      }}
    >
      <div className="card-main">
        <Heading element="h1">{headingLabel}</Heading>
        {!isDesktop && addFormDropdown}
      </div>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List aria-label={t('forms.compound_form')} overflowMode="scroll">
          <Tabs.Trigger id="tab-1">
            <span
              style={{
                position: 'relative',
              }}
            >
              {t('forms.compound.generalPart')}
              {hasTabErrors('tab-1') && (
                <StatusIndicator type="danger" position="top-right" />
              )}
            </span>
          </Tabs.Trigger>
          {openTabs.map((tabId) => (
            <Tabs.Trigger key={tabId} id={tabId}>
              <span
                style={{
                  position: 'relative',
                }}
              >
                {tabLabels[tabId]}
                {hasTabErrors(tabId) && (
                  <StatusIndicator type="danger" position="top-right" />
                )}
              </span>
              {openTabs.length > 1 && (
                <ClosingButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tabId);
                  }}
                />
              )}
            </Tabs.Trigger>
          ))}
          {isDesktop && addFormDropdown && (
            <div
              style={{
                marginLeft: 'auto',
                paddingLeft: '1rem',
                alignSelf: 'center',
                marginRight: '1rem',
              }}
            >
              {addFormDropdown}
            </div>
          )}
        </Tabs.List>
        <Tabs.Content id="tab-1" className="p-1">
          <div>
            <form onSubmit={formik.handleSubmit}>
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
                              formik.setFieldValue('road_type', ROAD.LOCAL);
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
                              ...roads.map((r) => ({
                                value: r.code,
                                label: r.name,
                              })),
                            ].find((o) => o.value === formik.values.road) ??
                            null
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
                            formik.setFieldValue(
                              'kilometer',
                              String(parsedValue),
                            );
                          }}
                          input={{ maxLength: 3 }}
                          required={!!formik.values.road}
                          {...(formik.touched.kilometer &&
                          formik.errors.kilometer
                            ? {
                                helper: {
                                  text: formik.errors.kilometer,
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
                            onChange={(v) =>
                              formik.setFieldValue('roadOther', v)
                            }
                            required
                          />
                        ) : (
                          <div></div>
                        )}
                        <div
                          className={
                            styles[
                              isDesktop
                                ? 'three-col-desktop'
                                : 'three-col-mobile'
                            ]
                          }
                        >
                          <TextField
                            id="controlCountryCode"
                            label={t(
                              'forms.foreign_violation.control_country_code',
                            )}
                            value={t('countries.EE')}
                            disabled
                            onChange={() => undefined}
                          />
                          <Select
                            id="county"
                            label={t('forms.foreign_violation.county')}
                            options={(counties ?? []).map((c) => ({
                              value: String(c.id),
                              label: c.name,
                            }))}
                            value={
                              (counties ?? [])
                                .map((c) => ({
                                  value: String(c.id),
                                  label: c.name,
                                }))
                                .find(
                                  (o) => o.value === formik.values.county,
                                ) ?? null
                            }
                            onChange={(val) => {
                              const v =
                                val && !Array.isArray(val)
                                  ? (val as { value: string }).value
                                  : '';
                              formik.setFieldValue('county', v);
                              formik.setFieldValue('city', '');
                              handleCountyChange();
                            }}
                            required={formik.values.controlCountryCode === 'EE'}
                            disabled={formik.values.controlCountryCode !== 'EE'}
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
                            options={(citiesParishes ?? []).map((c) => ({
                              value: String(c.id),
                              label: c.name,
                            }))}
                            value={
                              (citiesParishes ?? [])
                                .map((c) => ({
                                  value: String(c.id),
                                  label: c.name,
                                }))
                                .find((o) => o.value === formik.values.city) ??
                              null
                            }
                            onChange={(val) => {
                              const v =
                                val && !Array.isArray(val)
                                  ? (val as { value: string }).value
                                  : '';
                              formik.setFieldValue('city', v);
                            }}
                            disabled={
                              !formik.values.county ||
                              formik.values.controlCountryCode !== 'EE'
                            }
                          />
                        </div>
                        <Text id="road_type">
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
                        <div
                          className={
                            styles[
                              isDesktop ? 'date-row-desktop' : 'date-row-mobile'
                            ]
                          }
                        >
                          <DateField
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
                              formik.touched.controlDate &&
                              formik.errors.controlDate
                                ? {
                                    helper: {
                                      text: formik.errors.controlDate,
                                      type: 'error' as const,
                                    },
                                  }
                                : undefined
                            }
                          />
                          <TimeField
                            id="controlTime"
                            label={t('forms.compound.controlTime')}
                            value={
                              formik.values.controlTime?.slice(0, 5) ??
                              undefined
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
                              formik.touched.controlTime &&
                              formik.errors.controlTime
                                ? {
                                    helper: {
                                      text: formik.errors.controlTime,
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
                          <Alert
                            type="danger"
                            size="small"
                            onClose={() => setVehicleSearchError(false)}
                          >
                            {t('common.noResults')}
                          </Alert>
                        </div>
                      )}
                      <div
                        className={gridClass}
                        style={{ alignItems: 'start' }}
                      >
                        <div className={styles['select-row']}>
                          <div className={styles['select-wrapper']}>
                            <TextField
                              id="vehicleRegNr"
                              label={t('forms.compound.vehicleRegNr')}
                              value={formik.values.vehicleRegNr}
                              input={{ maxLength: 20 }}
                              onChange={(v) =>
                                formik.setFieldValue(
                                  'vehicleRegNr',
                                  v.toUpperCase(),
                                )
                              }
                              required
                              {...(formik.touched.vehicleRegNr &&
                              formik.errors.vehicleRegNr
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
                          onChange={(v) =>
                            formik.setFieldValue('vehicleMake', v)
                          }
                        />
                        <TextField
                          id="vehicleModel"
                          label={t('forms.compound.vehicleModel')}
                          value={formik.values.vehicleModel}
                          input={{ maxLength: 100 }}
                          onChange={(v) =>
                            formik.setFieldValue('vehicleModel', v)
                          }
                        />
                        <TextField
                          id="vehicleVin"
                          label={t('forms.compound.vehicleVin')}
                          value={formik.values.vehicleVin}
                          input={{ maxLength: 17 }}
                          onChange={(v) =>
                            formik.setFieldValue('vehicleVin', v)
                          }
                        />
                        <Select
                          id="vehicleCountryCode"
                          label={t('forms.compound.vehicleCountry')}
                          options={countries}
                          value={
                            countries.find(
                              (o) =>
                                o.value === formik.values.vehicleCountryCode,
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
                          onChange={(v) =>
                            formik.setFieldValue('vehicleBodyType', v)
                          }
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
                            id="vehicleFirstRegistration"
                            label={t('forms.compound.vehicleFirstRegistration')}
                            monthYearSelectType="grid"
                            selected={
                              formik.values.vehicleFirstRegistration
                                ? new Date(
                                    formik.values.vehicleFirstRegistration,
                                  )
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
                          direction="row"
                          value={formik.values.vehicleCategoryCode}
                          onChange={(val) =>
                            formik.setFieldValue('vehicleCategoryCode', val)
                          }
                          items={vehicleCategories.map((c) => ({
                            id: `vehicleCat-${c.code}`,
                            value: c.code,
                            label: c.name,
                          }))}
                          required
                          {...(formik.touched.vehicleCategoryCode &&
                          formik.errors.vehicleCategoryCode
                            ? {
                                helper: {
                                  text: formik.errors.vehicleCategoryCode,
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
                          label={
                            <strong>{t('forms.compound.roadTaxStatus')}</strong>
                          }
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
                              label: t(
                                'forms.compound.roadTaxStatusNotApplicable',
                              ),
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
                        <div></div>
                        <TextArea
                          id="roadTaxNotes"
                          label={t('forms.compound.roadTaxNotes')}
                          value={formik.values.roadTaxNotes}
                          input={{ maxLength: 4000 }}
                          onChange={(v) =>
                            formik.setFieldValue('roadTaxNotes', v)
                          }
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
                      <Button
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
                          <Row className="m-0" key={index}>
                            <Col className="p-0 mt-1">
                              <Card className="mb-1">
                                <Card.Content>
                                  {trailerSearchError === index && (
                                    <div className="mb-1">
                                      <Alert
                                        type="danger"
                                        size="small"
                                        onClose={() =>
                                          setTrailerSearchError(null)
                                        }
                                      >
                                        {t('common.noResults')}
                                      </Alert>
                                    </div>
                                  )}
                                  <div
                                    className={gridClass}
                                    style={{ alignItems: 'start' }}
                                  >
                                    <div className={styles['select-row']}>
                                      <div className={styles['select-wrapper']}>
                                        <TextField
                                          id={`trailerRegNr_${index}`}
                                          label={t(
                                            'forms.compound.trailerRegNr',
                                          )}
                                          value={trailer.regNr}
                                          input={{ maxLength: 20 }}
                                          onChange={(v) => {
                                            const updated = [
                                              ...formik.values.trailers,
                                            ];
                                            updated[index] = {
                                              ...updated[index],
                                              regNr: v.toUpperCase(),
                                            };
                                            formik.setFieldValue(
                                              'trailers',
                                              updated,
                                            );
                                          }}
                                          required
                                          {...((
                                            formik.touched
                                              .trailers as TrailerTouched
                                          )?.[index]?.regNr &&
                                          (
                                            formik.errors
                                              .trailers as TrailerErrors
                                          )?.[index]?.regNr
                                            ? {
                                                helper: {
                                                  text: (
                                                    formik.errors
                                                      .trailers as TrailerErrors
                                                  )?.[index]?.regNr,
                                                  type: 'error' as const,
                                                },
                                              }
                                            : {})}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          handleTrailerSearch(index)
                                        }
                                      >
                                        {t('common.search')}
                                      </Button>
                                    </div>
                                    <div></div>
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
                                          (o) =>
                                            o.value === trailer.countryCode,
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
                                        formik.touched
                                          .trailers as TrailerTouched
                                      )?.[index]?.countryCode &&
                                      (
                                        formik.errors.trailers as TrailerErrors
                                      )?.[index]?.countryCode
                                        ? {
                                            helper: {
                                              text: (
                                                formik.errors
                                                  .trailers as TrailerErrors
                                              )?.[index]?.countryCode,
                                              type: 'error' as const,
                                            },
                                          }
                                        : {})}
                                    />
                                    <TextField
                                      id={`trailerBodyType_${index}`}
                                      label={t(
                                        'forms.compound.trailerBodyType',
                                      )}
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
                                            ? new Date(
                                                trailer.firstRegistration,
                                              )
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
                                        placeholder={t(
                                          'common.dateFieldPlaceholder',
                                        )}
                                      />
                                    </div>
                                    <ChoiceGroup
                                      id={`trailerCategoryCode_${index}`}
                                      name={`trailerCategoryCode_${index}`}
                                      label={t(
                                        'forms.compound.trailerCategory',
                                      )}
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
                                        formik.touched
                                          .trailers as TrailerTouched
                                      )?.[index]?.categoryCode &&
                                      (
                                        formik.errors.trailers as TrailerErrors
                                      )?.[index]?.categoryCode
                                        ? {
                                            helper: {
                                              text: (
                                                formik.errors
                                                  .trailers as TrailerErrors
                                              )[index]?.categoryCode,
                                              type: 'error' as const,
                                            },
                                          }
                                        : {})}
                                    />
                                    {trailer.categoryCode ===
                                    OTHER.TRAILER_CATEGORY ? (
                                      <TextField
                                        id={`trailerCategoryOther_${index}`}
                                        label={t(
                                          'forms.compound.trailerCategoryOther',
                                        )}
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
                                          formik.touched
                                            .trailers as TrailerTouched
                                        )?.[index]?.categoryOther &&
                                        (
                                          formik.errors
                                            .trailers as TrailerErrors
                                        )?.[index]?.categoryOther
                                          ? {
                                              helper: {
                                                text: (
                                                  formik.errors
                                                    .trailers as TrailerErrors
                                                )?.[index]?.categoryOther,
                                                type: 'error' as const,
                                              },
                                            }
                                          : {})}
                                      />
                                    ) : (
                                      <div></div>
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
                                      {trailerTabIndices.has(index) ? (
                                        <Button
                                          type="button"
                                          visualType="secondary"
                                          onClick={() =>
                                            editTrailerControlForm(index)
                                          }
                                        >
                                          {t(
                                            'forms.compound.editTrailerControlForm',
                                          )}
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          visualType="secondary"
                                          disabled={!trailer.regNr}
                                          onClick={() =>
                                            addTrailerControlForm(
                                              index,
                                              trailer.regNr,
                                            )
                                          }
                                        >
                                          {t(
                                            'forms.compound.addTrailerControlForm',
                                          )}
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        visualType="secondary"
                                        onClick={() =>
                                          formik.setFieldValue(
                                            'trailers',
                                            formik.values.trailers.filter(
                                              (_: Trailer, i: number) =>
                                                i !== index,
                                            ),
                                          )
                                        }
                                      >
                                        {t('forms.compound.removeTrailer')}
                                      </Button>
                                    </div>
                                  </div>
                                </Card.Content>
                              </Card>
                            </Col>
                          </Row>
                        ),
                      )}
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
                      <p className="mb-1">
                        {t('forms.compound.companySubtitle')}
                      </p>
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
                              {t(
                                'forms.compound.companyBusinessRegistrySearch',
                              )}
                            </Heading>
                            <Tooltip>
                              <Tooltip.Trigger>
                                <InfoButton />
                              </Tooltip.Trigger>
                              <Tooltip.Content>
                                {t(
                                  'forms.compound.companyBusinessRegistryTooltip',
                                )}
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
                              onChange={(v) =>
                                formik.setFieldValue('companyName', v)
                              }
                              {...(formik.touched.companyName &&
                              formik.errors.companyName
                                ? {
                                    helper: {
                                      text: formik.errors.companyName,
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
                              <Button
                                type="button"
                                onClick={handleCompanySearch}
                              >
                                {t('forms.compound.companySearchButton')}
                              </Button>
                            </div>
                            <Select
                              id="companyCountryCode"
                              label={t('forms.compound.companyCountryCode')}
                              options={countries}
                              value={
                                countries.find(
                                  (o) =>
                                    o.value ===
                                    formik.values.companyCountryCode,
                                ) ?? null
                              }
                              onChange={(val) =>
                                formik.setFieldValue(
                                  'companyCountryCode',
                                  val && !Array.isArray(val)
                                    ? (val as { value: string }).value
                                    : '',
                                )
                              }
                              required={!!formik.values.companyName}
                              {...(formik.touched.companyCountryCode &&
                              formik.errors.companyCountryCode
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
                              options={(counties ?? []).map((c) => ({
                                value: String(c.id),
                                label: c.name,
                              }))}
                              value={
                                (counties ?? [])
                                  .map((c) => ({
                                    value: String(c.id),
                                    label: c.name,
                                  }))
                                  .find(
                                    (o) =>
                                      o.value === formik.values.companyCounty,
                                  ) ?? null
                              }
                              onChange={(val) => {
                                const v =
                                  val && !Array.isArray(val)
                                    ? (val as { value: string }).value
                                    : '';
                                formik.setFieldValue('companyCounty', v);
                                formik.setFieldValue('companyCity', '');
                                handleCompanyCountyChange();
                              }}
                            />
                            <Select
                              id="companyCity"
                              label={t('forms.compound.companyCity')}
                              options={(companyCitiesParishes ?? []).map(
                                (c) => ({ value: String(c.id), label: c.name }),
                              )}
                              value={
                                (companyCitiesParishes ?? [])
                                  .map((c) => ({
                                    value: String(c.id),
                                    label: c.name,
                                  }))
                                  .find(
                                    (o) =>
                                      o.value === formik.values.companyCity,
                                  ) ?? null
                              }
                              onChange={(val) => {
                                const v =
                                  val && !Array.isArray(val)
                                    ? (val as { value: string }).value
                                    : '';
                                formik.setFieldValue('companyCity', v);
                              }}
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
                            <div></div>
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
                            <strong>
                              {formik.values.companyRegCode || '—'}
                            </strong>
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
                                value={
                                  formik.values.companyActivityLicenceCopyNumber
                                }
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
                      <div
                        className={gridClass}
                        style={{ alignItems: 'start' }}
                      >
                        <TextField
                          id="driverFirstName"
                          label={t('forms.compound.driverFirstName')}
                          value={formik.values.drivers[0]?.firstName ?? ''}
                          input={{ maxLength: 100 }}
                          onChange={(v) => {
                            const u = [...formik.values.drivers];
                            u[0] = { ...u[0], firstName: v };
                            formik.setFieldValue('drivers', u);
                          }}
                          required
                          {...((formik.touched.drivers as DriverTouched)?.[0]
                            ?.firstName &&
                          (formik.errors.drivers as DriverErrors)?.[0]
                            ?.firstName
                            ? {
                                helper: {
                                  text: (
                                    formik.errors.drivers as DriverErrors
                                  )[0]?.firstName,
                                  type: 'error' as const,
                                },
                              }
                            : {})}
                        />
                        <TextField
                          id="driverLastName"
                          label={t('forms.compound.driverLastName')}
                          value={formik.values.drivers[0]?.lastName ?? ''}
                          input={{ maxLength: 100 }}
                          onChange={(v) => {
                            const u = [...formik.values.drivers];
                            u[0] = { ...u[0], lastName: v };
                            formik.setFieldValue('drivers', u);
                          }}
                          required
                          {...((formik.touched.drivers as DriverTouched)?.[0]
                            ?.lastName &&
                          (formik.errors.drivers as DriverErrors)?.[0]?.lastName
                            ? {
                                helper: {
                                  text: (
                                    formik.errors.drivers as DriverErrors
                                  )[0]?.lastName,
                                  type: 'error' as const,
                                },
                              }
                            : {})}
                        />
                        <TextField
                          id="driverPersonalCodeForeign"
                          label={t('forms.compound.driverPersonalCodeForeign')}
                          value={
                            formik.values.drivers[0]?.personalCodeForeign ?? ''
                          }
                          input={{ maxLength: 50 }}
                          onChange={(v) => {
                            const u = [...formik.values.drivers];
                            u[0] = { ...u[0], personalCodeForeign: v };
                            formik.setFieldValue('drivers', u);
                          }}
                          {...((formik.touched.drivers as DriverTouched)?.[0]
                            ?.personalCodeForeign &&
                          (formik.errors.drivers as DriverErrors)?.[0]
                            ?.personalCodeForeign
                            ? {
                                helper: {
                                  text: (
                                    formik.errors.drivers as DriverErrors
                                  )?.[0]?.personalCodeForeign,
                                  type: 'error' as const,
                                },
                              }
                            : {})}
                        />
                        <TextField
                          id="personalCodeEe"
                          label={t('forms.compound.driverPersonalCodeEe')}
                          value={formik.values.drivers[0]?.personalCodeEe ?? ''}
                          input={{ maxLength: 11 }}
                          onChange={(v) => {
                            const u = [...formik.values.drivers];
                            const computed = !u[0]?.birthDate ? birthDateFromEstonianCode(v) : null;
                            u[0] = { ...u[0], personalCodeEe: v, ...(computed ? { birthDate: computed } : {}) };
                            formik.setFieldValue('drivers', u);
                          }}
                          {...((formik.errors.drivers as DriverErrors)?.[0]
                            ?.personalCodeEe
                            ? {
                                helper: {
                                  text: (
                                    formik.errors.drivers as DriverErrors
                                  )[0]?.personalCodeEe,
                                  type: 'error' as const,
                                },
                              }
                            : {})}
                        />
                        <Select
                          id="driverCitizenshipCode"
                          label={t('forms.compound.driverCitizenshipCode')}
                          options={countries}
                          value={
                            countries.find(
                              (o) =>
                                o.value ===
                                formik.values.drivers[0]?.citizenshipCode,
                            ) ?? null
                          }
                          onChange={(val) => {
                            const u = [...formik.values.drivers];
                            u[0] = {
                              ...u[0],
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
                              isDesktop
                                ? 'date-row-desktop-50'
                                : 'date-row-mobile'
                            ]
                          }
                        >
                          <DateField
                            id="driverBirthDate"
                            label={t('forms.compound.driverBirthDate')}
                            monthYearSelectType="grid"
                            selected={
                              formik.values.drivers[0]?.birthDate
                                ? new Date(formik.values.drivers[0].birthDate)
                                : undefined
                            }
                            onSelect={(v) => {
                              const u = [...formik.values.drivers];
                              u[0] = { ...u[0], birthDate: toIsoDate(v) };
                              formik.setFieldValue('drivers', u);
                            }}
                            placeholder={t('common.dateFieldPlaceholder')}
                            required
                            inputProps={
                              (formik.touched.drivers as DriverTouched)?.[0]
                                ?.birthDate &&
                              (formik.errors.drivers as DriverErrors)?.[0]
                                ?.birthDate
                                ? {
                                    helper: {
                                      text: (
                                        formik.errors.drivers as DriverErrors
                                      )?.[0]?.birthDate,
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
                </Col>
              </Row>

              {/* Plokk: Teise juhi / meeskonna liikme andmed */}
              {/*
              {false && (
                <Row className="m-0">
                  <Col className="p-0">
                    <Card className="mb-1">
                      <Card.Content>
                        <Heading element="h3" className="mb-1">
                          {t('forms.compound.driver2')}
                        </Heading>
                        <div
                          className={gridClass}
                          style={{ alignItems: 'start' }}
                        >
                          <TextField
                            id="driver2FirstName"
                            label={t('forms.compound.driverFirstName')}
                            value={formik.values.drivers[1]?.firstName ?? ''}
                            input={{ maxLength: 100 }}
                            onChange={(v) => {
                              const u = [...formik.values.drivers];
                              u[1] = {
                                ...emptyDriver(),
                                ...u[1],
                                firstName: v,
                              };
                              formik.setFieldValue('drivers', u);
                            }}
                          />
                          <TextField
                            id="driver2LastName"
                            label={t('forms.compound.driverLastName')}
                            value={formik.values.drivers[1]?.lastName ?? ''}
                            input={{ maxLength: 100 }}
                            onChange={(v) => {
                              const u = [...formik.values.drivers];
                              u[1] = { ...emptyDriver(), ...u[1], lastName: v };
                              formik.setFieldValue('drivers', u);
                            }}
                          />
                          <TextField
                            id="driver2PersonalCodeForeign"
                            label={t(
                              'forms.compound.driverPersonalCodeForeign',
                            )}
                            value={
                              formik.values.drivers[1]?.personalCodeForeign ??
                              ''
                            }
                            input={{ maxLength: 50 }}
                            onChange={(v) => {
                              const u = [...formik.values.drivers];
                              u[1] = {
                                ...emptyDriver(),
                                ...u[1],
                                personalCodeForeign: v,
                              };
                              formik.setFieldValue('drivers', u);
                            }}
                          />
                          <TextField
                            id="personalCodeEe"
                            label={t('forms.compound.driverPersonalCodeEe')}
                            value={
                              formik.values.drivers[1]?.personalCodeEe ?? ''
                            }
                            input={{ maxLength: 11 }}
                            onChange={(v) => {
                              const u = [...formik.values.drivers];
                              const computed = !u[1]?.birthDate ? birthDateFromEstonianCode(v) : null;
                              u[1] = {
                                ...emptyDriver(),
                                ...u[1],
                                personalCodeEe: v,
                                ...(computed ? { birthDate: computed } : {}),
                              };
                              formik.setFieldValue('drivers', u);
                            }}
                            {...((formik.errors.drivers as DriverErrors)?.[1]
                              ?.personalCodeEe
                              ? {
                                  helper: {
                                    text: (formik.errors.drivers as DriverErrors)[1]
                                      .personalCodeEe,
                                    type: 'error' as const,
                                  },
                                }
                              : {})}
                          />
                          <Select
                            id="driver2CitizenshipCode"
                            label={t('forms.compound.driverCitizenshipCode')}
                            options={countries}
                            value={
                              countries.find(
                                (o) =>
                                  o.value ===
                                  formik.values.drivers[1]?.citizenshipCode,
                              ) ?? null
                            }
                            onChange={(val) => {
                              const u = [...formik.values.drivers];
                              u[1] = {
                                ...emptyDriver(),
                                ...u[1],
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
                                isDesktop
                                  ? 'date-row-desktop-50'
                                  : 'date-row-mobile'
                              ]
                            }
                          >
                            <DateField
                              id="driver2BirthDate"
                              label={t('forms.compound.driverBirthDate')}
                              monthYearSelectType="grid"
                              selected={
                                formik.values.drivers[1]?.birthDate
                                  ? new Date(formik.values.drivers[1].birthDate)
                                  : undefined
                              }
                              onSelect={(v) => {
                                const u = [...formik.values.drivers];
                                u[1] = {
                                  ...emptyDriver(),
                                  ...u[1],
                                  birthDate: toIsoDate(v),
                                };
                                formik.setFieldValue('drivers', u);
                              }}
                              placeholder={t('common.dateFieldPlaceholder')}
                              required
                              inputProps={
                                (formik.touched.drivers as DriverTouched)?.[1]
                                  ?.birthDate &&
                                (formik.errors.drivers as DriverErrors)?.[1]
                                  ?.birthDate
                                  ? {
                                      helper: {
                                        text: (
                                          formik.errors.drivers as DriverErrors
                                        )?.[1]?.birthDate,
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
                  </Col>
                </Row>
              )}
              */}

              {/* Plokk: Sõidukit kontrollinud ametiisiku andmed */}
              <Row className="m-0">
                <Col className="p-0">
                  <Card className="mb-1">
                    <Card.Content>
                      <Heading element="h3" className="mb-1">
                        {t('forms.compound.inspector')}
                      </Heading>
                      <div
                        className={
                          styles[
                            isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                          ]
                        }
                      >
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
                          onChange={(v) =>
                            formik.setFieldValue('inspectorLastName', v)
                          }
                          {...(formik.touched.inspectorLastName &&
                          formik.errors.inspectorLastName
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
                            structureUnits
                              .map((opt) => ({
                                label: opt.name,
                                value: opt.code,
                              }))
                              .find(
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
                          onChange={(v) =>
                            formik.setFieldValue('inspectorProfession', v)
                          }
                          required
                          {...(formik.touched.inspectorProfession &&
                          formik.errors.inspectorProfession
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
            </form>
          </div>
        </Tabs.Content>
        {DRIVE_REST_ROUTES.map((route) => {
          const { tabId, type: tabType } = ROUTE_TO_TAB[route];
          return openTabs.includes(tabId) ? (
            <Tabs.Content key={tabId} id={tabId} className="p-1">
              <div style={{ display: activeTab === tabId ? 'block' : 'none' }}>
                <DriveRestFormCreatePage
                  type={tabType}
                  compoundFormKey={undefined}
                  initialValidate={validatedTabs.has(tabId)}
                  onValuesChange={(values) => {
                    savedFormData.current[tabId] = values;
                  }}
                  ref={(ref) => {
                    formRefs.current[tabId].current = ref;
                  }}
                  onSaved={(id) => {
                    if (id) {
                      savedDriveRestFormsRef.current = new Set(
                        savedDriveRestFormsRef.current,
                      ).add(tabId);
                      savedSubFormIdsRef.current[tabId] = String(id);
                    }
                  }}
                />
              </div>
            </Tabs.Content>
          ) : null;
        })}
        {(() => {
          const vehicleTabId = ROUTE_TO_TAB['/vehicle-technical'].tabId;
          return openTabs.includes(vehicleTabId) ? (
            <Tabs.Content key={vehicleTabId} id={vehicleTabId} className="p-1">
              <div
                style={{
                  display: activeTab === vehicleTabId ? 'block' : 'none',
                }}
              >
                <TechnicalCheckFormCreatePage
                  type="vehicle"
                  compoundFormKey={undefined}
                  initialValidate={validatedTabs.has(vehicleTabId)}
                  onValuesChange={(values) => {
                    // eslint-disable-next-line react-hooks/immutability
                    savedFormData.current[vehicleTabId] =
                      values as Partial<DriveRestForm>;
                  }}
                  ref={(ref) => {
                    const vehicleRef = formRefs.current[vehicleTabId];
                    vehicleRef.current = ref as TechnicalCheckFormCreatePageRef;
                  }}
                  onSaved={(id) => {
                    if (id) {
                      savedDriveRestFormsRef.current = new Set(
                        savedDriveRestFormsRef.current,
                      ).add(vehicleTabId);
                      savedSubFormIdsRef.current[vehicleTabId] = String(id);
                    }
                  }}
                  compoundTrailers={formik.values.trailers}
                />
              </div>
            </Tabs.Content>
          ) : null;
        })()}
        {openTabs
          .filter((id) => id.startsWith('tab-trailer-technical-'))
          .map((tabId) => {
            const trailerIndex = Number(
              tabId.replace('tab-trailer-technical-', ''),
            );
            const trailerRegNr = formik.values.trailers[trailerIndex]?.regNr;
            return (
              <Tabs.Content key={tabId} id={tabId} className="p-1">
                <div
                  style={{ display: activeTab === tabId ? 'block' : 'none' }}
                >
                  <TechnicalCheckFormCreatePage
                    type="trailer"
                    compoundFormKey={undefined}
                    initialValidate={validatedTabs.has(tabId)}
                    onValuesChange={(values) => {
                      savedFormData.current[tabId] =
                        values as Partial<DriveRestForm>;
                    }}
                    ref={(ref) => {
                      if (!formRefs.current[tabId]) {
                        formRefs.current[tabId] = React.createRef<FormRef>();
                      }
                      formRefs.current[tabId].current =
                        ref as TechnicalCheckFormCreatePageRef;
                    }}
                    onSaved={(id) => {
                      if (id) {
                        savedDriveRestFormsRef.current = new Set(
                          savedDriveRestFormsRef.current,
                        ).add(tabId);
                        savedSubFormIdsRef.current[tabId] = String(id);
                      }
                    }}
                    compoundTrailers={formik.values.trailers}
                    trailerIndex={trailerIndex}
                    initialData={
                      trailerRegNr
                        ? ({
                            trailerRegNr,
                          } as Partial<TechnicalCheckForm> as TechnicalCheckForm)
                        : undefined
                    }
                  />
                </div>
              </Tabs.Content>
            );
          })}
        {ADR_ROUTES.map((route) => {
          const { tabId } = ROUTE_TO_TAB[route];
          return openTabs.includes(tabId) ? (
            <Tabs.Content key={tabId} id={tabId} className="p-1">
              <div style={{ display: activeTab === tabId ? 'block' : 'none' }}>
                <AdrFormCreatePage
                  compoundFormKey={undefined}
                  initialValidate={validatedTabs.has(tabId)}
                  onValuesChange={(values) => {
                    savedFormData.current[tabId] =
                      values as Partial<DriveRestForm>;
                  }}
                  ref={(ref) => {
                    formRefs.current[tabId].current =
                      ref as AdrFormCreatePageRef;
                  }}
                  onSaved={(id) => {
                    if (id) {
                      savedDriveRestFormsRef.current = new Set(
                        savedDriveRestFormsRef.current,
                      ).add(tabId);
                      savedSubFormIdsRef.current[tabId] = String(id);
                    }
                  }}
                />
              </div>
            </Tabs.Content>
          ) : null;
        })}
        {TRANSPORT_INTERRUPTION_ROUTES.map((route) => {
          const { tabId } = ROUTE_TO_TAB[route];
          return openTabs.includes(tabId) ? (
            <Tabs.Content key={tabId} id={tabId} className="p-1">
              <div style={{ display: activeTab === tabId ? 'block' : 'none' }}>
                <TransportInterruptionFormCreatePage
                  compoundFormKey={undefined}
                  initialValidate={validatedTabs.has(tabId)}
                  onValuesChange={(values) => {
                    savedFormData.current[tabId] =
                      values as Partial<DriveRestForm>;
                  }}
                  ref={(ref) => {
                    formRefs.current[tabId].current =
                      ref as TransportInterruptionFormCreatePageRef;
                  }}
                  onSaved={(id) => {
                    if (id) {
                      savedDriveRestFormsRef.current = new Set(
                        savedDriveRestFormsRef.current,
                      ).add(tabId);
                      savedSubFormIdsRef.current[tabId] = String(id);
                    }
                  }}
                />
              </div>
            </Tabs.Content>
          ) : null;
        })}
      </Tabs>

      <div className="page-actions mt-1">
        <div className="page-actions-buttons">
          <Button visualType="secondary" onClick={() => navigate('/')}>
            {t('common.back')}
          </Button>
          <Button
            type="submit"
            disabled={openTabs.length < 1}
            onClick={async () => {
              // Step 1: Validate all forms (compound form and all drive-rest forms on all tabs)
              const isValid = await validateAllForms();

              // Step 2: If validation fails, block saving and show errors
              if (!isValid) {
                return;
              }

              // Step 3: Save compound form
              formik.handleSubmit();

              // Step 4: Wait for compoundFormId to be set
              const waitForCompoundFormId = () => {
                return new Promise<number>((resolve) => {
                  const check = () => {
                    if (compoundFormIdRef.current) {
                      resolve(compoundFormIdRef.current);
                    } else {
                      setTimeout(check, 100);
                    }
                  };
                  check();
                });
              };

              const id = await waitForCompoundFormId();

              // Step 5: Save all drive-rest forms sequentially. The active
              // tab's DriveRestFormCreatePage is mounted, so we submit it via
              // its ref. Inactive tabs are unmounted by Tabs.Content, so we
              // save them directly from the synced savedFormData snapshot.
              for (const tabId of openTabs) {
                const tabFormRef = formRefs.current[tabId]?.current;
                if (tabFormRef && tabFormRef.handleSubmit) {
                  tabFormRef.handleSubmit(id);
                  await new Promise<void>((resolve) => {
                    const check = () => {
                      if (savedDriveRestFormsRef.current.has(tabId)) {
                        resolve();
                      } else {
                        setTimeout(check, 100);
                      }
                    };
                    check();
                  });
                } else {
                  const isDynamicTrailerTab = tabId.startsWith(
                    'tab-trailer-technical-',
                  );
                  const tabDef = isDynamicTrailerTab
                    ? { tabId, type: 'trailer', labelKey: '' }
                    : Object.values(ROUTE_TO_TAB).find(
                        (t) => t.tabId === tabId,
                      );
                  const isAdrTab = ADR_ROUTES.some(
                    (route) => ROUTE_TO_TAB[route].tabId === tabId,
                  );
                  const isTransportInterruptionTab =
                    TRANSPORT_INTERRUPTION_ROUTES.some(
                      (route) => ROUTE_TO_TAB[route].tabId === tabId,
                    );
                  const isTechnicalCheck =
                    !isAdrTab &&
                    !isTransportInterruptionTab &&
                    (ROUTE_TO_TAB['/vehicle-technical'].tabId === tabId ||
                      isDynamicTrailerTab);
                  if (tabDef) {
                    if (isAdrTab) {
                      const raw = savedFormData.current[
                        tabId
                      ] as Partial<AdrForm>;
                      const isBlank = (obj: Record<string, unknown>) =>
                        Object.values(obj).every((v) => v == null || v === '');
                      const values = {
                        ...raw,
                        compoundFormKey: id,
                        driverAssistant:
                          raw.driverAssistant &&
                          !isBlank(
                            raw.driverAssistant as Record<string, unknown>,
                          )
                            ? JSON.stringify(raw.driverAssistant)
                            : '',
                        lastLoadAddress:
                          raw.lastLoadAddress &&
                          !isBlank(
                            raw.lastLoadAddress as Record<string, unknown>,
                          )
                            ? JSON.stringify(raw.lastLoadAddress)
                            : '',
                        nextLoadAddress:
                          raw.nextLoadAddress &&
                          !isBlank(
                            raw.nextLoadAddress as Record<string, unknown>,
                          )
                            ? JSON.stringify(raw.nextLoadAddress)
                            : '',
                        dangerousGoods: JSON.stringify(
                          raw.dangerousGoods ?? [],
                        ),
                        infringements: JSON.stringify(
                          (raw.infringements ?? []).filter(
                            (e) =>
                              !!(e as { checkStatus?: string }).checkStatus,
                          ),
                        ),
                        correctiveMeasures: JSON.stringify(
                          raw.correctiveMeasures ?? [],
                        ),
                      };
                      const result = await saveAdrForm(
                        values as unknown as AdrForm,
                      );
                      if ((result[0] as { id?: string })?.id) {
                        savedDriveRestFormsRef.current = new Set(
                          savedDriveRestFormsRef.current,
                        ).add(tabId);
                        savedSubFormIdsRef.current[tabId] = String(
                          (result[0] as { id?: string }).id,
                        );
                      }
                    } else if (isTechnicalCheck) {
                      const variant = tabDef.type as TechnicalCheckVariant;
                      const raw = savedFormData.current[
                        tabId
                      ] as Partial<TechnicalCheckForm>;
                      const values = {
                        ...raw,
                        compoundFormKey: id,
                        partsSummary: JSON.stringify(raw.partsSummary ?? []),
                        partsDefects: JSON.stringify(raw.partsDefects ?? []),
                        violations: JSON.stringify(raw.violations ?? []),
                      };
                      const result = await saveTechnicalCheckForm(
                        variant,
                        values as unknown as TechnicalCheckForm,
                      );
                      if ((result[0] as { id?: string })?.id) {
                        savedDriveRestFormsRef.current = new Set(
                          savedDriveRestFormsRef.current,
                        ).add(tabId);
                        savedSubFormIdsRef.current[tabId] = String(
                          (result[0] as { id?: string }).id,
                        );
                      }
                    } else if (isTransportInterruptionTab) {
                      const raw = savedFormData.current[
                        tabId
                      ] as Partial<TransportInterruptionForm>;
                      const payload = {
                        ...raw,
                        compoundFormKey: id,
                        legalBases: JSON.stringify(raw.legalBases ?? []),
                      } as unknown as TransportInterruptionForm;
                      const result =
                        await saveTransportInterruptionForm(payload);
                      if ((result[0] as { id?: string })?.id) {
                        savedDriveRestFormsRef.current = new Set(
                          savedDriveRestFormsRef.current,
                        ).add(tabId);
                        savedSubFormIdsRef.current[tabId] = String(
                          (result[0] as { id?: string }).id,
                        );
                      }
                    } else if (!isAdrTab) {
                      const tabType = tabDef.type as 'driver' | 'teammate';
                      const values = {
                        ...savedFormData.current[tabId],
                        compoundFormKey: id,
                      };
                      const trimmedValues = serializeDriveRestFormValues(
                        values,
                        'saved',
                      );
                      const result = await saveDriveRestForm(
                        tabType,
                        trimmedValues as unknown as DriveRestForm,
                      );
                      if (result[0]?.id) {
                        savedDriveRestFormsRef.current = new Set(
                          savedDriveRestFormsRef.current,
                        ).add(tabId);
                        savedSubFormIdsRef.current[tabId] = String(
                          result[0].id,
                        );
                      }
                    }
                  }
                }
              }

              // Step 6: Navigate to the compound page (which shows all tabs).
              navigate(`/control-forms/compound/${id}`, {
                state: { justCreated: true },
              });
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
