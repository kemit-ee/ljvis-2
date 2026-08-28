import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { Organisation } from '../../../organisations/types';
import type {CompoundForm, Trailer, Driver, ControlForm} from '../../types';
import { listOrganisations } from '../../../organisations/api';
import {
  confirmCompoundForm,
  saveCompoundForm,
  publishCompoundForm,
} from '../../api';
import { ApiError } from '../../../../shared/api/client';
import { applyValidationError } from '../../../../shared/api/errors';
import { useAuth } from '../../../auth/AuthContext';
import { toIsoDate, toIsoTime } from '../../../../hooks/dateUtils';
import { OTHER, ROAD } from '../../../../constants/constants.ts';
import { useCompanySearch } from '../../../xroad/hooks/useCompanySearch';
import { useVehicleSearch } from '../../../xroad/hooks/useVehicleSearch';
import { searchVehicleByRegNr } from '../../../xroad/api';
import type { XRoadVehicle } from '../../../xroad/types';
import { FORM_CONFIG } from "../../formRoutes.ts";
import { useClassifiers } from '../../../classifiers/ClassifierProvider.tsx';

// Separate maps for vehicle and trailer EU category codes (liiklusregister
// `kateg` field) → internal VEHICLE_CATEGORY_2012 / TRAILER_CATEGORY_2012
// classifier codes. Keeping them separate prevents a trailer code (O3 → C_2012)
// from being silently placed in the vehicle category field, which would pass
// form validation but produce an invalid submission.
const VEHICLE_CATEGORY_MAP: Record<string, string> = {
  N2: 'A_2012',     // (a) N2 3.5–12 t
  N3: 'B_2012',     // (b) N3 >12 t
  M2: 'E_2012',     // (e) M2 >9 seats <5 t
  M3: 'F_2012',     // (f) M3 >9 seats >5 t
  T1: 'G3_2012',    T1b: 'G3_2012',
  T2: 'H2_2012',    T2b: 'H2_2012',
  T3: 'I_2012',     T3b: 'I_2012',
  'T4.1': 'J_2012', 'T4.1b': 'J_2012',
  'T4.2': 'K_2012', 'T4.2b': 'K_2012',
  'T4.3': 'L_2012', 'T4.3b': 'L_2012',
};

const TRAILER_CATEGORY_MAP: Record<string, string> = {
  O3: 'C_2012',     // (c) O3 3.5–10 t
  O4: 'D_2012',     // (d) O4 >10 t
};

interface MappedCategory {
  categoryCode: string;
  categoryOther: string;
}

// LJVIS2-55 §33/§49: kategooria peab olema alati täidetud. Codes outside the
// known subset (M1, N1, O1, O2, L*, …) have no direct classifier entry but
// must not be silently lost. We set categoryCode = OTHER_2012 ("Muu") and
// categoryOther = <raw code> so the form displays and validates correctly.
function mapVehicleCategory(euCode: string | null | undefined): MappedCategory {
  if (!euCode) return { categoryCode: '', categoryOther: '' };
  const trimmed = euCode.trim();
  const mapped = VEHICLE_CATEGORY_MAP[trimmed];
  if (mapped) return { categoryCode: mapped, categoryOther: '' };
  return { categoryCode: OTHER.VEHICLE_CATEGORY, categoryOther: trimmed };
}

function mapTrailerCategory(euCode: string | null | undefined): MappedCategory {
  if (!euCode) return { categoryCode: '', categoryOther: '' };
  const trimmed = euCode.trim();
  const mapped = TRAILER_CATEGORY_MAP[trimmed];
  if (mapped) return { categoryCode: mapped, categoryOther: '' };
  return { categoryCode: OTHER.TRAILER_CATEGORY, categoryOther: trimmed };
}

export const emptyDriver = (): Driver => ({
  personalCodeEe: '',
  firstName: '',
  lastName: '',
  citizenshipCode: '',
  personalCodeForeign: '',
  birthDate: '',
});

export const emptyTrailer = (): Trailer => ({
  regNr: '',
  countryCode: '',
  make: '',
  model: '',
  vin: '',
  firstRegistration: '',
  bodyType: '',
  categoryCode: '',
  categoryOther: '',
});

