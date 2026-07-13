import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { Organisation } from '../../../organisations/types';
import type { StructureUnit } from '../../../structure-units/types';
import type { CompoundForm, Trailer, Driver } from "../../types";
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
import { insertCompoundForm } from "../../api";
import { useAuth } from '../../../auth/AuthContext';
import { toIsoDate, toIsoTime } from '../../../../hooks/dateUtils';
import {OTHER, ROAD} from "../../../../constants/constants.ts";

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
    ) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [structureUnits, setStructureUnits] = useState<StructureUnit[]>([]);
  const [counties, setCounties] = useState<Ehak[]>([]);
  const [citiesParishes, setCitiesParishes] = useState<Ehak[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [trailerCategories, setTrailerCategories] = useState<TrailerCategory[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [companyCitiesParishes, setCompanyCitiesParishes] = useState<Ehak[]>([]);
  const [companySearchError, setCompanySearchError] = useState(false);
  const [vehicleSearchError, setVehicleSearchError] = useState(false);
  const [trailerSearchError, setTrailerSearchError] = useState<number | null>(null);
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
      listStructureUnits(Number(authUser.organisationid)).then(setStructureUnits).catch(console.error);
    }
  }, [authUser?.organisationid]);

  const validationSchema = Yup.object({
    address: Yup.string()
      .max(300, t('forms.foreign_violation.validation.max_length', { max: 300 })),
    road: Yup.string(),
    road_other: Yup.string().when('road', {
      is: OTHER.ROAD,
      then: (schema) => schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    kilometer: Yup.string().when('road', {
      is: (road: string) => !!road,
      then: (schema) => schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    controlDate: Yup.string().required(t('forms.foreign_violation.validation.required')),
    county: Yup.string().required(t('forms.foreign_violation.validation.required')),
    controlCountryCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
    controlTime: Yup.string().required(t('forms.foreign_violation.validation.required')),
    vehicleRegNr: Yup.string().required(t('forms.foreign_violation.validation.required')),
    vehicleCountryCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
    vehicleCategoryCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
    vehicleCategoryOther: Yup.string()
      .when('vehicleCategoryCode', {
        is: OTHER.VEHICLE_CATEGORY,
        then: (schema) => schema.required(t('forms.foreign_violation.validation.required')),
        otherwise: (schema) => schema.optional(),
      }),
    companyRegCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
    companyName: Yup.string().required(t('forms.foreign_violation.validation.required')),
    companyCountryCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorFirstName: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorLastName: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorOrganisationId: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorProfession: Yup.string().required(t('forms.foreign_violation.validation.required')),
    trailers: Yup.array().of(
      Yup.object({
        regNr: Yup.string().required(t('forms.foreign_violation.validation.required')),
        countryCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
        categoryCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
        categoryOther: Yup.string().when('categoryCode', {
          is: OTHER.TRAILER_CATEGORY,
          then: (schema) => schema.required(t('forms.foreign_violation.validation.required')),
          otherwise: (schema) => schema.optional(),
        }),
      })
    ),
    drivers: Yup.array().test('drivers-validation', '', function (drivers) {
      if (!drivers) return true;
      const req = t('forms.foreign_violation.validation.required');
      const errors: Yup.ValidationError[] = [];
      drivers.forEach((driver: any, index: number) => {
        if (index === 0) {
          if (!driver?.firstName) errors.push(this.createError({ path: `drivers[${index}].firstName`, message: req }));
          if (!driver?.lastName) errors.push(this.createError({ path: `drivers[${index}].lastName`, message: req }));
          if (!driver?.personalCodeForeign) errors.push(this.createError({ path: `drivers[${index}].personalCodeForeign`, message: req }));
        }
        if (index === 1) {
          if (!driver?.birthDate) errors.push(this.createError({path: `drivers[${index}].birthDate`, message: req}));
        }
      });
      if (errors.length > 0) throw new Yup.ValidationError(errors);
      return true;
    }),
  }).test('address-or-road', t('forms.foreign_violation.validation.required'), function (values) {
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
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      formNumber: form?.formNumber ?? '',
      controlCountryCode: 'EE',
      address: '',
      road: '',
      roadOther: '',
      kilometer: '',
      county: '',
      city: '',
      controlDate: '',
      controlTime: '',
      road_type: ROAD.NATIONAL,
      vehicleRegNr: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleCountryCode: '',
      vehicleVin: '',
      vehicleFirstRegistration: '',
      vehicleBodyType: '',
      vehicleCategoryCode: '',
      vehicleCategoryOther: '',
      vehicleMileage: '',
      roadTaxStatus: ROAD.TAX_STATUS_NOT_APPLICABLE,
      roadTaxNotes: '',
      trailers: [] as Trailer[],
      companyRegCode: '',
      companyName: '',
      companyCountryCode: '',
      companyCounty: '',
      companyCity: '',
      companyAddressLine1: '',
      companyPostalCode: '',
      companyOwnerFirstName: '',
      companyOwnerLastName: '',
      companyActivityLicenceCopyNumber: '',
      drivers: [emptyDriver()] as Driver[],
      inspectorFirstName: form?.inspectorFirstName ?? authUser?.firstname ?? '',
      inspectorLastName: form?.inspectorLastName ?? authUser?.lastname ?? '',
      inspectorOrganisationId: form?.inspectorOrganisationId ?? authUser?.organisationid ?? '',
      inspectorUnit: form?.inspectorUnit ?? authUser?.structuralunit ?? '',
      inspectorProfession: form?.inspectorProfession ?? authUser?.jobtitle ?? '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const driver1 = values.drivers[0];
        const driver2 = values.drivers[1];
        const trimmedValues = {
          ...values,
          status: 'saved',
          controlDate: toIsoDate(values.controlDate),
          controlTime: toIsoTime(values.controlTime),
          vehicleFirstRegistration: toIsoDate(values.vehicleFirstRegistration),
          trailers: Array.isArray(values.trailers) ? JSON.stringify(values.trailers) : (values.trailers ?? '[]'),
          drivers: Array.isArray(values.drivers) ? JSON.stringify(values.drivers.map((d) => ({
            ...d,
            firstName: d.firstName?.trim(),
            lastName: d.lastName?.trim(),
            birthDate: toIsoDate(d.birthDate),
          }))) : (values.drivers ?? '[]'),
          driver1PersonalCodeEe: driver1?.personalCodeEe || '',
          driver1PersonalCodeForeign: driver1?.personalCodeForeign || '',
          driver2PersonalCodeEe: driver2?.personalCodeEe || '',
          driver2PersonalCodeForeign: driver2?.personalCodeForeign || '',
        };
        const result = await insertCompoundForm(trimmedValues as unknown as CompoundForm);
        onSaved(result[0]?.id);
      } catch (e) {
        console.error('Save failed', e);
      }
    },
  });

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
    const newOrgId = val && !Array.isArray(val) && 'value' in val ? (val as { value: string }).value : '';
    formik.setFieldValue('inspectorOrganisationId', newOrgId);
    formik.setFieldValue('inspectorUnit', '');
    listStructureUnits(Number(newOrgId)).then(setStructureUnits).catch(console.error);
  };

  const handleCountyChange = (countyId?: number) => {
    setCitiesParishes([]);
    if (countyId) {
      listEhakCitiesParishes(countyId).then((data) => setCitiesParishes(Array.isArray(data) ? data : [])).catch(console.error);
    }
  };

  const handleCompanyCountyChange = (countyId?: number) => {
    setCompanyCitiesParishes([]);
    if (countyId) {
      listEhakCitiesParishes(countyId).then((data) => setCompanyCitiesParishes(Array.isArray(data) ? data : [])).catch(console.error);
    }
  };

  const handleStructuralUnitChange = (
      val:
          | { value: string; label: string | React.ReactNode }
          | readonly { value: string; label: string | React.ReactNode }[]
          | null,
  ) => {
    if (val && !Array.isArray(val) && 'value' in val) {
      formik.setFieldValue(
          'inspectorUnit',
          (val as { value: string }).value,
      );
    } else {
      formik.setFieldValue('inspectorUnit', '');
    }
  };

  const handleCompanySearch = async () => {
    setCompanySearchError(false);
    const result = null;
    if (!result) setCompanySearchError(true);
  };

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
  };
}
