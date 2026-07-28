import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../../auth/AuthContext';
import type {
  DriveRestForm,
  TransportClass,
  CabotageViolation,
  DocumentCheck,
  OtherDocument,
  Violation,
  MassDimensionMeasurement,
} from '../../types';
import { insertDriveRestForm } from '../../api';

export function useDriveRestForm(
  form: DriveRestForm | undefined,
  onSaved: (id?: string) => void,
  type: 'driver' | 'teammate',
  compoundFormKey?: number,
) {
  const { t } = useTranslation();
  const pendingConfirm = useRef(false);

  const { classifierValues } = useAuth();

  const cargoCabotageViolations = useMemo(
    () =>
      classifierValues.filter(
        (v) => v.classifierCode === 'CARGO_CABOTAGE_VIOLATION',
      ),
    [classifierValues],
  );

  const passengerCabotageViolations = useMemo(
    () =>
      classifierValues.filter(
        (v) => v.classifierCode === 'PASSENGER_CABOTAGE_VIOLATION',
      ),
    [classifierValues],
  );

  const transportClasses = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'TRANSPORT_CLASS'),
    [classifierValues],
  );

  const docRightChecks = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'DOC_RIGHT_CHECK'),
    [classifierValues],
  );

  const docRightOtherDocs = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'OTHER_DOCUMENTS'),
    [classifierValues],
  );

  const tachographTypes = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'TACHOGRAPH_TYPES'),
    [classifierValues],
  );

  const drivingViolations = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'DRIVING_VIOLATION'),
    [classifierValues],
  );

  const massDimensions = useMemo(
    () => classifierValues.filter((v) => v.classifierCode === 'MASS_DIMENSION'),
    [classifierValues],
  );

  const validationSchema = Yup.object({
    transportType: Yup.string().required(
      t('forms.sp_form.validation.required'),
    ),
    resultType: Yup.string().required(
      t('forms.sp_form.validation.required'),
    ),
    proceedingReferenceNumber: Yup.string().when('proceedingType', {
      is: (proceedingType: string) => proceedingType !== undefined,
      then: (schema) =>
        schema.required(t('forms.sp_form.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    atpViolationDescription: Yup.string().when('atpViolationFound', {
      is: 'Jah',
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

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      compoundFormKey: form?.compoundFormKey ?? compoundFormKey,
      subFormNumber: form?.subFormNumber ?? '',
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
      atpViolationFound: form?.atpViolationFound ?? '',
      atpViolationDescription: form?.atpViolationDescription ?? '',
      erruPoints: (Array.isArray(form?.erruPoints)
        ? form.erruPoints
        : typeof form?.erruPoints === 'string'
          ? JSON.parse(form.erruPoints)
          : []) as string[],
      files: (Array.isArray(form?.files)
        ? form.files
        : typeof form?.files === 'string'
          ? JSON.parse(form.files)
          : []) as string[],
      enforcementDecision: form?.enforcementDecision ?? '',
      proceedingClosureBasis: form?.proceedingClosureBasis ?? '',
      notes: form?.notes ?? '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!formik.isValid) {
        return;
      }
      try {
        const isConfirming = pendingConfirm.current;
        pendingConfirm.current = false;
        const nextStatus = isConfirming ? 'confirmed' : 'saved';

        const filteredOtherDocuments = Array.isArray(values.otherDocuments)
          ? (values.otherDocuments as OtherDocument[]).filter(
              (doc) => doc.result === 'NOUETEKOHANE' || doc.result === 'PUUDUB'
            )
          : [];

        const trimmedValues = {
          ...values,
          status: nextStatus,
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
          massDimensionMeasurements: Array.isArray(
            values.massDimensionMeasurements,
          )
            ? JSON.stringify(values.massDimensionMeasurements)
            : (values.massDimensionMeasurements ?? '[]'),
          erruPoints: Array.isArray(values.erruPoints)
            ? JSON.stringify(values.erruPoints)
            : (values.erruPoints ?? '[]'),
          files: Array.isArray(values.files)
            ? JSON.stringify(values.files)
            : (values.files ?? '[]'),
        };

        if (values.id) {
          // if (isConfirming) {
          //   await confirmDriveRestForm(trimmedValues as unknown as DriveRestForm);
          //   onConfirmed?.();
          // } else {
          //   await updateDriveRestForm(trimmedValues as unknown as DriveRestForm);
          //   onSaved(values.id);
          // }
        } else {
          const result = await insertDriveRestForm(
            type,
            trimmedValues as unknown as DriveRestForm,
          );
          onSaved(result[0]?.id);
        }

        console.log('Form submitted:', trimmedValues);
        onSaved(values.id);
      } catch (e) {
        console.error('Save failed', e);
      }
    },
  });

  const triggerConfirm = () => {
    pendingConfirm.current = true;
    formik.submitForm();
  };

  return {
    formik,
    cargoCabotageViolations,
    passengerCabotageViolations,
    transportClasses,
    docRightChecks,
    docRightOtherDocs,
    tachographTypes,
    drivingViolations,
    massDimensions,
    triggerConfirm,
  };
}
