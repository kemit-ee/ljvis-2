import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  ChoiceGroup,
  TextArea,
  TextField,
  Text,
  DateField,
} from '@tedi-design-system/react/tedi';
import { toIsoDate } from '../../../../hooks/dateUtils';
import type { ClassifierEntry } from '../../../classifiers/types';
import type {
  TechnicalCheckForm,
  TechnicalCheckVariant,
  PartSummaryStatus,
  PartSeverity,
} from '../../types';
import { useTechnicalCheckForm } from './useTechnicalCheckForm';
import { PartsSummaryTable } from './PartsSummaryTable';
import { DefectsResultsTable } from './DefectsResultsTable';
import { DefectSelectionModal } from './DefectSelectionModal';
import { FileUploadBlock } from '../../components/shared/FileUploadBlock';

interface TechnicalCheckFormFieldsProps {
  variant: TechnicalCheckVariant;
  formik: ReturnType<typeof useTechnicalCheckForm>['formik'];
  parts: ClassifierEntry[];
  defectsByPartKey: Map<number, ClassifierEntry[]>;
  euViolations: ClassifierEntry[];
  applyPartDefects: (
    partCode: string,
    selected: { defectCode: string; severity: PartSeverity }[],
  ) => void;
  setPartStatus: (partCode: string, status: PartSummaryStatus) => void;
  removeDefect: (partCode: string, defectCode: string) => void;
  setResultType: (resultType: string) => void;
  toggleViolation: (code: string, checked: boolean) => void;
  /** Editable up to and including "confirmed" for regular fields; false once published. */
  canEdit: boolean;
  /** True only for an admin (control_form.edit_locked) editing an already-confirmed form. */
  canEditXroadFields: boolean;
  /** True for any admin (control_form.edit_locked), regardless of form status — used
   * for the MSI302 manual-override gate (LJVIS2-72 §4, UC-13), distinct from
   * canEditXroadFields which additionally requires status=confirmed. */
  isEditLocked: boolean;
  xroadBlockVisible: boolean;
}

const RESULT_OPTIONS = [
  'ok',
  'extraordinary_inspection',
  'extraordinary_inspection_ta',
  'driving_ban',
] as const;

const PROCEEDING_TYPES = ['summary', 'expedited', 'general'];

