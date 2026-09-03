import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import type {
  DriveRestForm,
  TransportClass,
  CabotageViolation,
  DocumentCheck,
  OtherDocument,
  Violation,
  MassDimensionMeasurement,
} from '../../types';
import {
  saveDriveRestForm,
  confirmDriveRestForm,
  publishDriveRestForm,
  saveTramDriverForm,
  confirmTramDriverForm,
  publishTramDriverForm,
} from '../../api';

export type FormAuthority = 'PPA' | 'TRAM';

export function createDriveRestValidationSchema(
  t: (key: string) => string,
) {
  return Yup.object({
    transportType: Yup.string().required(
      t('forms.sp_form.validation.required'),
    ),
    resultType: Yup.string().required(
      t('forms.sp_form.validation.required'),
    ),
    proceedingReferenceNumber: Yup.string().when('proceedingType', {
      // Üldmenetlusel (YLD) on väli "Väärteoasja number" ja see ei ole kohustuslik.
      is: (proceedingType: string) => !!proceedingType && proceedingType !== 'YLD',
      then: (schema) =>
        schema.required(t('forms.sp_form.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    atpViolationDescription: Yup.string().when('atpViolationFound', {
      is: 'true',
      then: (schema) =>
        schema.required(t('forms.sp_form.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    checkedDaysCount: Yup.string(),
    workDaysCount: Yup.string().test(
      'workDaysCountMax',
      t('forms.sp_form.validation.workDaysCountMax'),
      function (value) {
        if (!value) return true;
        const workDays = parseInt(value, 10);
        const checkedDays = parseInt(this.parent.checkedDaysCount || '', 10);
        if (isNaN(checkedDays)) return false;
        return workDays <= checkedDays;
      },
    ),
  });
}

export function serializeDriveRestFormValues(
  values: Partial<DriveRestForm> & Record<string, unknown>,
  status: string,
) {
  const filteredOtherDocuments = Array.isArray(values.otherDocuments)
    ? (values.otherDocuments as OtherDocument[]).filter(
        (doc) => doc.result === 'NOUETEKOHANE' || doc.result === 'PUUDUB'
      )
    : [];

  return {
    ...values,
    status,
    transportClasses: Array.isArray(values.transportClasses)
      ? JSON.stringify(values.transportClasses)
      : (values.transportClasses ?? '[]'),
    cabotageViolations: Array.isArray(values.cabotageViolations)
      ? JSON.stringify(values.cabotageViolations)
      : (values.cabotageViolations ?? '[]'),
    documentChecks: Array.isArray(values.documentChecks)
      ? JSON.stringify(
          (values.documentChecks as DocumentCheck[]).map((e) => ({
            documentCode: e.documentCode || e.level2Code,
            documentName: e.documentName || e.level2Name,
            severityCode: e.severityCode || e.level3Name,
            violationCode: e.violationCode || e.level3Code,
          })),
        )
      : (values.documentChecks ?? '[]'),
    otherDocuments: JSON.stringify(filteredOtherDocuments),
    violations5612006: Array.isArray(values.violations5612006)
      ? JSON.stringify(values.violations5612006)
      : (values.violations5612006 ?? '[]'),
    violations1652014: Array.isArray(values.violations1652014)
      ? JSON.stringify(values.violations1652014)
      : (values.violations1652014 ?? '[]'),
    violations200215: Array.isArray(values.violations200215)
      ? JSON.stringify(values.violations200215)
      : (values.violations200215 ?? '[]'),
    violations5932008: Array.isArray(values.violations5932008)
      ? JSON.stringify(values.violations5932008)
      : (values.violations5932008 ?? '[]'),
    violations20201057: Array.isArray(values.violations20201057)
      ? JSON.stringify(values.violations20201057)
      : (values.violations20201057 ?? '[]'),
    massDimensionMeasurements: Array.isArray(values.massDimensionMeasurements)
      ? JSON.stringify(values.massDimensionMeasurements)
      : (values.massDimensionMeasurements ?? '[]'),
    erruPoints: Array.isArray(values.erruPoints)
      ? JSON.stringify(values.erruPoints)
      : (values.erruPoints ?? '[]'),
  };
}

export function useDriveRestForm(
  form: DriveRestForm | undefined,
  onSaved: (id?: string) => void,
  type: 'driver' | 'teammate',
  compoundFormKey?: number,
  onPublished?: () => void,
  authority: FormAuthority = 'PPA',
) {
  const { t } = useTranslation();

  // TRAM driver sub-form hits its own guarded endpoints; everything else
  // (fields, validation, serialization) is identical to the PPA driver form.
  const api =
    authority === 'TRAM'
      ? {
          save: (_scope: 'driver' | 'teammate', data: DriveRestForm) =>
            saveTramDriverForm(data),
          confirm: (_scope: 'driver' | 'teammate', data: DriveRestForm) =>
            confirmTramDriverForm(data),
          publish: (_scope: 'driver' | 'teammate', id: string) =>
            publishTramDriverForm(id),
        }
      : {
          save: saveDriveRestForm,
          confirm: confirmDriveRestForm,
          publish: publishDriveRestForm,
        };
  const pendingConfirm = useRef(false);
  const pendingPublish = useRef(false);
  const pendingCompoundFormKey = useRef<number | undefined>(undefined);

  const { getByCode } = useClassifiers();

  const cargoCabotageViolations = useMemo(
    () => getByCode('CARGO_CABOTAGE_VIOLATION').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const passengerCabotageViolations = useMemo(
    () => getByCode('PASSENGER_CABOTAGE_VIOLATION').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const transportClasses = useMemo(
    () => getByCode('TRANSPORT_CLASS').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const docRightChecks = useMemo(
    () => getByCode('DOC_RIGHT_CHECK').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const docRightOtherDocs = useMemo(
    () => getByCode('OTHER_DOCUMENTS').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const tachographTypes = useMemo(
    () => getByCode('TACHOGRAPH_TYPES').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const drivingViolations = useMemo(
    () => getByCode('DRIVING_VIOLATION').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const massDimensions = useMemo(
    () => getByCode('MASS_DIMENSION').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const validationSchema = createDriveRestValidationSchema(t);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      compoundFormKey: form?.compoundFormKey,
      subFormNumber: form?.subFormNumber ?? '',
      version: form?.version ?? 1,
      status: form?.status ?? 'saved',
      selectionStatus: form?.selectionStatus ?? 'active',
      transportType: form?.transportType ?? '',
      transportEmptyRun: form?.transportEmptyRun ?? false,
      transportNature: form?.transportNature ?? '',
      transportNatureExempt: form?.transportNatureExempt ?? false,
      transportClasses: (Array.isArray(form?.transportClasses)
        ? form.transportClasses
        : typeof form?.transportClasses === 'string'
          ? JSON.parse(form.transportClasses)
          : []) as TransportClass[],
      cabotageViolations: (Array.isArray(form?.cabotageViolations)
        ? form.cabotageViolations
        : typeof form?.cabotageViolations === 'string'
          ? JSON.parse(form.cabotageViolations)
          : []) as CabotageViolation[],
      resultType: form?.resultType ?? '',
      additionalMeasure: form?.additionalMeasure ?? '',
      proceedingType: form?.proceedingType ?? '',
      proceedingReferenceNumber: form?.proceedingReferenceNumber ?? '',
      documentChecks: (Array.isArray(form?.documentChecks)
        ? form.documentChecks
        : typeof form?.documentChecks === 'string'
          ? JSON.parse(form.documentChecks)
          : []) as DocumentCheck[],
      otherDocuments: (Array.isArray(form?.otherDocuments)
        ? form.otherDocuments
        : typeof form?.otherDocuments === 'string'
          ? JSON.parse(form.otherDocuments)
          : []) as OtherDocument[],
      spApplicability: form?.spApplicability ?? '',
      tachographTypeCode: form?.tachographTypeCode ?? '',
      tachographDataNotDownloaded: form?.tachographDataNotDownloaded ?? false,
      checkedDaysCount: form?.checkedDaysCount ?? '',
      workDaysCount: form?.workDaysCount ?? '',
      otherActivityDaysCount: form?.otherActivityDaysCount ?? '',
      violations5612006: (Array.isArray(form?.violations5612006)
        ? form.violations5612006
        : typeof form?.violations5612006 === 'string'
          ? JSON.parse(form.violations5612006)
          : []) as Violation[],
      violations1652014: (Array.isArray(form?.violations1652014)
        ? form.violations1652014
        : typeof form?.violations1652014 === 'string'
          ? JSON.parse(form.violations1652014)
          : []) as Violation[],
      violations200215: (Array.isArray(form?.violations200215)
        ? form.violations200215
        : typeof form?.violations200215 === 'string'
          ? JSON.parse(form.violations200215)
          : []) as Violation[],
      violations5932008: (Array.isArray(form?.violations5932008)
        ? form.violations5932008
        : typeof form?.violations5932008 === 'string'
          ? JSON.parse(form.violations5932008)
          : []) as Violation[],
      violations20201057: (Array.isArray(form?.violations20201057)
        ? form.violations20201057
        : typeof form?.violations20201057 === 'string'
          ? JSON.parse(form.violations20201057)
          : []) as Violation[],
      massDimensionNonCompliant: form?.massDimensionNonCompliant ?? false,
      massDimensionMeasurements: (Array.isArray(form?.massDimensionMeasurements)
        ? form.massDimensionMeasurements
        : typeof form?.massDimensionMeasurements === 'string'
          ? JSON.parse(form.massDimensionMeasurements)
          : []) as MassDimensionMeasurement[],
      atpViolationFound: String(form?.atpViolationFound),
      atpViolationDescription: form?.atpViolationDescription ?? '',
      erruPoints: (Array.isArray(form?.erruPoints)
        ? form.erruPoints
        : typeof form?.erruPoints === 'string'
          ? JSON.parse(form.erruPoints)
          : []) as string[],
      enforcementDecision: form?.enforcementDecision ?? '',
      proceedingClosureBasis: form?.proceedingClosureBasis ?? '',
      notes: form?.notes ?? '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const isConfirming = pendingConfirm.current;
        const isPublishing = pendingPublish.current;
        pendingConfirm.current = false;
        pendingPublish.current = false;
        if (isPublishing && form?.id) {
          await api.publish(type, form.id);
          onPublished?.();
          return;
        }
        const isReconfirmedEdit = !isConfirming && form?.status === 'confirmed';
        const nextStatus =
          isConfirming || isReconfirmedEdit ? 'confirmed' : 'saved';

        const overrideKey = pendingCompoundFormKey.current;
        pendingCompoundFormKey.current = undefined;

        const trimmedValues = {
          ...serializeDriveRestFormValues(values, nextStatus),
          compoundFormKey: overrideKey ?? values.compoundFormKey,
        };

        const result = isConfirming
          ? await api.confirm(type, trimmedValues as unknown as DriveRestForm)
          : await api.save(type, trimmedValues as unknown as DriveRestForm);
        onSaved(result[0]?.id);
      } catch (e) {
        console.error('Save failed', e);
      }
    },
  });

  // Sync compoundFormKey via setFieldValue instead of initialValues, so
  // saving the general form (which assigns compoundFormKey afterwards)
  // doesn't trigger enableReinitialize and wipe out the already-filled sub-form
  useEffect(() => {
    if (compoundFormKey !== undefined) {
      formik.setFieldValue('compoundFormKey', compoundFormKey);
    }
  }, [compoundFormKey]);

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
    pendingCompoundFormKey,
    cargoCabotageViolations,
    passengerCabotageViolations,
    transportClasses,
    docRightChecks,
    docRightOtherDocs,
    tachographTypes,
    drivingViolations,
    massDimensions,
    triggerConfirm,
    triggerPublish,
  };
}
