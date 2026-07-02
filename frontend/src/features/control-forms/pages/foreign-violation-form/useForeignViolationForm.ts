import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { User } from '../../../users/types';
import {
  insertForeignViolationForm
} from '../../api';
import type { Organisation } from '../../../organisations/types';
import type { Country } from '../../../countries/types';
import { listOrganisations } from '../../../organisations/api';
import { listCountries } from '../../../countries/api';
import { applyValidationError } from '../../../../shared/api/errors';
import { toIsoDate } from '../../../../hooks/dateUtils';
import { useAuth } from '../../../auth/AuthContext';

export function useForeignViolationForm(
  user: User | undefined,
  onSaved: (id?: string) => void,
) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const isEdit = !!user;

  useEffect(() => {
    listOrganisations().then(setOrganisations).catch(console.error);
  }, []);

  useEffect(() => {
    listCountries().then(setCountries).catch(console.error);
  }, []);

  const validationSchema = Yup.object({
    firstName: Yup.string().required(t('users.validation.required')),
    lastName: Yup.string().required(t('users.validation.required')),
    personalCode: Yup.string()
      .required(t('users.validation.required')),
    organisationId: Yup.string().required(t('users.validation.required')),
    structuralUnitName: Yup.string().required(t('users.validation.required')),
    jobTitleName: Yup.string().required(t('users.validation.required')),
    email: Yup.string()
      .required(t('users.validation.required'))
      .test('email-format', t('users.validation.email'), (value) => {
        if (!value) return true;
        if (value.indexOf('@') < 1) return false;
        if (value.indexOf('.', value.indexOf('@')) < value.indexOf('@') + 2)
          return false;
        return value.lastIndexOf('.') < value.length - 2;
      }),
    phone: Yup.string().matches(/^[+\d\s]*$/, t('users.validation.phone')),
    accessStart: Yup.string().required(t('users.validation.required')),
    accessEnd: isEdit
      ? Yup.string().nullable()
      : Yup.string()
          .nullable()
          .test(
            'is-after-start',
            t('users.validation.endBeforeStart'),
            function (value) {
              const { accessStart } = this.parent;
              if (!value || value === null || !accessStart) return true;
              return new Date(value) > new Date(accessStart);
            },
          ),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      personalCode: user?.personalCode ?? '',
      organisationId: user?.organisationId ?? '',
      structuralUnitName: user?.structuralUnitName ?? '',
      jobTitleName: user?.jobTitleName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      accessStart: user?.accessStart ?? '',
      accessEnd: user?.accessEnd ?? '',
      reportingCountry: '',
      inspectionCountry: '',
      inspectionTime: '',
      companyCountry: '',
      vehicleCountry: '',
      dataEntryDate: '',
      inspectorFirstName: authUser?.firstname ?? '',
      inspectorLastName: authUser?.lastname ?? '',
      inspectorOrganisationId: authUser?.organisationid ?? '',
      inspectorStructuralUnitName: authUser?.structuralunit ?? '',
      inspectorJobTitleName: authUser?.jobtitle ?? ''
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        const trimmedValues = {
          ...values,
          phone: values.phone.trim(),
          accessStart: toIsoDate(values.accessStart),
          accessEnd: toIsoDate(values.accessEnd),
          status: 'saved',
        };
        const result = await insertForeignViolationForm(trimmedValues);
        onSaved(result[0]?.id);
      } catch (e) {
        if (
          !applyValidationError(e, setFieldError, (code) =>
            t(`users.validation.api.${code}`),
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
      formik.setFieldValue('organisationId', (val as { value: string }).value);
    } else {
      formik.setFieldValue('organisationId', '');
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
        'structuralUnitName',
        (val as { value: string }).value,
      );
    } else {
      formik.setFieldValue('structuralUnitName', '');
    }
  };

  return {
    formik,
    isEdit,
    countryOptions,
    orgOptions,
    handleOrgChange,
    handleStructuralUnitChange
  };
}