export function useCompoundForm(
  form: CompoundForm | undefined,
  onSaved: (id?: string) => void,
  onConfirmed?: () => void,
  subFormsAllConfirmedOrPublished?: boolean,
  onResetToSaved?: () => void,
  onPublished?: () => void,
) {
  const { t } = useTranslation();
  const { user: authUser, permissions } = useAuth();
  const isEdit = !!form;
  const pendingConfirm = useRef(false);
  const pendingPublish = useRef(false);
  const pendingForceSaved = useRef(false);
  const subFormsAllConfirmedOrPublishedRef = useRef(subFormsAllConfirmedOrPublished);
  useEffect(() => {
    subFormsAllConfirmedOrPublishedRef.current = subFormsAllConfirmedOrPublished;
  });
  const { getByCode, getChildren } = useClassifiers();

  const WRITE_SUFFIX = '.write';

  const incrementFormNumber = (formNumber: string): string => {
    const match = formNumber.match(/^(.+\/)([0-9]+)$/);
    if (match) {
      return `${match[1]}${parseInt(match[2], 10) + 1}`;
    }
    return `${formNumber}/2`;
  };

  const formNumberString = isEdit && form?.formNumber ? form.formNumber : '';

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [trailerSearchError, setTrailerSearchError] = useState<number | null>(
    null,
  );
  const [mtrSearchError, setMtrSearchError] = useState(false);

  useEffect(() => {
    listOrganisations().then(setOrganisations).catch(console.error);
  }, []);

  const counties = useMemo(
    () =>
      getByCode('EHAK')
        .filter((e) => e.parentKey === null)
        .map((e) => ({ id: e.classifierValueKey, name: e.name })),
    [getByCode],
  );

  const roads = useMemo(
    () =>
      getByCode('ROAD_NAME').map((e) => ({
        code: e.code,
        name: e.name,
      })),
    [getByCode],
  );

  const trailerCategories = useMemo(
    () =>
      getByCode('TRAILER_CATEGORY').map((e) => ({
        code: e.code,
        name: e.name,
      })),
    [getByCode],
  );

  const vehicleCategories = useMemo(
    () =>
      getByCode('VEHICLE_CATEGORY').map((e) => ({
        code: e.code,
        name: e.name,
      })),
    [getByCode],
  );

  const validationSchema = Yup.object({
    address: Yup.string().max(
      300,
      t('forms.foreign_violation.validation.max_length', { max: 300 }),
    ),
    road: Yup.string(),
    road_other: Yup.string().when('road', {
      is: OTHER.ROAD,
      then: (schema) =>
        schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    kilometer: Yup.string().when('road', {
      is: (road: string) => !!road,
      then: (schema) =>
        schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    controlDate: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    county: Yup.string().when('controlCountryCode', {
      is: 'EE',
      then: (schema) =>
        schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    controlCountryCode: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    controlTime: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    vehicleRegNr: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    vehicleCountryCode: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    vehicleCategoryCode: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    vehicleCategoryOther: Yup.string().when('vehicleCategoryCode', {
      is: OTHER.VEHICLE_CATEGORY,
      then: (schema) =>
        schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    companyRegCode: Yup.string(),
    companyName: Yup.string(),
    companyCountryCode: Yup.string().when('companyName', {
      is: (v: string) => !!v?.trim(),
      then: (schema) =>
        schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema,
    }),
    inspectorFirstName: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    inspectorLastName: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    inspectorOrganisationId: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    inspectorProfession: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    trailers: Yup.array().of(
      Yup.object({
        regNr: Yup.string().required(
          t('forms.foreign_violation.validation.required'),
        ),
        countryCode: Yup.string().required(
          t('forms.foreign_violation.validation.required'),
        ),
        categoryCode: Yup.string().required(
          t('forms.foreign_violation.validation.required'),
        ),
        categoryOther: Yup.string().when('categoryCode', {
          is: OTHER.TRAILER_CATEGORY,
          then: (schema) =>
            schema.required(t('forms.foreign_violation.validation.required')),
          otherwise: (schema) => schema.optional(),
        }),
      }),
    ),
    drivers: Yup.array().test('drivers-validation', '', function (drivers) {
      if (!drivers) return true;
      const req = t('forms.foreign_violation.validation.required');
      const errors: Yup.ValidationError[] = [];
      drivers.forEach((driver: Driver, index: number) => {
        if (index === 0) {
          if (!driver?.firstName)
            errors.push(
              new Yup.ValidationError(
                req,
                driver?.firstName,
                `drivers[${index}].firstName`,
              ),
            );
          if (!driver?.lastName)
            errors.push(
              new Yup.ValidationError(
                req,
                driver?.lastName,
                `drivers[${index}].lastName`,
              ),
            );
          if (!driver?.personalCodeForeign)
            errors.push(
              new Yup.ValidationError(
                req,
                driver?.personalCodeForeign,
                `drivers[${index}].personalCodeForeign`,
              ),
            );
          if (!driver?.birthDate)
            errors.push(
              new Yup.ValidationError(
                req,
                driver?.birthDate,
                `drivers[${index}].birthDate`,
              ),
            );
        }
        if (index === 1) {
          if (!driver?.birthDate)
            errors.push(
              new Yup.ValidationError(
                req,
                driver?.birthDate,
                `drivers[${index}].birthDate`,
              ),
            );
        }
      });
      if (errors.length > 0) throw new Yup.ValidationError(errors);
      return true;
    }),
  }).test(
    'address-or-road',
    t('forms.foreign_violation.validation.required'),
    function (values) {
      const { address, road } = values;
      const hasAddress = !!address;
      const hasRoad = !!road;
      if (!hasAddress && !hasRoad) {
        return this.createError({
          path: 'address',
          message: t('forms.foreign_violation.validation.required'),
        });
      }
      return true;
    },
  );

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      formNumber: form?.formNumber ?? '',
      controlCountryCode: form?.controlCountryCode ?? 'EE',
      address: form?.address ?? '',
      road: form?.road ?? '',
      roadOther: form?.roadOther ?? '',
      kilometer: form?.kilometer ?? '',
      county: form?.county ?? '',
      city: form?.city ?? '',
      controlDate: form?.controlDate ?? '',
      controlTime: form?.controlTime ?? '',
      road_type: form?.road_type ?? ROAD.NATIONAL,
      vehicleRegNr: form?.vehicleRegNr ?? '',
      vehicleMake: form?.vehicleMake ?? '',
      vehicleModel: form?.vehicleModel ?? '',
      vehicleCountryCode: form?.vehicleCountryCode ?? '',
      vehicleVin: form?.vehicleVin ?? '',
      vehicleFirstRegistration: form?.vehicleFirstRegistration ?? '',
      vehicleBodyType: form?.vehicleBodyType ?? '',
      vehicleCategoryCode: form?.vehicleCategoryCode ?? '',
      vehicleCategoryOther: form?.vehicleCategoryOther ?? '',
      vehicleMileage: form?.vehicleMileage ?? '',
      roadTaxStatus: form?.roadTaxStatus ?? ROAD.TAX_STATUS_NOT_APPLICABLE,
      roadTaxNotes: form?.roadTaxNotes ?? '',
      trailers: (Array.isArray(form?.trailers)
        ? form.trailers
        : typeof form?.trailers === 'string'
          ? JSON.parse(form.trailers)
          : []) as Trailer[],
      companyRegCode: form?.companyRegCode ?? '',
      companyName: form?.companyName ?? '',
      companyCountryCode: form?.companyCountryCode ?? '',
      companyCounty: form?.companyCounty ?? '',
      companyCity: form?.companyCity ?? '',
      companyAddressLine1: form?.companyAddressLine1 ?? '',
      companyPostalCode: form?.companyPostalCode ?? '',
      companyOwnerFirstName: form?.companyOwnerFirstName ?? '',
      companyOwnerLastName: form?.companyOwnerLastName ?? '',
      companyActivityLicenceCopyNumber:
        form?.companyActivityLicenceCopyNumber ?? '',
      drivers: (Array.isArray(form?.drivers)
        ? form.drivers
        : typeof form?.drivers === 'string'
          ? JSON.parse(form.drivers)
          : [emptyDriver()]) as Driver[],
      inspectorFirstName: form?.inspectorFirstName ?? authUser?.firstname ?? '',
      inspectorLastName: form?.inspectorLastName ?? authUser?.lastname ?? '',
      inspectorOrganisationId:
        form?.inspectorOrganisationId ?? authUser?.organisationid ?? '',
      inspectorUnit: form?.inspectorUnit ?? authUser?.structuralunit ?? '',
      inspectorProfession:
        form?.inspectorProfession ?? authUser?.jobtitle ?? '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const isConfirming = pendingConfirm.current;
        const isPublishing = pendingPublish.current;
        pendingConfirm.current = false;
        pendingPublish.current = false;
        const forceSaved = pendingForceSaved.current;
        pendingForceSaved.current = false;
        if (isPublishing && form?.id) {
          await publishCompoundForm(form.id);
          onPublished?.();
          return;
        }
        const isReconfirmedEdit = !isConfirming && !forceSaved && form?.status === 'confirmed' && (subFormsAllConfirmedOrPublishedRef.current ?? true);
        const isRepublishedEdit = !isConfirming && !forceSaved && form?.status === 'published' && (subFormsAllConfirmedOrPublishedRef.current ?? true);
        const nextStatus = isConfirming
          ? 'confirmed'
          : isReconfirmedEdit
            ? 'confirmed'
            : isRepublishedEdit
              ? 'published'
              : 'saved';
        const nextFormNumber = (isReconfirmedEdit || isRepublishedEdit)
          ? incrementFormNumber(formNumberString)
          : formNumberString;
        const driver1 = values.drivers[0];
        const driver2 = values.drivers[1];
        const trimmedValues = {
          ...values,
          status: nextStatus,
          formNumber: nextFormNumber,
          controlDate: toIsoDate(values.controlDate),
          controlTime: toIsoTime(values.controlTime),
          vehicleFirstRegistration: toIsoDate(values.vehicleFirstRegistration),
          trailers: Array.isArray(values.trailers)
            ? JSON.stringify(values.trailers)
            : (values.trailers ?? '[]'),
          drivers: Array.isArray(values.drivers)
            ? JSON.stringify(
                values.drivers.map((d) => ({
                  ...d,
                  firstName: d.firstName?.trim(),
                  lastName: d.lastName?.trim(),
                  birthDate: toIsoDate(d.birthDate),
                })),
              )
            : (values.drivers ?? '[]'),
          driver1PersonalCodeEe: driver1?.personalCodeEe || '',
          driver1PersonalCodeForeign: driver1?.personalCodeForeign || '',
          driver2PersonalCodeEe: driver2?.personalCodeEe || '',
          driver2PersonalCodeForeign: driver2?.personalCodeForeign || '',
        };
        if (values.id) {
          if (isConfirming || isReconfirmedEdit) {
            await confirmCompoundForm(trimmedValues as unknown as CompoundForm);
            onConfirmed?.();
          } else if (isPublishing || isRepublishedEdit) {
            await publishCompoundForm(values.id);
            onPublished?.();
          }
          else {
            await saveCompoundForm(trimmedValues as unknown as CompoundForm);
            if (forceSaved && onResetToSaved) {
              onResetToSaved();
            } else {
              onSaved(values.id);
            }
          }
        } else {
          const result = await saveCompoundForm(
            trimmedValues as unknown as CompoundForm,
          );
          onSaved(result[0]?.id);
        }
      } catch (e) {
        if (e instanceof ApiError && typeof e.body === 'string') {
          e.body = JSON.parse(e.body);
        }
        if (
          !applyValidationError(e, formik.setFieldError, (code) =>
            t(`forms.foreign_violation.validation.api.${code}`),
          )
        ) {
          console.error('Save failed', e);
        }
      }
    },
  });

  const triggerConfirm = () => {
    pendingConfirm.current = true;
    formik.submitForm();
  };

  const triggerPublish = () => {
    pendingPublish.current = true;
    formik.submitForm();
  };

  const triggerSaveAsSaved = () => {
    pendingForceSaved.current = true;
    formik.submitForm();
  };

  const orgOptions = organisations.map((o) => ({
    label: o.name,
    value: String(o.id),
  }));

  const structureUnits = useMemo(() => {
    const orgId =
      formik.values.inspectorOrganisationId ||
      String(authUser?.organisationid ?? '');
    const org = organisations.find((o) => String(o.id) === String(orgId));
    return getByCode('STRUCTURE_UNIT')
      .filter((e) => !org || e.description === org.code)
      .map((e) => ({ code: e.code, name: e.name }));
  }, [getByCode, organisations, formik.values.inspectorOrganisationId, authUser?.organisationid]);

  const handleOrgChange = (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => {
    const newOrgId =
      val && !Array.isArray(val) && 'value' in val
        ? (val as { value: string }).value
        : '';
    formik.setFieldValue('inspectorOrganisationId', newOrgId);
    formik.setFieldValue('inspectorUnit', '');
  };

  const citiesParishes = useMemo(
    () =>
      formik.values.county
        ? getChildren('EHAK', Number(formik.values.county)).map((e) => ({ id: e.classifierValueKey, name: e.name }))
        : [],
    [formik.values.county, getChildren],
  );

  const companyCitiesParishes = useMemo(
    () =>
      formik.values.companyCounty
        ? getChildren('EHAK', Number(formik.values.companyCounty)).map((e) => ({ id: e.classifierValueKey, name: e.name }))
        : [],
    [formik.values.companyCounty, getChildren],
  );

  const handleCountyChange = () => {
    formik.setFieldValue('city', '');
  };

  const handleCompanyCountyChange = () => {
    formik.setFieldValue('companyCity', '');
  };

  const handleStructuralUnitChange = (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => {
    if (val && !Array.isArray(val) && 'value' in val) {
      formik.setFieldValue('inspectorUnit', (val as { value: string }).value);
    } else {
      formik.setFieldValue('inspectorUnit', '');
    }
  };

  const {
    searchByRegCode,
    error: companySearchError,
    setError: setCompanySearchError,
  } = useCompanySearch({
    onCompanyFound: (company) => {
      formik.setFieldValue('companyName', company.companyName);
      formik.setFieldValue('companyAddress', company.address);
      formik.setFieldValue('companyCity', company.city);
      formik.setFieldValue('companyPostalCode', company.postalCode);
      formik.setFieldValue('companyCountryCode', 'EE');
    },
  });

  const handleCompanySearch = () => searchByRegCode(formik.values.companyRegCode);

  const applyVehicleToForm = (vehicle: XRoadVehicle) => {
    const { categoryCode, categoryOther } = mapVehicleCategory(vehicle.categoryCode);
    formik.setFieldValue('vehicleMake', vehicle.make ?? '');
    formik.setFieldValue('vehicleModel', vehicle.model ?? '');
    formik.setFieldValue('vehicleVin', vehicle.vin ?? '');
    formik.setFieldValue('vehicleBodyType', vehicle.bodyType ?? '');
    formik.setFieldValue('vehicleCategoryCode', categoryCode);
    formik.setFieldValue('vehicleCategoryOther', categoryOther);
    formik.setFieldValue(
      'vehicleFirstRegistration',
      vehicle.firstRegistrationDate ?? '',
    );
    formik.setFieldValue('vehicleCountryCode', 'EE');
  };

  const {
    searchByRegNr: searchVehicle,
    error: vehicleSearchError,
    setError: setVehicleSearchError,
  } = useVehicleSearch({ onVehicleFound: applyVehicleToForm });

  const handleVehicleSearch = () => searchVehicle(formik.values.vehicleRegNr);

  // Per-index (trailers is a dynamic array), so this doesn't fit
  // useVehicleSearch's single-error-flag shape — call the API directly and
  // update the specific trailer entry, same pattern as its other onChange
  // handlers (rebuild the array, formik.setFieldValue('trailers', ...)).
  const handleTrailerSearch = async (index: number) => {
    setTrailerSearchError(null);
    const regNr = formik.values.trailers[index]?.regNr?.trim();
    if (!regNr) {
      setTrailerSearchError(index);
      return;
    }
    try {
      const results = await searchVehicleByRegNr(regNr);
      if (!results.length) {
        setTrailerSearchError(index);
        return;
      }
      const vehicle = results[0];
      const { categoryCode, categoryOther } = mapTrailerCategory(vehicle.categoryCode);
      const updated = [...formik.values.trailers];
      updated[index] = {
        ...updated[index],
        countryCode: 'EE',
        make: vehicle.make ?? '',
        model: vehicle.model ?? '',
        vin: vehicle.vin ?? '',
        bodyType: vehicle.bodyType ?? '',
        categoryCode,
        categoryOther,
        firstRegistration: vehicle.firstRegistrationDate ?? '',
      };
      formik.setFieldValue('trailers', updated);
    } catch {
      setTrailerSearchError(index);
    }
  };

  const handleMtrSearch = async () => {
    setMtrSearchError(false);
    const result = null;
    if (!result) setMtrSearchError(true);
  };

  const buildAvailableForms = (permissions: string[]): ControlForm[] =>
      permissions
          .filter((p) => p.endsWith(WRITE_SUFFIX))
          .map((p) => p.replace(WRITE_SUFFIX, ''))
          .filter((key) => !!FORM_CONFIG[key] && FORM_CONFIG[key].hasParent)
          .map((key) => ({
            labelKey: FORM_CONFIG[key].labelKey,
            route: FORM_CONFIG[key].route,
            hasParent: FORM_CONFIG[key].hasParent,
          }));

  const availableForms = useMemo(
      () => buildAvailableForms(permissions),
      [permissions],
  );

  return {
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
    trailerSearchError,
    setTrailerSearchError,
    mtrSearchError,
    setMtrSearchError,
    handleCompanySearch,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
    triggerConfirm,
    triggerPublish,
    triggerSaveAsSaved,
    availableForms,
  };
}
