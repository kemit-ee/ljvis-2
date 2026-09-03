import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Text,
  ChoiceGroup,
  TextField,
  Button,
} from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../classifiers/types';
import type {
  AdrOtherInfringementEntry,
  AdrInfringementRecord,
  AdrInspectionStatus,
} from '../../types';
import {
  AdrInfringementRecordCard,
  REG_CODE_NONE,
  type RegCodeOption,
} from './AdrInfringementRecordCard';
import { regNumberFromCode } from './adrRecordUtils';

const INSPECTION_STATUS: Exclude<AdrInspectionStatus, ''>[] = ['C', 'NC', 'NA'];

interface AdrOtherInfringementsSectionProps {
  /** ADR_CONTROL_CHECKPOINT tase-2 kirjed — kõigi 2016/403 rikkumisliikide loend. */
  items: ClassifierEntry[];
  entries: AdrOtherInfringementEntry[];
  addOtherInfringement: () => void;
  updateOtherInfringement: (index: number, patch: Partial<AdrOtherInfringementEntry>) => void;
  removeOtherInfringement: (index: number) => void;
  addOtherRecord: (index: number) => void;
  updateOtherRecord: (
    index: number,
    recordIndex: number,
    patch: Partial<AdrInfringementRecord>,
  ) => void;
  removeOtherRecord: (index: number, recordIndex: number) => void;
  disabled?: boolean;
}

/** §4.10 "Muu rikkumine" — n+1 lisatav, sama rikkumiskirje struktuur kui punktil. */
export function AdrOtherInfringementsSection({
  items,
  entries,
  addOtherInfringement,
  updateOtherInfringement,
  removeOtherInfringement,
  addOtherRecord,
  updateOtherRecord,
  removeOtherRecord,
  disabled,
}: AdrOtherInfringementsSectionProps) {
  const { t } = useTranslation();

  const regOptions = useMemo<RegCodeOption[]>(() => {
    const seen = new Set<string>();
    const opts: RegCodeOption[] = [];
    items
      .filter((i) => i.parentKey !== null)
      .forEach((i) => {
        const num = regNumberFromCode(i.code);
        if (seen.has(num)) return;
        seen.add(num);
        opts.push({ value: num, label: i.name, severity: i.description ?? null });
      });
    opts.sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
    opts.push({ value: REG_CODE_NONE, label: t('forms.adr.infringements.regCodeNone'), severity: null });
    return opts;
  }, [items, t]);

  return (
    <>
      {entries.map((entry, idx) => (
        <Card key={idx} className="mb-1">
          <Card.Content>
            <TextField
              id={`adr-other-${idx}-title`}
              label={t('forms.adr.otherInfringements.title')}
              className="mb-1"
              value={entry.title}
              onChange={(v) =>
                disabled ? undefined : updateOtherInfringement(idx, { title: v })
              }
              disabled={disabled}
            />

            <ChoiceGroup
              id={`adr-other-${idx}-status`}
              name={`adr-other-${idx}-status`}
              label={t('forms.adr.infringements.inspectionStatus')}
              inputType="radio"
              direction="row"
              className="mb-1"
              value={entry.inspectionStatus}
              onChange={(v) => {
                if (disabled) return;
                const status = (v as AdrInspectionStatus) ?? '';
                const patch: Partial<AdrOtherInfringementEntry> = { inspectionStatus: status };
                if (status !== 'C') {
                  patch.infringementDetected = false;
                  patch.records = [];
                }
                updateOtherInfringement(idx, patch);
              }}
              items={INSPECTION_STATUS.map((s) => ({
                id: `adr-other-${idx}-status-${s}`,
                value: s,
                label: t(`forms.adr.infringements.status.${s}`),
                disabled,
              }))}
            />

            {(entry.inspectionStatus === 'NC' || entry.inspectionStatus === 'NA') && (
              <TextField
                id={`adr-other-${idx}-reason`}
                label={t('forms.adr.infringements.notCheckedReason')}
                className="mb-1"
                value={entry.notCheckedReason ?? ''}
                onChange={(v) =>
                  disabled ? undefined : updateOtherInfringement(idx, { notCheckedReason: v })
                }
                disabled={disabled}
              />
            )}

            {entry.inspectionStatus === 'C' && (
              <>
                <ChoiceGroup
                  id={`adr-other-${idx}-detected`}
                  name={`adr-other-${idx}-detected`}
                  label={t('forms.adr.infringements.infringementDetected')}
                  inputType="radio"
                  direction="row"
                  className="mb-1"
                  value={entry.infringementDetected ? 'yes' : 'no'}
                  onChange={(v) => {
                    if (disabled) return;
                    const detected = v === 'yes';
                    if (detected && entry.records.length === 0) {
                      updateOtherInfringement(idx, { infringementDetected: true });
                      addOtherRecord(idx);
                    } else {
                      updateOtherInfringement(idx, {
                        infringementDetected: detected,
                        records: detected ? entry.records : [],
                      });
                    }
                  }}
                  items={[
                    { id: `adr-other-${idx}-detected-no`, value: 'no', label: t('common.no'), disabled },
                    { id: `adr-other-${idx}-detected-yes`, value: 'yes', label: t('common.yes'), disabled },
                  ]}
                />

                {entry.infringementDetected &&
                  entry.records.map((rec, ri) => (
                    <AdrInfringementRecordCard
                      key={ri}
                      index={ri}
                      record={rec}
                      regCodeOptions={regOptions}
                      onChange={(patch) => updateOtherRecord(idx, ri, patch)}
                      onRemove={() => removeOtherRecord(idx, ri)}
                      disabled={disabled}
                    />
                  ))}

                {entry.infringementDetected && !disabled && (
                  <Button
                    type="button"
                    visualType="secondary"
                    onClick={() => addOtherRecord(idx)}
                  >
                    {t('forms.adr.infringements.addRecord')}
                  </Button>
                )}
              </>
            )}

            {!disabled && (
              <div className="mt-1">
                <Button
                  type="button"
                  visualType="neutral"
                  color="danger"
                  size="small"
                  icon="delete"
                  onClick={() => removeOtherInfringement(idx)}
                >
                  {t('forms.adr.otherInfringements.remove')}
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>
      ))}

      {entries.length === 0 && (
        <Text className="mb-1">{t('forms.adr.otherInfringements.empty')}</Text>
      )}

      {!disabled && (
        <Button type="button" visualType="secondary" onClick={addOtherInfringement}>
          {t('forms.adr.otherInfringements.addRow')}
        </Button>
      )}
    </>
  );
}
