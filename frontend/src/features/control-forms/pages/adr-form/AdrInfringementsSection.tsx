import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  Text,
  ChoiceGroup,
  TextField,
  Button,
} from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { AdrCheckpointEntry, AdrInfringementRecord, AdrInspectionStatus } from '../../types';
import {
  AdrInfringementRecordCard,
  REG_CODE_NONE,
  type RegCodeOption,
} from './AdrInfringementRecordCard';
import { regNumberFromCode } from './adrRecordUtils';

const INSPECTION_STATUS: Exclude<AdrInspectionStatus, ''>[] = ['C', 'NC', 'NA'];

interface AdrInfringementsSectionProps {
  /** Kõik ADR_CONTROL_CHECKPOINT klassifikaatori kirjed (tase 1 + tase 2). */
  items: ClassifierEntry[];
  getCheckpoint: (checkpointCode: string) => AdrCheckpointEntry;
  setCheckpoint: (checkpointCode: string, patch: Partial<AdrCheckpointEntry>) => void;
  addRecord: (checkpointCode: string) => void;
  updateRecord: (
    checkpointCode: string,
    index: number,
    patch: Partial<AdrInfringementRecord>,
  ) => void;
  removeRecord: (checkpointCode: string, index: number) => void;
  disabled?: boolean;
}

/**
 * Kliimaministri määruse (RT I, 16.06.2026, 11) lisa 1 rikkumiste plokk:
 * kontrollkaardi punktid P12–P27 (ADR_CONTROL_CHECKPOINT tase 1), iga punkti all
 * C/NC/NA + "rikkumine tuvastatud" + korratav rikkumiskirje.
 */
export function AdrInfringementsSection({
  items,
  getCheckpoint,
  setCheckpoint,
  addRecord,
  updateRecord,
  removeRecord,
  disabled,
}: AdrInfringementsSectionProps) {
  const { t } = useTranslation();

  const { checkpoints, regOptionsByCheckpoint } = useMemo(() => {
    const parents = items
      .filter((i) => i.parentKey === null)
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    const byParent = new Map<number, RegCodeOption[]>();
    items
      .filter((i) => i.parentKey !== null)
      .forEach((i) => {
        const list = byParent.get(i.parentKey as number) ?? [];
        list.push({
          value: regNumberFromCode(i.code),
          label: i.name,
          severity: i.description ?? null,
        });
        byParent.set(i.parentKey as number, list);
      });
    const noneOption: RegCodeOption = {
      value: REG_CODE_NONE,
      label: t('forms.adr.infringements.regCodeNone'),
      severity: null,
    };
    const optsByCode = new Map<string, RegCodeOption[]>();
    parents.forEach((p) => {
      optsByCode.set(p.code, [...(byParent.get(p.classifierValueKey) ?? []), noneOption]);
    });
    return { checkpoints: parents, regOptionsByCheckpoint: optsByCode };
  }, [items, t]);

  if (checkpoints.length === 0) {
    return <Text>{t('forms.adr.infringements.classifierMissing')}</Text>;
  }

  return (
    <>
      {checkpoints.map((cp) => {
        const entry = getCheckpoint(cp.code);
        const regOptions = regOptionsByCheckpoint.get(cp.code) ?? [];
        const heading = cp.description
          ? `${cp.name} (${cp.description})`
          : cp.name;
        return (
          <Card key={cp.classifierValueKey} className="mb-1">
            <Card.Content>
              <Heading element="h4" className="mb-1">
                {heading}
              </Heading>

              <ChoiceGroup
                id={`adr-cp-${cp.code}-status`}
                name={`adr-cp-${cp.code}-status`}
                label={t('forms.adr.infringements.inspectionStatus')}
                inputType="radio"
                direction="row"
                className="mb-1"
                value={entry.inspectionStatus}
                onChange={(v) => {
                  if (disabled) return;
                  const status = (v as AdrInspectionStatus) ?? '';
                  const patch: Partial<AdrCheckpointEntry> = { inspectionStatus: status };
                  if (status !== 'C') {
                    patch.infringementDetected = false;
                    patch.records = [];
                  }
                  setCheckpoint(cp.code, patch);
                }}
                items={INSPECTION_STATUS.map((s) => ({
                  id: `adr-cp-${cp.code}-status-${s}`,
                  value: s,
                  label: t(`forms.adr.infringements.status.${s}`),
                  disabled,
                }))}
              />

              {(entry.inspectionStatus === 'NC' || entry.inspectionStatus === 'NA') && (
                <TextField
                  id={`adr-cp-${cp.code}-reason`}
                  label={t('forms.adr.infringements.notCheckedReason')}
                  className="mb-1"
                  value={entry.notCheckedReason ?? ''}
                  onChange={(v) =>
                    disabled ? undefined : setCheckpoint(cp.code, { notCheckedReason: v })
                  }
                  disabled={disabled}
                />
              )}

              {entry.inspectionStatus === 'C' && (
                <>
                  <ChoiceGroup
                    id={`adr-cp-${cp.code}-detected`}
                    name={`adr-cp-${cp.code}-detected`}
                    label={t('forms.adr.infringements.infringementDetected')}
                    inputType="radio"
                    direction="row"
                    className="mb-1"
                    value={entry.infringementDetected ? 'yes' : 'no'}
                    onChange={(v) => {
                      if (disabled) return;
                      const detected = v === 'yes';
                      setCheckpoint(cp.code, {
                        infringementDetected: detected,
                        records: detected && entry.records.length === 0
                          ? [
                              {
                                riskCategory: '',
                                adrReference: '',
                                responsibleParticipants: [],
                                reg2016403Code: null,
                                reg2016403Severity: null,
                              },
                            ]
                          : detected
                            ? entry.records
                            : [],
                      });
                    }}
                    items={[
                      { id: `adr-cp-${cp.code}-detected-no`, value: 'no', label: t('common.no'), disabled },
                      { id: `adr-cp-${cp.code}-detected-yes`, value: 'yes', label: t('common.yes'), disabled },
                    ]}
                  />

                  {entry.infringementDetected &&
                    entry.records.map((rec, i) => (
                      <AdrInfringementRecordCard
                        key={i}
                        index={i}
                        record={rec}
                        regCodeOptions={regOptions}
                        onChange={(patch) => updateRecord(cp.code, i, patch)}
                        onRemove={() => removeRecord(cp.code, i)}
                        disabled={disabled}
                      />
                    ))}

                  {entry.infringementDetected && !disabled && (
                    <Button
                      type="button"
                      visualType="secondary"
                      onClick={() => addRecord(cp.code)}
                    >
                      {t('forms.adr.infringements.addRecord')}
                    </Button>
                  )}
                </>
              )}
            </Card.Content>
          </Card>
        );
      })}
    </>
  );
}
