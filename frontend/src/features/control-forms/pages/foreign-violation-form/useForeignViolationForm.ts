import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import type { ForeignViolationForm } from '../../../control-forms/types';
import {
  saveForeignViolationForm,
  confirmForeignViolationForm,
  publishForeignViolationForm,
} from '../../api';
import type { Organisation } from '../../../organisations/types';
import { listOrganisations } from '../../../organisations/api';
import { applyValidationError } from '../../../../shared/api/errors';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { toIsoDate, toIsoTime } from '../../../../hooks/dateUtils';
import { getAssociatedPersons } from '../../../xroad/api';
import type { XRoadAssociatedPerson } from '../../../xroad/types';
import { useCompanySearch } from '../../../xroad/hooks/useCompanySearch';

export function useForeignViolationForm(
  form: ForeignViolationForm | undefined,
  onSaved: (id?: string) => void,
  onConfirmed?: () => void,
  onPublished?: () => void,
) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { getByCode } = useClassifiers();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [vehicleSearchError, setVehicleSearchError] = useState(false);
  const [licenceCopyNumberError, setLicenceCopyNumberError] = useState(false);
  const [associatedPersons, setAssociatedPersons] = useState<
    XRoadAssociatedPerson[]
  >([]);
  const [associatedPersonsLoading, setAssociatedPersonsLoading] =
    useState(false);
  const isEdit = !!form;
  const pendingConfirm = useRef(false);
  const pendingPublish = useRef(false);

  const incrementFormNumber = (formNumber: string): string => {
    const match = formNumber.match(/^(.+\/)([0-9]+)$/);
    if (match) {
      return `${match[1]}${parseInt(match[2], 10) + 1}`;
    }
    return `${formNumber}/2`;
  };

  const formNumberString = isEdit && form?.formNumber ? form.formNumber : '';

  useEffect(() => {
    listOrganisations().then(setOrganisations).catch(console.error);
  }, []);

  const validationSchema = Yup.object({
    reportingCountryCode: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    reportingAuthority: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    inspectionDate: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    sanctionCode: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    recommendedMeasureCode: Yup.string().required(
      t('forms.foreign_violation.validation.required'),
    ),
    recommendedMeasureNotes: Yup.string().when('recommendedMeasureCode', {
      is: 'MUU',
      then: (schema) => schema.required(t('users.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    minorViolationsCount: Yup.string().matches(
      /^\d{0,3}$/,
      t('forms.foreign_violation.validation.minorViolationsCount'),
    ),
    dataEntryDate: Yup.string().required(
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
    files: Yup.mixed().test(
      'no-invalid-files',
      t('forms.foreign_violation.filesHelper'),
      (value) => {
        const filesArray = Array.isArray(value)
          ? value
          : JSON.parse(typeof value === 'string' ? value || '[]' : '[]');
        return !filesArray.some(
          (f: { isValid?: boolean }) => f.isValid === false,
        );
      },
    ),
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
      violations: form?.violations ?? [],
      dataEntryDate: form?.dataEntryDate ?? dayjs().format('YYYY-MM-DD'),
      inspectorFirstName: form?.inspectorFirstName ?? authUser?.firstname ?? '',
      inspectorLastName: form?.inspectorLastName ?? authUser?.lastname ?? '',
      inspectorOrganisationId:
        form?.inspectorOrganisationId ?? authUser?.organisationid ?? '',
      inspectorUnit: form?.inspectorUnit ?? authUser?.structuralunit ?? '',
      inspectorProfession:
        form?.inspectorProfession ?? authUser?.jobtitle ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        const isConfirming = pendingConfirm.current;
        const isPublishing = pendingPublish.current;
        pendingConfirm.current = false;
        pendingPublish.current = false;
        const isReconfirmedEdit = !isConfirming && !isPublishing && form?.status === 'confirmed';
        const nextFormNumber = isReconfirmedEdit
          ? incrementFormNumber(formNumberString)
          : formNumberString;
        const trimmedValues = {
          ...values,
          formNumber: nextFormNumber,
          inspectionDate: toIsoDate(values.inspectionDate),
          inspectionTime: toIsoTime(values.inspectionTime),
          dataEntryDate: toIsoDate(values.dataEntryDate),
          vehicleFirstRegistration: toIsoDate(values.vehicleFirstRegistration),
          violations: Array.isArray(values.violations)
            ? JSON.stringify(values.violations)
            : (values.violations ?? '[]'),
        };
        const payload = {
          ...trimmedValues,
          id: form?.id ?? '',
        } as unknown as ForeignViolationForm;
        const result = isConfirming
          ? await confirmForeignViolationForm(payload)
          : form?.id && isPublishing
            ? await publishForeignViolationForm(form.id)
            : await saveForeignViolationForm(payload);
        if (isConfirming && onConfirmed) {
          onConfirmed();
        } else if (isPublishing && onPublished) {
          onPublished();
        } else {
          onSaved(result[0]?.id);
        }
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

  const {
    searchByRegCode,
    searchByName,
    error: companySearchError,
    setError: setCompanySearchError,
    pickerResults: companyPickerResults,
    handleCompanyPicked: onCompanyPicked,
    closePicker: closeCompanyPicker,
  } = useCompanySearch({
    onCompanyFound: (company) => {
      formik.setFieldValue('companyName', company.companyName);
      formik.setFieldValue('companyAddressLine1', company.address);
      formik.setFieldValue('companyCity', company.city);
      formik.setFieldValue('companyPostalCode', company.postalCode);
      if (company.registryCode) {
        formik.setFieldValue('companyCountryCode', 'EE');
      }
      setAssociatedPersons([]);
      setAssociatedPersonsLoading(true);
      getAssociatedPersons(company.registryCode)
        .then(setAssociatedPersons)
        .catch(console.error)
        .finally(() => setAssociatedPersonsLoading(false));
    },
  });

  const handleCompanyRegCodeSearch = () =>
    searchByRegCode(formik.values.companyRegCode);
  const handleCompanyNameSearch = () => searchByName(formik.values.companyName);

  const handleVehicleSearch = async () => {
    setVehicleSearchError(false);
    const result = null;
    if (!result) setVehicleSearchError(true);
  };

  const handleLicenceCopyNumberSearch = async () => {
    setLicenceCopyNumberError(false);
    const result = null;
    if (!result) setLicenceCopyNumberError(true);
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

  const triggerConfirm = () => {
    pendingConfirm.current = true;
    formik.submitForm();
  };

  const triggerPublish = () => {
    pendingPublish.current = true;
    formik.submitForm();
  };

  return {
    formik,
    isEdit,
    triggerConfirm,
    triggerPublish,
    structureUnits,
    orgOptions,
    handleOrgChange,
    handleStructuralUnitChange,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    licenceCopyNumberError,
    setLicenceCopyNumberError,
    handleCompanyRegCodeSearch,
    handleCompanyNameSearch,
    handleVehicleSearch,
    handleLicenceCopyNumberSearch,
    companyPickerResults,
    onCompanyPicked,
    closeCompanyPicker,
    associatedPersons,
    associatedPersonsLoading,
  };
}
