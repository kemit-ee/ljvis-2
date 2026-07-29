import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormikProps } from 'formik';
import {
  Button,
  Heading,
  TextField,
  Select,
  Card,
  Text,
  Checkbox,
  DateField,
} from '@tedi-design-system/react/tedi';
import { toIsoDate } from '../../../../hooks/dateUtils';
import { formatDate } from '../../../../hooks/dateUtils';
import type { ControlsMatrixRow, ViolationEntry } from '../../types';
import type { ClassifierEntry } from '../../../classifiers/types';
import { ControlsMatrixTable } from './ControlsMatrixTable';
import { ViolationPickerModal } from './ViolationPickerModal';

export const INSPECTION_TYPES = [
  { value: 'passenger', labelKey: 'forms.labour_inspection.inspectionTypePassenger' },
  { value: 'cargo', labelKey: 'forms.labour_inspection.inspectionTypeCargo' },
];

interface LabourInspectionFormValues {
  id: string;
  formNumber: string;
  version: number;
  inspectorName: string;
  inspectionDate: string;
  inspectionType: string;
  companyName: string;
  companyRegCode: string;
  vehicleCount: string;
  totalDriversCount: string;
  controlsMatrix: ControlsMatrixRow[];
  prescriptionComposed: boolean;
  punishedPersonIdCode: string;
  punishedPersonFirstName: string;
  punishedPersonLastName: string;
  proceedingReferenceNumber: string;
  violations: ViolationEntry[];
}

interface LabourInspectionFormFieldsProps {
  formik: FormikProps<LabourInspectionFormValues>;
  gridClass: string;
  readOnly: boolean;
  transportTypes: ClassifierEntry[];
  violationClassifiers: ClassifierEntry[];
  addMatrixRow: (transportClass: number) => void;
  updateMatrixRow: (index: number, patch: Partial<ControlsMatrixRow>) => void;
  removeMatrixRow: (index: number) => void;
  addViolation: (violation: ViolationEntry) => void;
  removeViolation: (index: number) => void;
}

