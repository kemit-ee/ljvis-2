import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type {
  LabourInspectionForm,
  ControlsMatrixRow,
  ViolationEntry,
} from '../../types';
import { saveLabourInspectionForm, confirmLabourInspectionForm } from '../../api';
import { applyValidationError } from '../../../../shared/api/errors';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';

const emptyMatrixRow = (transportClass: string): ControlsMatrixRow => ({
  transportClass,
  analogRecorderDrivers: 0,
  digitalRecorderDrivers: 0,
  smartRecorderDrivers: 0,
  analogRecorderWorkDays: 0,
  digitalRecorderWorkDays: 0,
  smartRecorderWorkDays: 0,
});

export function useLabourInspectionForm(
  form: LabourInspectionForm | undefined,
  onSaved: (id?: string) => void,
  onConfirmed?: () => void,
) {
  const { t } = useTranslation();
  const isEdit = !!form;
  const pendingConfirm = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode } = useClassifiers();

  const transportTypes = useMemo(
    () => getByCode('TRANSPORT_TYPE'),
    [getByCode],
  );

  const violationClassifiers = useMemo(
    () => getByCode('DRIVING_VIOLATION'),
    [getByCode],
  );

  const validationSchema = Yup.object({
    inspectorName: Yup.string().required(
      t('forms.labour_inspection.validation.required'),
    ),
    inspectionDate: Yup.string().required(
      t('forms.labour_inspection.validation.required'),
    ),
    inspectionType: Yup.string().required(
      t('forms.labour_inspection.validation.required'),
    ),
    companyName: Yup.string().required(
      t('forms.labour_inspection.validation.required'),
    ),
    companyRegCode: Yup.string().required(
      t('forms.labour_inspection.validation.required'),
    ),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: form?.id ?? '',
      formNumber: form?.formNumber ?? '',
      inspectorName: form?.inspectorName ?? '',
      inspectionDate: form?.inspectionDate ?? '',
      inspectionType: form?.inspectionType ?? 'passenger',
      companyName: form?.companyName ?? '',
      companyRegCode: form?.companyRegCode ?? '',
      vehicleCount: form?.vehicleCount ?? '',
      totalDriversCount: form?.totalDriversCount ?? '',
      controlsMatrix: form?.controlsMatrix ?? ([] as ControlsMatrixRow[]),
      prescriptionComposed: form?.prescriptionComposed ?? false,
      punishedPersonIdCode: form?.punishedPersonIdCode ?? '',
      punishedPersonFirstName: form?.punishedPersonFirstName ?? '',
      punishedPersonLastName: form?.punishedPersonLastName ?? '',
      proceedingReferenceNumber: form?.proceedingReferenceNumber ?? '',
      violations: form?.violations ?? ([] as ViolationEntry[]),
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const isConfirming = pendingConfirm.current;
        pendingConfirm.current = false;
        const payload = {
          ...values,
          id: form?.id,
          status: isConfirming ? 'confirmed' : 'saved',
          controlsMatrix: JSON.stringify(values.controlsMatrix ?? []),
          violations: JSON.stringify(values.violations ?? []),
          prescriptionComposed: values.prescriptionComposed ? 'true' : 'false',
        } as unknown as LabourInspectionForm;
        const result = isConfirming
          ? await confirmLabourInspectionForm(payload)
          : await saveLabourInspectionForm(payload);
        if (isConfirming && onConfirmed) {
          onConfirmed();
        } else {
          onSaved((result[0] as { id?: string })?.id);
        }
      } catch (e) {
        const handled = applyValidationError(
          e,
          setFieldError,
          (code) => t(`forms.labour_inspection.validation.api.${code}`),
          setFormError,
        );
        if (!handled) {
          console.error('Save failed', e);
        }
      }
    },
  });

  const triggerConfirm = () => {
    pendingConfirm.current = true;
    formik.submitForm();
  };

  const addMatrixRow = (transportClass: string) => {
    const current = formik.values.controlsMatrix ?? [];
    if (current.some((r) => r.transportClass === transportClass)) return;
    formik.setFieldValue('controlsMatrix', [
      ...current,
      emptyMatrixRow(transportClass),
    ]);
  };

  const updateMatrixRow = (index: number, patch: Partial<ControlsMatrixRow>) => {
    const current = [...(formik.values.controlsMatrix ?? [])];
    current[index] = { ...current[index], ...patch };
    formik.setFieldValue('controlsMatrix', current);
  };

  const removeMatrixRow = (index: number) => {
    const current = [...(formik.values.controlsMatrix ?? [])];
    current.splice(index, 1);
    formik.setFieldValue('controlsMatrix', current);
  };

  const addViolation = (violation: ViolationEntry) => {
    formik.setFieldValue('violations', [
      ...(formik.values.violations ?? []),
      violation,
    ]);
  };

  const removeViolation = (index: number) => {
    const current = [...(formik.values.violations ?? [])];
    current.splice(index, 1);
    formik.setFieldValue('violations', current);
  };

  return {
    formik,
    isEdit,
    triggerConfirm,
    transportTypes,
    violationClassifiers,
    addMatrixRow,
    updateMatrixRow,
    removeMatrixRow,
    addViolation,
    removeViolation,
    formError,
  };
}
