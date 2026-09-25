import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  ChoiceGroup,
  TextArea,
  TextField,
  Text,
  Alert,
} from '@tedi-design-system/react/tedi';
import { MaskedDateField } from '../../components/shared/MaskedDateField';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { Trailer } from '../../types';
import type {
  TechnicalCheckForm,
  TechnicalCheckVariant,
  PartSeverity,
} from '../../types';
import { useTechnicalCheckForm, AUTO_RESULT_EXCLUDED_PARTS } from './useTechnicalCheckForm';
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
  setPartChecked: (partCode: string, checked: boolean) => void;
  removeDefect: (partCode: string, defectCode: string) => void;
  setResultType: (resultType: string) => void;
  toggleViolation: (code: string, checked: boolean) => void;
  /** Editable up to and including "confirmed" for regular fields; false once published. */
  canEdit: boolean;
  isDesktop: boolean;
  /** Trailers from the parent compound form — used to populate the trailer reg-nr selector. */
  compoundTrailers?: Trailer[];
  /** Index of this trailer's tab within compoundTrailers — drives the live reg-nr display. */
  trailerIndex?: number;
  checkError?: string | null;
  onCheckErrorClose?: () => void;
  validationTriggered?: boolean;
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
  setPartChecked,
  removeDefect,
  setResultType,
  toggleViolation,
  canEdit,
  isDesktop,
  compoundTrailers,
  trailerIndex,
  checkError,
  onCheckErrorClose,
  validationTriggered,
}: TechnicalCheckFormFieldsProps) {
  const { t } = useTranslation();
  const [modalPartCode, setModalPartCode] = useState<string | null>(null);

  const values = formik.values as unknown as TechnicalCheckForm & Record<string, unknown>;

  const modalPart = parts.find((p) => p.code === modalPartCode);
  const modalDefects = modalPart ? (defectsByPartKey.get(modalPart.classifierValueKey) ?? []) : [];

  const handleDefectToggle = (partCode: string, hasDefect: boolean) => {
    if (hasDefect) {
      // Turning "Ei vasta nõuetele" on (or re-clicking "muuda rikkeid") opens
      // the picker; applyPartDefects runs on confirm.
      setModalPartCode(partCode);
    } else {
      // Turning it off clears all of this part's defects directly — the
      // modal itself requires at least one selection, so it can't be used
      // for that. "Kontrollitud" is left as-is (LJVIS2-72 15 ettepanekut p2).
      applyPartDefects(partCode, []);
    }
  };

  // NB: must be an exact match, not .includes() — the "SI" category would
  // otherwise also match "MSI" and "VSI" descriptions (both contain "SI"),
  // duplicating every MSI/VSI violation into the SI group.
  const violationsByCategory = (category: 'MSI' | 'VSI' | 'SI') =>
    euViolations.filter((v) => v.description === category);

  const notesLength = (values.notes ?? '').length;
  // Every open compound-form tab (vehicle + each trailer) mounts its own
  // TechnicalCheckFormFields at once — Tabs.Content only toggles CSS
  // display, it doesn't unmount inactive tabs. Static ids/names would
  // therefore collide across tabs; a duplicate DOM id makes the design
  // system's <label htmlFor> resolve to the FIRST matching element in the
  // document (the vehicle tab, mounted before any trailer tab), so ticking
  // a checkbox on the trailer tab was silently toggling the vehicle tab's
  // checkbox instead. Scope every id/name by variant + trailer index.
  const idPrefix = `${variant}${trailerIndex !== undefined ? `-${trailerIndex}` : ''}`;
  const formPath = variant === 'vehicle' ? 'vehicle-technical' : 'trailer-technical';
  const formNumber = values.subFormNumber
    ? `${values.subFormNumber}/${values.version ?? 1}`
    : undefined;

  // Mirrors resultLevel/computeAutoResult in useTechnicalCheckForm.ts: the
  // lowest resultType the form's current defects allow. Options below this
  // floor are disabled (LJVIS2-72 §4) — previously they were silently
  // rejected on click by setResultType, which looked like a broken radio.
  const defectSeverities = (values.partsDefects ?? [])
    .filter((d) => !AUTO_RESULT_EXCLUDED_PARTS.includes(d.partCode))
    .map((d) => d.severity);
  const autoLevel = defectSeverities.includes('EOV') ? 2 : defectSeverities.includes('OV') ? 1 : 0;
  const optionLevel = (opt: string) =>
    opt === 'driving_ban' ? 2 : opt === 'ok' ? 0 : 1;

  return (
    <div>
      {variant === 'trailer' && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.technical_check.trailerDetection')}
            </Heading>
            <div
              className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}
            >
              <TextField
                id={`${idPrefix}-trailerRegNr`}
                label={t('forms.technical_check.trailerRegNr')}
                value={
                  (trailerIndex !== undefined
                    ? compoundTrailers?.[trailerIndex]?.regNr
                    : undefined) ??
                  values.trailerRegNr ??
                  ''
                }
                disabled
                onChange={() => undefined}
              />
            </div>
          </Card.Content>
        </Card>
      )}

      {(checkError || (validationTriggered && formik.errors.partsSummary)) && (
        <Alert
          type="danger"
          size="small"
          className="mb-1"
          onClose={onCheckErrorClose}
        >
          {t('forms.technical_check.validation.checkError')}
        </Alert>
      )}
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.technical_check.parts.title')}
          </Heading>
          <PartsSummaryTable
            parts={parts}
            partsSummary={values.partsSummary ?? []}
            onCheckedChange={setPartChecked}
            onDefectToggle={handleDefectToggle}
            disabled={!canEdit}
            partsDefects={values.partsDefects ?? []}
            defectsByPartKey={defectsByPartKey}
            onRemoveDefect={removeDefect}
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
        partName={
          modalPart
            ? `${modalPart.code.replace(/^[A-Z]+_/, '')} \u2014 ${modalPart.name}`
            : ''
        }
        defects={modalDefects}
        existingDefects={(values.partsDefects ?? []).filter(
          (d) => d.partCode === modalPartCode,
        )}
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
            id={`${idPrefix}-resultType`}
            name={`${idPrefix}-resultType`}
            label={t('forms.technical_check.result.resultType')}
            inputType="radio"
            direction="row"
            value={
              // "Muu meede" is an independent flag, not a resultType value —
              // while it's on and resultType is still the (unescalated) 'ok'
              // default, show no radio option as selected.
              values.otherMeasure && (values.resultType ?? 'ok') === 'ok'
                ? ''
                : (values.resultType ?? 'ok')
            }
            onChange={(val) => {
              if (!canEdit) return;
              setResultType(val as string);
              if (val === 'ok') formik.setFieldValue('otherMeasure', false);
            }}
            items={RESULT_OPTIONS.map((opt) => ({
              id: `${idPrefix}-resultType-${opt}`,
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

          <div className="mt-1">
            <ChoiceGroup
              id={`${idPrefix}-otherMeasure`}
              name={`${idPrefix}-otherMeasure`}
              label={t('forms.technical_check.result.otherMeasure')}
              hideLabel
              inputType="checkbox"
              value={values.otherMeasure ? ['true'] : []}
              onChange={(val) =>
                canEdit &&
                formik.setFieldValue(
                  'otherMeasure',
                  Array.isArray(val) ? val.includes('true') : val === 'true',
                )
              }
              items={[
                {
                  id: `${idPrefix}-otherMeasure-item`,
                  value: 'true',
                  label: t('forms.technical_check.result.otherMeasure'),
                  disabled: !canEdit,
                },
              ]}
            />
          </div>

          {values.resultType === 'driving_ban' && (
            <div className="mt-1">
              <ChoiceGroup
                id={`${idPrefix}-resultTransportInterruption`}
                name={`${idPrefix}-resultTransportInterruption`}
                label={t('forms.technical_check.result.transportInterruption')}
                hideLabel
                inputType="checkbox"
                value={values.resultTransportInterruption ? ['true'] : []}
                onChange={(val) =>
                  canEdit &&
                  formik.setFieldValue(
                    'resultTransportInterruption',
                    Array.isArray(val) ? val.includes('true') : val === 'true',
                  )
                }
                items={[
                  {
                    id: `${idPrefix}-resultTransportInterruption-item`,
                    value: 'true',
                    label: t(
                      'forms.technical_check.result.transportInterruption',
                    ),
                    disabled: !canEdit,
                  },
                ]}
              />
            </div>
          )}

          {values.resultType === 'extraordinary_inspection_ta' && (
            <div className="mb-1 mt-1">
              <Text modifiers="bold">
                {t('forms.technical_check.result.taFieldsTitle')}
              </Text>
              <ChoiceGroup
                id={`${idPrefix}-taFields`}
                name={`${idPrefix}-taFields`}
                label={t('forms.technical_check.result.taFieldsTitle')}
                hideLabel
                inputType="checkbox"
                value={
                  [
                    values.eraYvMntRegnr && 'regnr',
                    values.eraYvMntVintin && 'vintin',
                    values.eraYvMntAxles && 'axles',
                    values.eraYvMntPlaces && 'places',
                    values.eraYvMntRebuilt && 'rebuilt',
                  ].filter(Boolean) as string[]
                }
                onChange={(val) => {
                  if (!canEdit) return;
                  const arr = Array.isArray(val) ? val : [];
                  formik.setFieldValue('eraYvMntRegnr', arr.includes('regnr'));
                  formik.setFieldValue(
                    'eraYvMntVintin',
                    arr.includes('vintin'),
                  );
                  formik.setFieldValue('eraYvMntAxles', arr.includes('axles'));
                  formik.setFieldValue(
                    'eraYvMntPlaces',
                    arr.includes('places'),
                  );
                  formik.setFieldValue(
                    'eraYvMntRebuilt',
                    arr.includes('rebuilt'),
                  );
                }}
                items={[
                  {
                    id: `${idPrefix}-ta-regnr`,
                    value: 'regnr',
                    label: t('forms.technical_check.result.taRegnr'),
                    disabled: !canEdit,
                  },
                  {
                    id: `${idPrefix}-ta-vintin`,
                    value: 'vintin',
                    label: t('forms.technical_check.result.taVintin'),
                    disabled: !canEdit,
                  },
                  {
                    id: `${idPrefix}-ta-axles`,
                    value: 'axles',
                    label: t('forms.technical_check.result.taAxles'),
                    disabled: !canEdit,
                  },
                  {
                    id: `${idPrefix}-ta-places`,
                    value: 'places',
                    label: t('forms.technical_check.result.taPlaces'),
                    disabled: !canEdit,
                  },
                  {
                    id: `${idPrefix}-ta-rebuilt`,
                    value: 'rebuilt',
                    label: t('forms.technical_check.result.taRebuilt'),
                    disabled: !canEdit,
                  },
                ]}
              />
            </div>
          )}

          {(values.resultType !== 'ok' || values.otherMeasure) && (
            <div className="mt-1">
              <ChoiceGroup
                id={`${idPrefix}-proceedingType`}
                name={`${idPrefix}-proceedingType`}
                label={t('forms.technical_check.result.proceedingType')}
                inputType="radio"
                direction="row"
                value={values.proceedingType ?? ''}
                onChange={(val) =>
                  canEdit && formik.setFieldValue('proceedingType', val)
                }
                items={PROCEEDING_TYPES.map((pt) => ({
                  id: `${idPrefix}-proceedingType-${pt}`,
                  value: pt,
                  label: t(
                    `forms.technical_check.result.proceedingTypes.${pt}`,
                  ),
                  disabled: !canEdit,
                }))}
              />
              {values.proceedingType && (
                <TextField
                  id={`${idPrefix}-proceedingReferenceNumber`}
                  label={t(
                    values.proceedingType === 'general'
                      ? 'forms.technical_check.result.caseNumber'
                      : 'forms.technical_check.result.proceedingReferenceNumber',
                  )}
                  value={values.proceedingReferenceNumber ?? ''}
                  onChange={(v) =>
                    formik.setFieldValue('proceedingReferenceNumber', v)
                  }
                  disabled={!canEdit}
                  helper={
                    formik.errors.proceedingReferenceNumber
                      ? {
                          text: formik.errors
                            .proceedingReferenceNumber as string,
                          type: 'error',
                        }
                      : undefined
                  }
                />
              )}
              <div className="mt-1">
                <ChoiceGroup
                  id={`${idPrefix}-transportInterruptionAutovs5131`}
                  name={`${idPrefix}-transportInterruptionAutovs5131`}
                  label={t('forms.technical_check.result.autovs5131')}
                  hideLabel
                  inputType="checkbox"
                  value={values.transportInterruptionAutovs5131 ? ['true'] : []}
                  onChange={(val) =>
                    canEdit &&
                    formik.setFieldValue(
                      'transportInterruptionAutovs5131',
                      Array.isArray(val)
                        ? val.includes('true')
                        : val === 'true',
                    )
                  }
                  items={[
                    {
                      id: `${idPrefix}-transportInterruptionAutovs5131-item`,
                      value: 'true',
                      label: t('forms.technical_check.result.autovs5131'),
                      disabled: !canEdit,
                    },
                  ]}
                />
              </div>
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
            id={`${idPrefix}-notes`}
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
                    id={`${idPrefix}-violations-${category}`}
                    name={`${idPrefix}-violations-${category}`}
                    label={t(
                      `citizen.compoundDetail.severity.${category}`,
                      category,
                    )}
                    inputType="checkbox"
                    value={(values.violations ?? []).filter((c) =>
                      items.some((i) => i.code === c),
                    )}
                    onChange={(val) => {
                      const arr = Array.isArray(val) ? val : [];
                      items.forEach((i) => {
                        const shouldBeChecked = arr.includes(i.code);
                        const isChecked = (values.violations ?? []).includes(
                          i.code,
                        );
                        if (shouldBeChecked !== isChecked) {
                          toggleViolation(i.code, shouldBeChecked);
                        }
                      });
                    }}
                    items={items.map((i) => ({
                      id: `${idPrefix}-violation-${i.code}`,
                      value: i.code,
                      label: `${i.code} — ${i.name}`,
                      disabled: !canEdit,
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
            <FileUploadBlock
              formPath={formPath}
              formNumber={formNumber}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>
      )}

      {/* X-tee andmed: alates 15 ettepanekut p9 täidetakse neid ainult
          öise/tunnise X-tee sünkroonimise cron'idega (etoimik-technical-check-decision-sync.yml,
          yvkehtivus-sync.yml) — käsitsi-admin muutmise voog on eemaldatud.
          Kuvatakse alati loetavana (mitte muudetavana) niipea kui alamvorm
          on kinnitatud — enne seda pole väljadel veel sisu. */}
      {(values.status === 'confirmed' || values.status === 'published') && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.technical_check.xroad.title')}
            </Heading>
            <MaskedDateField
              id={`${idPrefix}-extraordinaryInspectionDate`}
              monthYearSelectType="grid"
              label={t(
                'forms.technical_check.xroad.extraordinaryInspectionDate',
              )}
              selected={
                values.extraordinaryInspectionDate
                  ? new Date(values.extraordinaryInspectionDate)
                  : undefined
              }
              onSelect={() => {}}
              readOnly
            />
            <TextArea
              id={`${idPrefix}-enforcementDecision`}
              label={t('forms.technical_check.xroad.enforcementDecision')}
              value={values.enforcementDecision ?? ''}
              onChange={() => {}}
              disabled
            />
            <TextArea
              id={`${idPrefix}-proceedingClosureBasis`}
              label={t('forms.technical_check.xroad.proceedingClosureBasis')}
              value={values.proceedingClosureBasis ?? ''}
              onChange={() => {}}
              disabled
            />
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
