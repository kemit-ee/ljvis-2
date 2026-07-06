import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import type { ForeignViolationForm } from '../../../control-forms/types';
import {
  insertForeignViolationForm
} from '../../api';
import type { Organisation } from '../../../organisations/types';
import type { Country } from '../../../countries/types';
import { listOrganisations } from '../../../organisations/api';
import { listCountries } from '../../../countries/api';
import { getSerialNumber } from '../../../control-forms/api';
import { applyValidationError } from '../../../../shared/api/errors';
import { useAuth } from '../../../auth/AuthContext';

export function useForeignViolationForm(
  form: ForeignViolationForm | undefined,
  onSaved: (id?: string) => void,
) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [serialNumber, setSerialNumber] = useState<number>();
  const isEdit = !!form;

  const formNumberString = isEdit && form?.formNumber
    ? form.formNumber
    : serialNumber !== undefined
      ? `vr-${new Date().getFullYear()}-${String(serialNumber).padStart(5, '0')}/1`
      : '';

  useEffect(() => {
    listOrganisations().then(setOrganisations).catch(console.error);
  }, []);

  useEffect(() => {
    listCountries().then(setCountries).catch(console.error);
  }, []);

  useEffect(() => {
    getSerialNumber().then(setSerialNumber).catch(console.error);
  }, []);

  const validationSchema = Yup.object({
    reportingCountryCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
    reportingAuthority: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectionDate: Yup.string().required(t('forms.foreign_violation.validation.required')),
    sanctionCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
    recommendedMeasureCode: Yup.string().required(t('forms.foreign_violation.validation.required')),
    recommendedMeasureNotes: Yup.string().when('recommendedMeasureCode', {
      is: 'MUU',
      then: (schema) => schema.required(t('users.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    minorViolationsCount: Yup.string().matches(/^\d{0,3}$/, t('forms.foreign_violation.validation.minorViolationsCount')),
    dataEntryDate: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorFirstName: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorLastName: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorOrganisationId: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorUnit: Yup.string().required(t('forms.foreign_violation.validation.required')),
    inspectorProfession: Yup.string().required(t('forms.foreign_violation.validation.required'))
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      formNumber: form?.formNumber ?? '',
      reportingCountryCode: form?.reportingCountryCode ?? '',
      reportingAuthority: form?.reportingAuthority ?? '',
      inspectionCountryCode: form?.inspectionCountryCode ?? '',
      inspectionDate: form?.inspectionDate ?? '',
      inspectionTime: form?.inspectionTime ?? '',
      inspectionAddressLine1: form?.inspectionAddressLine1 ?? '',
      inspectionAddressLine2: form?.inspectionAddressLine2 ?? '',
      inspectionRegion: form?.inspectionRegion ?? '',
      inspectionCity: form?.inspectionCity ?? '',
      companyRegCode: form?.companyRegCode ?? '',
      companyName: form?.companyName ?? '',
      companyCountryCode: form?.companyCountryCode ?? '',
      companyAddressLine1: form?.companyAddressLine1 ?? '',
      companyAddressLine2: form?.companyAddressLine2 ?? '',
      companyCity: form?.companyCity ?? '',
      companyPostalCode: form?.companyPostalCode ?? '',
      driverFirstName: form?.driverFirstName ?? '',
      driverLastName: form?.driverLastName ?? '',
      vehicleRegNr: form?.vehicleRegNr ?? '',
      vehicleMake: form?.vehicleMake ?? '',
      vehicleModel: form?.vehicleModel ?? '',
      vehicleCountryCode: form?.vehicleCountryCode ?? '',
      vehicleVin: form?.vehicleVin ?? '',
      vehicleFirstRegistration: form?.vehicleFirstRegistration ?? '',
      vehicleBodyType: form?.vehicleBodyType ?? '',
      licenceCopyNumber: form?.licenceCopyNumber ?? '',
      violationDescription: form?.violationDescription ?? '',
      minorViolationsCount: form?.minorViolationsCount ?? '',
      sanctionCode: form?.sanctionCode ?? 'KORRAS',
      sanctionNotes: form?.sanctionNotes ?? '',
      recommendedMeasureCode: form?.recommendedMeasureCode ?? 'PUUDUVAD',
      recommendedMeasureNotes: form?.recommendedMeasureNotes ?? '',
      recommendedMeasureGeneralNotes: form?.notes ?? '',
      violations: form?.violations ?? '[]',
      dataEntryDate: form?.dataEntryDate ?? dayjs().format('YYYY-MM-DD'),
      inspectorFirstName: form?.inspectorFirstName ?? authUser?.firstname ?? '',
      inspectorLastName: form?.inspectorLastName ?? authUser?.lastname ?? '',
      inspectorOrganisationId: form?.inspectorOrganisationId ?? authUser?.organisationid ?? '',
      inspectorUnit: form?.inspectorUnit ?? authUser?.structuralunit ?? '',
      inspectorProfession: form?.inspectorProfession ?? authUser?.jobtitle ?? '',
      files: form?.files ?? '[]',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        const trimmedValues = {
          ...values,
          status: 'saved',
        };
        const result = await insertForeignViolationForm(trimmedValues);
        onSaved(result[0]?.id);
      } catch (e) {
        if (
          !applyValidationError(e, setFieldError, (code) =>
            t(`foreign_violation.validation.api.${code}`),
          )
        ) {
          console.error('Save failed', e);
        }
      }
    },
  });

  const orgOptions = organisations.map((o) => ({
    label: o.name,
    value: String(o.id),
  }));

  const countryOptions = countries.map((c) => ({
    label: c.name,
    value: c.code,
  }));

  const handleOrgChange = (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => {
    if (val && !Array.isArray(val) && 'value' in val) {
      formik.setFieldValue('inspectorOrganisationId', (val as { value: string }).value);
    } else {
      formik.setFieldValue('inspectorOrganisationId', '');
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

  return {
    formik,
    isEdit,
    formNumberString,
    countryOptions,
    orgOptions,
    handleOrgChange,
    handleStructuralUnitChange
  };
}