export function LabourInspectionFormFields({
  formik,
  gridClass,
  readOnly,
  transportTypes,
  violationClassifiers,
  addMatrixRow,
  updateMatrixRow,
  removeMatrixRow,
  addViolation,
  removeViolation,
}: LabourInspectionFormFieldsProps) {
  const { t } = useTranslation();
  const [showViolationPicker, setShowViolationPicker] = useState(false);

  const violationLabel = (key: number) =>
    violationClassifiers.find((v) => v.classifierValueKey === key)?.name ??
    String(key);

  const inspectionTypeLabel =
    INSPECTION_TYPES.find((it) => it.value === formik.values.inspectionType)
      ?.labelKey ?? '';

  return (
    <>
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.labour_inspection.generalSection')}
          </Heading>
          {readOnly ? (
            <div className={gridClass}>
              <Text>
                <b>{t('forms.labour_inspection.inspectorName')}:</b>{' '}
                {formik.values.inspectorName}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.inspectionDate')}:</b>{' '}
                {formatDate(formik.values.inspectionDate)}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.inspectionType')}:</b>{' '}
                {inspectionTypeLabel ? t(inspectionTypeLabel) : ''}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.companyName')}:</b>{' '}
                {formik.values.companyName}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.companyRegCode')}:</b>{' '}
                {formik.values.companyRegCode}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.vehicleCount')}:</b>{' '}
                {formik.values.vehicleCount}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.totalDriversCount')}:</b>{' '}
                {formik.values.totalDriversCount}
              </Text>
            </div>
          ) : (
            <div className={gridClass}>
              <TextField
                id="inspectorName"
                label={t('forms.labour_inspection.inspectorName')}
                value={formik.values.inspectorName}
                onChange={(v) => formik.setFieldValue('inspectorName', v)}
                required
                input={{ maxLength: 200 }}
                {...(formik.touched.inspectorName && formik.errors.inspectorName
                  ? { helper: { text: formik.errors.inspectorName as string, type: 'error' as const } }
                  : {})}
              />
              <DateField
                id="inspectionDate"
                label={t('forms.labour_inspection.inspectionDate')}
                disableFuture
                required
                selected={
                  formik.values.inspectionDate
                    ? new Date(formik.values.inspectionDate)
                    : undefined
                }
                onSelect={(v) =>
                  formik.setFieldValue('inspectionDate', toIsoDate(v))
                }
                placeholder={t('common.dateFieldPlaceholder')}
                inputProps={
                  formik.touched.inspectionDate && formik.errors.inspectionDate
                    ? {
                        helper: {
                          text: formik.errors.inspectionDate as string,
                          type: 'error' as const,
                        },
                      }
                    : undefined
                }
              />
              <Select
                id="inspectionType"
                label={t('forms.labour_inspection.inspectionType')}
                required
                options={INSPECTION_TYPES.map((it) => ({
                  value: it.value,
                  label: t(it.labelKey),
                }))}
                value={
                  INSPECTION_TYPES.map((it) => ({ value: it.value, label: t(it.labelKey) })).find(
                    (o) => o.value === formik.values.inspectionType,
                  ) ?? null
                }
                onChange={(val) =>
                  formik.setFieldValue(
                    'inspectionType',
                    val && !Array.isArray(val) ? (val as { value: string }).value : '',
                  )
                }
              />
              <TextField
                id="companyName"
                label={t('forms.labour_inspection.companyName')}
                value={formik.values.companyName}
                onChange={(v) => formik.setFieldValue('companyName', v)}
                required
                input={{ maxLength: 300 }}
                {...(formik.touched.companyName && formik.errors.companyName
                  ? { helper: { text: formik.errors.companyName as string, type: 'error' as const } }
                  : {})}
              />
              <TextField
                id="companyRegCode"
                label={t('forms.labour_inspection.companyRegCode')}
                value={formik.values.companyRegCode}
                onChange={(v) => formik.setFieldValue('companyRegCode', v)}
                required
                input={{ maxLength: 20 }}
                {...(formik.touched.companyRegCode && formik.errors.companyRegCode
                  ? { helper: { text: formik.errors.companyRegCode as string, type: 'error' as const } }
                  : {})}
              />
              <TextField
                id="vehicleCount"
                label={t('forms.labour_inspection.vehicleCount')}
                value={formik.values.vehicleCount}
                onChange={(v) =>
                  formik.setFieldValue('vehicleCount', v.replace(/\D/g, ''))
                }
                input={{ maxLength: 5 }}
              />
              <TextField
                id="totalDriversCount"
                label={t('forms.labour_inspection.totalDriversCount')}
                value={formik.values.totalDriversCount}
                onChange={(v) =>
                  formik.setFieldValue('totalDriversCount', v.replace(/\D/g, ''))
                }
                input={{ maxLength: 5 }}
              />
            </div>
          )}
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.labour_inspection.controlsMatrix.title')}
          </Heading>
          <ControlsMatrixTable
            rows={formik.values.controlsMatrix}
            transportTypes={transportTypes}
            readOnly={readOnly}
            onAddRow={addMatrixRow}
            onUpdateRow={updateMatrixRow}
            onRemoveRow={removeMatrixRow}
          />
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.labour_inspection.prescriptionSection')}
          </Heading>
          {readOnly ? (
            <Text>
              {formik.values.prescriptionComposed
                ? t('common.yes')
                : t('common.no')}
            </Text>
          ) : (
            <Checkbox
              id="prescriptionComposed"
              name="prescriptionComposed"
              value="prescriptionComposed"
              label={t('forms.labour_inspection.prescriptionComposed')}
              checked={formik.values.prescriptionComposed}
              onChange={() =>
                formik.setFieldValue(
                  'prescriptionComposed',
                  !formik.values.prescriptionComposed,
                )
              }
            />
          )}
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.labour_inspection.punishmentSection')}
          </Heading>
          {readOnly ? (
            <div className={gridClass}>
              <Text>
                <b>{t('forms.labour_inspection.punishedPersonIdCode')}:</b>{' '}
                {formik.values.punishedPersonIdCode}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.punishedPersonFirstName')}:</b>{' '}
                {formik.values.punishedPersonFirstName}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.punishedPersonLastName')}:</b>{' '}
                {formik.values.punishedPersonLastName}
              </Text>
              <Text>
                <b>{t('forms.labour_inspection.proceedingReferenceNumber')}:</b>{' '}
                {formik.values.proceedingReferenceNumber}
              </Text>
            </div>
          ) : (
            <div className={gridClass}>
              <TextField
                id="punishedPersonIdCode"
                label={t('forms.labour_inspection.punishedPersonIdCode')}
                value={formik.values.punishedPersonIdCode}
                onChange={(v) => formik.setFieldValue('punishedPersonIdCode', v)}
                input={{ maxLength: 20 }}
              />
              <TextField
                id="punishedPersonFirstName"
                label={t('forms.labour_inspection.punishedPersonFirstName')}
                value={formik.values.punishedPersonFirstName}
                onChange={(v) =>
                  formik.setFieldValue('punishedPersonFirstName', v)
                }
                input={{ maxLength: 100 }}
              />
              <TextField
                id="punishedPersonLastName"
                label={t('forms.labour_inspection.punishedPersonLastName')}
                value={formik.values.punishedPersonLastName}
                onChange={(v) =>
                  formik.setFieldValue('punishedPersonLastName', v)
                }
                input={{ maxLength: 100 }}
              />
              <TextField
                id="proceedingReferenceNumber"
                label={t('forms.labour_inspection.proceedingReferenceNumber')}
                value={formik.values.proceedingReferenceNumber}
                onChange={(v) =>
                  formik.setFieldValue('proceedingReferenceNumber', v)
                }
                input={{ maxLength: 50 }}
              />
            </div>
          )}
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            className="mb-1"
          >
            <Heading element="h3">
              {t('forms.labour_inspection.violations.title')}
            </Heading>
            {!readOnly && (
              <Button
                type="button"
                visualType="secondary"
                onClick={() => setShowViolationPicker(true)}
              >
                {t('forms.labour_inspection.violations.add')}
              </Button>
            )}
          </div>
          {formik.values.violations.length === 0 && (
            <Text>{t('common.tableIsEmpty')}</Text>
          )}
          {formik.values.violations.map((v, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <Text>
                {violationLabel(v.level1ValueKey)} / {violationLabel(v.level2ValueKey)}
                {v.level3ValueKey ? ` / ${violationLabel(v.level3ValueKey)}` : ''}
                {` × ${v.quantity}`}
              </Text>
              {!readOnly && (
                <Button
                  type="button"
                  visualType="link"
                  icon="delete"
                  onClick={() => removeViolation(index)}
                >
                  {t('common.remove')}
                </Button>
              )}
            </div>
          ))}
          {showViolationPicker && (
            <ViolationPickerModal
              violationClassifiers={violationClassifiers}
              onAdd={addViolation}
              onClose={() => setShowViolationPicker(false)}
            />
          )}
        </Card.Content>
      </Card>
    </>
  );
}