export function TechnicalCheckFormFields({
  variant,
  formik,
  parts,
  defectsByPartKey,
  euViolations,
  applyPartDefects,
  setPartStatus,
  removeDefect,
  setResultType,
  toggleViolation,
  canEdit,
  canEditXroadFields,
  isEditLocked,
  xroadBlockVisible,
}: TechnicalCheckFormFieldsProps) {
  const { t } = useTranslation();
  const [modalPartCode, setModalPartCode] = useState<string | null>(null);

  const values = formik.values as unknown as TechnicalCheckForm & Record<string, unknown>;

  const modalPart = parts.find((p) => p.code === modalPartCode);
  const modalDefects = modalPart ? (defectsByPartKey.get(modalPart.classifierValueKey) ?? []) : [];

  const handlePartStatusChange = (partCode: string, status: PartSummaryStatus) => {
    if (status === 'non_compliant') {
      setModalPartCode(partCode);
    } else {
      setPartStatus(partCode, status);
    }
  };

  // NB: must be an exact match, not .includes() — the "SI" category would
  // otherwise also match "MSI" and "VSI" descriptions (both contain "SI"),
  // duplicating every MSI/VSI violation into the SI group.
  const violationsByCategory = (category: 'MSI' | 'VSI' | 'SI') =>
    euViolations.filter((v) => v.description === category);

  const notesLength = (values.notes ?? '').length;
  const formPath = variant === 'vehicle' ? 'vehicle-technical' : 'trailer-technical';
  const formNumber = values.subFormNumber
    ? `${values.subFormNumber}/${values.version ?? 1}`
    : undefined;

  // Mirrors resultLevel/computeAutoResult in useTechnicalCheckForm.ts: the
  // lowest resultType the form's current defects allow. Options below this
  // floor are disabled (LJVIS2-72 §4) — previously they were silently
  // rejected on click by setResultType, which looked like a broken radio.
  const defectSeverities = (values.partsDefects ?? []).map((d) => d.severity);
  const autoLevel = defectSeverities.includes('EOV') ? 2 : defectSeverities.includes('OV') ? 1 : 0;
  const optionLevel = (opt: string) => (opt === 'driving_ban' ? 2 : opt === 'ok' ? 0 : 1);

  return (
    <div>
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.technical_check.parts.title')}
          </Heading>
          <PartsSummaryTable
            parts={parts}
            partsSummary={values.partsSummary ?? []}
            onStatusChange={handlePartStatusChange}
            disabled={!canEdit}
          />
        </Card.Content>
      </Card>

      <DefectsResultsTable
        parts={parts}
        defectsByPartKey={defectsByPartKey}
        partsDefects={values.partsDefects ?? []}
        onRemove={removeDefect}
        disabled={!canEdit}
      />

      <DefectSelectionModal
        open={modalPartCode !== null}
        onClose={() => setModalPartCode(null)}
        partCode={modalPartCode}
        partName={modalPart ? `${modalPart.code} — ${modalPart.name}` : ''}
        defects={modalDefects}
        existingDefects={(values.partsDefects ?? []).filter((d) => d.partCode === modalPartCode)}
        onConfirm={(selected) => {
          if (modalPartCode) applyPartDefects(modalPartCode, selected);
          setModalPartCode(null);
        }}
      />

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.technical_check.result.title')}
          </Heading>
          <ChoiceGroup
            id="resultType"
            name="resultType"
            label={t('forms.technical_check.result.resultType')}
            inputType="radio"
            direction="row"
            value={values.resultType ?? 'ok'}
            onChange={(val) => canEdit && setResultType(val as string)}
            items={RESULT_OPTIONS.map((opt) => ({
              id: `resultType-${opt}`,
              value: opt,
              label: t(`forms.technical_check.result.options.${opt}`),
              disabled: !canEdit || optionLevel(opt) < autoLevel,
            }))}
            {...(canEdit && autoLevel > 0
              ? {
                  helper: {
                    text: t('forms.technical_check.result.autoLockedHint'),
                    type: 'hint' as const,
                  },
                }
              : {})}
          />

          {values.resultType === 'driving_ban' && (
            <ChoiceGroup
              id="resultTransportInterruption"
              name="resultTransportInterruption"
              label={t('forms.technical_check.result.transportInterruption')}
              inputType="checkbox"
              value={values.resultTransportInterruption ? 'true' : ''}
              onChange={(val) =>
                canEdit &&
                formik.setFieldValue(
                  'resultTransportInterruption',
                  Array.isArray(val) ? val.includes('true') : val === 'true',
                )
              }
              items={[
                {
                  id: 'resultTransportInterruption-item',
                  value: 'true',
                  label: t('forms.technical_check.result.transportInterruption'),
                  disabled: !canEdit,
                },
              ]}
            />
          )}

          {values.resultType === 'extraordinary_inspection_ta' && (
            <div className="mb-1">
              <Text modifiers="bold">{t('forms.technical_check.result.taFieldsTitle')}</Text>
              <ChoiceGroup
                id="taFields"
                name="taFields"
                label={t('forms.technical_check.result.taFieldsTitle')}
                hideLabel
                inputType="checkbox"
                value={[
                  values.eraYvMntRegnr && 'regnr',
                  values.eraYvMntVintin && 'vintin',
                  values.eraYvMntAxles && 'axles',
                  values.eraYvMntPlaces && 'places',
                  values.eraYvMntRebuilt && 'rebuilt',
                ].filter(Boolean) as string[]}
                onChange={(val) => {
                  if (!canEdit) return;
                  const arr = Array.isArray(val) ? val : [];
                  formik.setFieldValue('eraYvMntRegnr', arr.includes('regnr'));
                  formik.setFieldValue('eraYvMntVintin', arr.includes('vintin'));
                  formik.setFieldValue('eraYvMntAxles', arr.includes('axles'));
                  formik.setFieldValue('eraYvMntPlaces', arr.includes('places'));
                  formik.setFieldValue('eraYvMntRebuilt', arr.includes('rebuilt'));
                }}
                items={[
                  { id: 'ta-regnr', value: 'regnr', label: t('forms.technical_check.result.taRegnr'), disabled: !canEdit },
                  { id: 'ta-vintin', value: 'vintin', label: t('forms.technical_check.result.taVintin'), disabled: !canEdit },
                  { id: 'ta-axles', value: 'axles', label: t('forms.technical_check.result.taAxles'), disabled: !canEdit },
                  { id: 'ta-places', value: 'places', label: t('forms.technical_check.result.taPlaces'), disabled: !canEdit },
                  { id: 'ta-rebuilt', value: 'rebuilt', label: t('forms.technical_check.result.taRebuilt'), disabled: !canEdit },
                ]}
              />
            </div>
          )}

          {values.resultType !== 'ok' && (
            <div className="mt-1">
              <ChoiceGroup
                id="proceedingType"
                name="proceedingType"
                label={t('forms.technical_check.result.proceedingType')}
                inputType="radio"
                direction="row"
                value={values.proceedingType ?? ''}
                onChange={(val) => canEdit && formik.setFieldValue('proceedingType', val)}
                items={PROCEEDING_TYPES.map((pt) => ({
                  id: `proceedingType-${pt}`,
                  value: pt,
                  label: t(`forms.technical_check.result.proceedingTypes.${pt}`),
                  disabled: !canEdit,
                }))}
              />
              {values.proceedingType && (
                <TextField
                  id="proceedingReferenceNumber"
                  label={t('forms.technical_check.result.proceedingReferenceNumber')}
                  value={values.proceedingReferenceNumber ?? ''}
                  onChange={(v) => formik.setFieldValue('proceedingReferenceNumber', v)}
                  disabled={!canEdit}
                  helper={
                    formik.errors.proceedingReferenceNumber
                      ? {
                          text: formik.errors.proceedingReferenceNumber as string,
                          type: 'error',
                        }
                      : undefined
                  }
                />
              )}
            </div>
          )}
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h4" className="mb-1">
            {t('forms.technical_check.notes.label')}
          </Heading>
          <TextArea
            id="notes"
            label={t('forms.technical_check.notes.label')}
            hideLabel
            value={values.notes ?? ''}
            input={{ maxLength: 2000 }}
            onChange={(v) => formik.setFieldValue('notes', v)}
            disabled={!canEdit}
            helper={{
              text: t('forms.technical_check.notes.counter', {
                count: notesLength,
                max: 2000,
              }),
              type: notesLength >= 2000 ? 'error' : 'hint',
            }}
          />
        </Card.Content>
      </Card>

      {values.resultType !== 'ok' && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.technical_check.violations.title')}
            </Heading>
            {(['MSI', 'VSI', 'SI'] as const).map((category) => {
              const items = violationsByCategory(category);
              if (items.length === 0) return null;
              return (
                <div key={category} className="mb-1">
                  <ChoiceGroup
                    id={`violations-${category}`}
                    name={`violations-${category}`}
                    label={t(`citizen.compoundDetail.severity.${category}`, category)}
                    inputType="checkbox"
                    value={(values.violations ?? []).filter((c) =>
                      items.some((i) => i.code === c),
                    )}
                    onChange={(val) => {
                      const arr = Array.isArray(val) ? val : [];
                      items.forEach((i) => {
                        const shouldBeChecked = arr.includes(i.code);
                        const isChecked = (values.violations ?? []).includes(i.code);
                        if (shouldBeChecked !== isChecked) {
                          toggleViolation(i.code, shouldBeChecked);
                        }
                      });
                    }}
                    items={items.map((i) => ({
                      id: `violation-${i.code}`,
                      value: i.code,
                      label: `${i.code} — ${i.name}`,
                      disabled:
                        !canEdit ||
                        (i.code === 'MSI302' &&
                          (values.violations ?? []).includes('MSI302') &&
                          !isEditLocked &&
                          values.resultType === 'driving_ban'),
                    }))}
                  />
                </div>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {formNumber && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.shared.files.label')}
            </Heading>
            <FileUploadBlock formPath={formPath} formNumber={formNumber} disabled={!canEdit} />
          </Card.Content>
        </Card>
      )}

      {xroadBlockVisible && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.technical_check.xroad.title')}
            </Heading>
            <DateField
              id="extraordinaryInspectionDate"
              label={t('forms.technical_check.xroad.extraordinaryInspectionDate')}
              selected={
                values.extraordinaryInspectionDate
                  ? new Date(values.extraordinaryInspectionDate)
                  : undefined
              }
              onSelect={(v) => formik.setFieldValue('extraordinaryInspectionDate', toIsoDate(v as Date | undefined))}
              readOnly={!canEditXroadFields}
            />
            <TextArea
              id="enforcementDecision"
              label={t('forms.technical_check.xroad.enforcementDecision')}
              value={values.enforcementDecision ?? ''}
              onChange={(v) => formik.setFieldValue('enforcementDecision', v)}
              disabled={!canEditXroadFields}
            />
            <TextArea
              id="proceedingClosureBasis"
              label={t('forms.technical_check.xroad.proceedingClosureBasis')}
              value={values.proceedingClosureBasis ?? ''}
              onChange={(v) => formik.setFieldValue('proceedingClosureBasis', v)}
              disabled={!canEditXroadFields}
            />
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
