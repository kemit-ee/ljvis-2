import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormikProps } from 'formik';
import {
  Button,
  ChoiceGroup,
  Heading,
  TextField,
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

export const CURATED_LEVEL1_CODES = [
  'REG561_DRIVING_TIME',
  'REG561_BREAKS',
  'REG561_REST_PERIODS',
  'REG561_12DAY_EXCEPTION',
  'REG561_WORK_ORGANISATION',
  'REG165_TACHOGRAPH_USE',
  'REG165_MALFUNCTIONS',
  'DIR200215_MAX_WEEKLY_WORKTIME',
  'DIR200215_BREAKS',
  'DIR200215_NIGHT_WORK',
  'DIR200215_RECORDS',
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

  const curatedClassifiers = useMemo(() => {
    const l1Keys = new Set(
      violationClassifiers
        .filter((c) => c.parentKey === null && CURATED_LEVEL1_CODES.includes(c.code))
        .map((c) => c.classifierValueKey),
    );
    const l2Keys = new Set(
      violationClassifiers
        .filter((c) => c.parentKey !== null && l1Keys.has(c.parentKey))
        .map((c) => c.classifierValueKey),
    );
    return violationClassifiers.filter(
      (c) =>
        l1Keys.has(c.classifierValueKey) ||
        (c.parentKey !== null && l1Keys.has(c.parentKey)) ||
        (c.parentKey !== null && l2Keys.has(c.parentKey)),
    );
  }, [violationClassifiers]);

  const violationsGrouped = formik.values.violations.reduce<
    Record<number, Array<{ entry: ViolationEntry; idx: number }>>
  >((acc, v, idx) => {
    if (!acc[v.level1ValueKey]) acc[v.level1ValueKey] = [];
    acc[v.level1ValueKey].push({ entry: v, idx });
    return acc;
  }, {});

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
              <ChoiceGroup
                id="inspectionType"
                name="inspectionType"
                inputType="radio"
                label={t('forms.labour_inspection.inspectionType')}
                required
                value={formik.values.inspectionType ? [formik.values.inspectionType] : []}
                items={INSPECTION_TYPES.map((it) => ({
                  id: `inspectionType_${it.value}`,
                  label: t(it.labelKey),
                  value: it.value,
                }))}
                onChange={(val) =>
                  formik.setFieldValue(
                    'inspectionType',
                    Array.isArray(val) ? val[0] : val,
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
            </div>
          )}
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.labour_inspection.controlsMatrix.title')}
          </Heading>
          {readOnly ? (
            <div className={gridClass} style={{ marginBottom: '1rem' }}>
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
            <div className={gridClass} style={{ marginBottom: '1rem' }}>
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
          {formik.values.violations.length === 0 ? (
            <Text>{t('common.tableIsEmpty')}</Text>
          ) : (
            Object.entries(violationsGrouped).map(([l1KeyStr, items]) => {
              const l1 = violationClassifiers.find(
                (c) => c.classifierValueKey === Number(l1KeyStr),
              );
              const heading = l1
                ? `${l1.description ? l1.description + ' — ' : ''}${l1.name}`
                : l1KeyStr;
              return (
                <div key={l1KeyStr} className="mb-1">
                  <Heading element="h4" className="mb-0">
                    {heading}
                  </Heading>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>{t('forms.labour_inspection.violations.legalBasis')}</th>
                        <th style={{ padding: '0.5rem' }}>{t('forms.labour_inspection.violations.violationType')}</th>
                        <th style={{ padding: '0.5rem' }}>{t('forms.labour_inspection.violations.violationCode')}</th>
                        <th style={{ padding: '0.5rem' }}>{t('forms.labour_inspection.violations.quantity')}</th>
                        {!readOnly && <th style={{ padding: '0.5rem' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(({ entry: v, idx }) => {
                        const l2 = violationClassifiers.find(
                          (c) => c.classifierValueKey === v.level2ValueKey,
                        );
                        const l3 = v.level3ValueKey
                          ? violationClassifiers.find(
                              (c) => c.classifierValueKey === v.level3ValueKey,
                            )
                          : undefined;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '0.5rem' }}>{l2?.name ?? '-'}</td>
                            <td style={{ padding: '0.5rem' }}>{l2?.name ?? '-'}</td>
                            <td style={{ padding: '0.5rem' }}>{l3?.name ?? '-'}</td>
                            <td style={{ padding: '0.5rem' }}>{v.quantity}</td>
                            {!readOnly && (
                              <td style={{ padding: '0.5rem' }}>
                                <Button
                                  type="button"
                                  visualType="link"
                                  icon="delete"
                                  onClick={() => removeViolation(idx)}
                                >
                                  {t('common.remove')}
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
          {showViolationPicker && (
            <ViolationPickerModal
              violationClassifiers={curatedClassifiers}
              onAdd={addViolation}
              onClose={() => setShowViolationPicker(false)}
            />
          )}
        </Card.Content>
      </Card>
    </>
  );
}
