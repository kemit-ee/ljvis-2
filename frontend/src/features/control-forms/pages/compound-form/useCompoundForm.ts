import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { Organisation } from '../../../organisations/types';
import type { StructureUnit } from '../../../structure-units/types';
import type {CompoundForm, Trailer, Driver, ControlForm} from '../../types';
import type { Ehak } from '../../../ehak/types';
import type { Road } from '../../../roads/types';
import type { TrailerCategory } from '../../../trailer-categories/types';
import type { VehicleCategory } from '../../../vehicle-categories/types';
import { listOrganisations } from '../../../organisations/api';
import { listStructureUnits } from '../../../structure-units/api';
import { listEhakCounties, listEhakCitiesParishes } from '../../../ehak/api';
import { listRoads } from '../../../roads/api';
import { listTrailerCategories } from '../../../trailer-categories/api';
import { listVehicleCategories } from '../../../vehicle-categories/api';
import {
  insertCompoundForm,
  updateCompoundForm,
  confirmCompoundForm,
} from '../../api';
import { ApiError } from '../../../../shared/api/client';
import { applyValidationError } from '../../../../shared/api/errors';
import { useAuth } from '../../../auth/AuthContext';
import { toIsoDate, toIsoTime } from '../../../../hooks/dateUtils';
import { OTHER, ROAD } from '../../../../constants/constants.ts';
import { useCompanySearch } from '../../../xroad/hooks/useCompanySearch';
import { FORM_CONFIG } from "../../formRoutes.ts";

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
) {
  const { t } = useTranslation();
  const { user: authUser, permissions } = useAuth();
  const isEdit = !!form;
  const pendingConfirm = useRef(false);

  const WRITE_SUFFIX = '.write';
  const FORM_SP_PREFIX = 'sp_';

  const incrementFormNumber = (formNumber: string): string => {
    const match = formNumber.match(/^(.+\/)([0-9]+)$/);
    if (match) {
      return `${match[1]}${parseInt(match[2], 10) + 1}`;
    }
    return `${formNumber}/2`;
  };

  const formNumberString = isEdit && form?.formNumber ? form.formNumber : '';

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [structureUnits, setStructureUnits] = useState<StructureUnit[]>([]);
  const [counties, setCounties] = useState<Ehak[]>([]);
  const [citiesParishes, setCitiesParishes] = useState<Ehak[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [trailerCategories, setTrailerCategories] = useState<TrailerCategory[]>(
    [],
  );
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>(
    [],
  );
  const [companyCitiesParishes, setCompanyCitiesParishes] = useState<Ehak[]>(
    [],
  );
  const [vehicleSearchError, setVehicleSearchError] = useState(false);
  const [trailerSearchError, setTrailerSearchError] = useState<number | null>(
    null,
  );
  const [mtrSearchError, setMtrSearchError] = useState(false);

  useEffect(() => {
    listOrganisations().then(setOrganisations).catch(console.error);
  }, []);

  useEffect(() => {
    listEhakCounties().then(setCounties).catch(console.error);
  }, []);

  useEffect(() => {
    listRoads().then(setRoads).catch(console.error);
  }, []);

  useEffect(() => {
    listTrailerCategories().then(setTrailerCategories).catch(console.error);
  }, []);

  useEffect(() => {
    listVehicleCategories().then(setVehicleCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (authUser?.organisationid) {
      listStructureUnits(authUser.organisationid)
        .then(setStructureUnits)
        .catch(console.error);
    }
  }, [authUser?.organisationid]);

  useEffect(() => {
    if (form?.county) {
      listEhakCitiesParishes(Number(form.county))
        .then((data) => setCitiesParishes(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [form?.county]);

  useEffect(() => {
    if (form?.companyCounty) {
      listEhakCitiesParishes(Number(form.companyCounty))
        .then((data) =>
          setCompanyCitiesParishes(Array.isArray(data) ? data : []),
        )
        .catch(console.error);
    }
  }, [form?.companyCounty]);

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
    county: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
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
    companyRegCode: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    companyName: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    companyCountryCode: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
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
              this.createError({
                path: `drivers[${index}].firstName`,
                message: req,
              }),
            );
          if (!driver?.lastName)
            errors.push(
              this.createError({
                path: `drivers[${index}].lastName`,
                message: req,
              }),
            );
          if (!driver?.personalCodeForeign)
            errors.push(
              this.createError({
                path: `drivers[${index}].personalCodeForeign`,
                message: req,
              }),
            );
          if (!driver?.birthDate)
            errors.push(
              this.createError({
                path: `drivers[${index}].birthDate`,
                message: req,
              }),
            );
        }
        if (index === 1) {
          if (!driver?.birthDate)
            errors.push(
              this.createError({
                path: `drivers[${index}].birthDate`,
                message: req,
              }),
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
        pendingConfirm.current = false;
        const isReconfirmedEdit = !isConfirming && form?.status === 'confirmed';
        const nextStatus = isConfirming
          ? 'confirmed'
          : isReconfirmedEdit
            ? 'confirmed'
            : 'saved';
        const nextFormNumber = isReconfirmedEdit
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
          if (isConfirming) {
            await confirmCompoundForm(trimmedValues as unknown as CompoundForm);
            onConfirmed?.();
          } else {
            await updateCompoundForm(trimmedValues as unknown as CompoundForm);
            onSaved(values.id);
          }
        } else {
          const result = await insertCompoundForm(
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

  const orgOptions = organisations.map((o) => ({
    label: o.name,
    value: String(o.id),
  }));

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
    listStructureUnits(newOrgId).then(setStructureUnits).catch(console.error);
  };

  const handleCountyChange = (countyId?: number) => {
    setCitiesParishes([]);
    if (countyId) {
      listEhakCitiesParishes(countyId)
        .then((data) => setCitiesParishes(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  };

  const handleCompanyCountyChange = (countyId?: number) => {
    setCompanyCitiesParishes([]);
    if (countyId) {
      listEhakCitiesParishes(countyId)
        .then((data) =>
          setCompanyCitiesParishes(Array.isArray(data) ? data : []),
        )
        .catch(console.error);
    }
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

  const handleVehicleSearch = async () => {
    setVehicleSearchError(false);
    const result = null;
    if (!result) setVehicleSearchError(true);
  };

  const handleTrailerSearch = async (index: number) => {
    setTrailerSearchError(null);
    const result = null;
    if (!result) setTrailerSearchError(index);
  };

  const handleMtrSearch = async () => {
    setMtrSearchError(false);
    const result = null;
    if (!result) setMtrSearchError(true);
  };

  const buildAvailableForms = (permissions: string[]): ControlForm[] =>
      permissions
          .filter((p) => p.startsWith(FORM_SP_PREFIX))
          .map((p) => p.replace(WRITE_SUFFIX, ''))
          .filter((key) => !!FORM_CONFIG[key])
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
    availableForms,
  };
}
