import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { Organisation } from '../../../organisations/types';
import type { StructureUnit } from '../../../structure-units/types';
import type { CompoundForm } from "../../types";
import type { Ehak } from '../../../ehak/types';
import { listOrganisations } from '../../../organisations/api';
import { listStructureUnits } from '../../../structure-units/api';
import { listEhakCounties, listEhakCitiesParishes } from '../../../ehak/api';
import { insertCompoundForm } from "../../api";
import { useAuth } from '../../../auth/AuthContext';
import { toIsoDate, toIsoTime } from '../../../../hooks/dateUtils';

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
    if (authUser?.organisationid) {
      listStructureUnits(Number(authUser.organisationid)).then(setStructureUnits).catch(console.error);
    }
  }, [authUser?.organisationid]);

  const validationSchema = Yup.object({
    controlDate: Yup.string().required(t('forms.foreign_violation.validation.required')),
    road_other: Yup.string().when('road', {
      is: 'MUU TEE',
      then: (schema) => schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    kilometer: Yup.string().when('road', {
      is: (road: string) => !!road,
      then: (schema) => schema.required(t('forms.foreign_violation.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
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
      road_type: 'Riigimaantee',
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
      roadTaxStatus: 'Ei kohaldu',
      roadTaxNotes: '',
      trailers: '[]',
      trailerRegNr: '',
      trailerCountryCode: '',
      trailerVin: '',
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
      driverPersonalCodeEe: '',
      driverFirstName: '',
      driverLastName: '',
      driverCitizenshipCode: '',
      driverPersonalCodeForeign: '',
      driverBirthDate: '',
      driverLicenceNr: '',
      driverLicenceCountryCode: '',
      driver2FirstName: '',
      driver2LastName: '',
      driver2BirthDate: '',
      driver2LicenceNr: '',
      driver2LicenceCountryCode: '',
      drivers: '[]',
      inspectorFirstName: form?.inspectorFirstName ?? authUser?.firstname ?? '',
      inspectorLastName: form?.inspectorLastName ?? authUser?.lastname ?? '',
      inspectorOrganisationId: form?.inspectorOrganisationId ?? authUser?.organisationid ?? '',
      inspectorUnit: form?.inspectorUnit ?? authUser?.structuralunit ?? '',
      inspectorProfession: form?.inspectorProfession ?? authUser?.jobtitle ?? '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const trimmedValues = {
          ...values,
          controlDate: toIsoDate(values.controlDate),
          controlTime: toIsoTime(values.controlTime),
          vehicleFirstRegistration: toIsoDate(values.vehicleFirstRegistration),
          driverBirthDate: toIsoDate(values.driverBirthDate),
          driver2BirthDate: toIsoDate(values.driver2BirthDate),
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
