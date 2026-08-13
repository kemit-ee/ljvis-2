import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ChoiceGroup, Modal, Text } from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { RsiCheckedItem, RsiDefectSeverity } from '../../types';

const SEVERITIES: RsiDefectSeverity[] = ['VO', 'OV', 'EOV'];

/**
 * "Kontrollitud punkt" block (LJVIS2-147 §Plokk "Kontrollitud punkt"): one row per
 * TECHNICAL_CHECK level-1 part (CAA_10 excluded upstream, see useRsiForm.ts), a
 * three-way radio per row, and a defect-selection modal for "Ei vasta nõuetele".
 * Mirrors control-forms/technical-check-form's PartsSummaryTable + DefectSelectionModal
 * + DefectsResultsTable, adapted to RSI's nested checked_items shape
 * ([{partCode,status,defects:[...]}] instead of separate parts_summary/parts_defects
 * arrays) — there is no auto-derived overall result here, unlike the technical-check form.
 */
export function RsiCheckedItemsTable({
  parts,
  defectsByPartKey,
  items,
  onStatusChange,
  onDefectsChange,
  onRemoveDefect,
  disabled,
}: {
  parts: ClassifierEntry[];
  defectsByPartKey: Map<number, ClassifierEntry[]>;
  items: RsiCheckedItem[];
  onStatusChange: (partCode: string, status: RsiCheckedItem['status']) => void;
  onDefectsChange: (
    partCode: string,
    selected: { defectCode: string; severity: RsiDefectSeverity }[],
  ) => void;
  onRemoveDefect: (partCode: string, defectCode: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [modalPart, setModalPart] = useState<ClassifierEntry | null>(null);

  const itemOf = (partCode: string): RsiCheckedItem =>
    items.find((i) => i.partCode === partCode) ?? { partCode, status: 'not_checked', defects: [] };

  const handleStatusChange = (part: ClassifierEntry, status: RsiCheckedItem['status']) => {
    if (status === 'non_compliant') {
      setModalPart(part);
      return;
    }
    onStatusChange(part.code, status);
  };

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>
              {t('erru.rsi.checkedItems.part')}
            </th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>
              {t('erru.rsi.checkedItems.result')}
            </th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => {
            const item = itemOf(part.code);
            return (
              <tr key={part.classifierValueKey}>
                <td style={{ padding: '4px 8px' }}>
                  {part.code} — {part.name}
                </td>
                <td style={{ padding: '4px 8px' }}>
                  <ChoiceGroup
                    id={`rsi-part-status-${part.code}`}
                    name={`rsi-part-status-${part.code}`}
                    label={t('erru.rsi.checkedItems.result')}
                    hideLabel
                    inputType="radio"
                    direction="row"
                    value={item.status}
                    onChange={(val) =>
                      !disabled && handleStatusChange(part, val as RsiCheckedItem['status'])
                    }
                    items={[
                      {
                        id: `rsi-part-status-${part.code}-not-checked`,
                        value: 'not_checked',
                        label: t('erru.rsi.checkedItems.notChecked'),
                        disabled,
                      },
                      {
                        id: `rsi-part-status-${part.code}-checked`,
                        value: 'checked',
                        label: t('erru.rsi.checkedItems.checked'),
                        disabled,
                      },
                      {
                        id: `rsi-part-status-${part.code}-non-compliant`,
                        value: 'non_compliant',
                        label: t('erru.rsi.checkedItems.nonCompliant'),
                        disabled,
                      },
                    ]}
                  />
                  {item.defects.length > 0 && (
                    <ul>
                      {item.defects.map((d) => (
                        <li key={d.defectCode}>
                          {defectsByPartKey.get(part.classifierValueKey)?.find((c) => c.code === d.defectCode)
                            ?.name ?? d.defectCode}{' '}
                          – {d.severity}
                          {!disabled && (
                            <Button
                              icon="delete"
                              visualType="neutral"
                              color="danger"
                              size="small"
                              onClick={() => onRemoveDefect(part.code, d.defectCode)}
                            >
                              {t('common.delete')}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <RsiDefectModal
        open={!!modalPart}
        part={modalPart}
        defects={modalPart ? defectsByPartKey.get(modalPart.classifierValueKey) ?? [] : []}
        existing={modalPart ? itemOf(modalPart.code).defects : []}
        onClose={() => setModalPart(null)}
        onConfirm={(selected) => {
          if (modalPart) onDefectsChange(modalPart.code, selected);
          setModalPart(null);
        }}
      />
    </>
  );
}

function RsiDefectModal({
  open,
  part,
  defects,
  existing,
  onClose,
  onConfirm,
}: {
  open: boolean;
  part: ClassifierEntry | null;
  defects: ClassifierEntry[];
  existing: { defectCode: string; severity: RsiDefectSeverity }[];
  onClose: () => void;
  onConfirm: (selected: { defectCode: string; severity: RsiDefectSeverity }[]) => void;
}) {
  const { t } = useTranslation();
  const [selections, setSelections] = useState<Record<string, RsiDefectSeverity | ''>>({});
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, RsiDefectSeverity | ''> = {};
    defects.forEach((d) => {
      initial[d.code] = existing.find((e) => e.defectCode === d.code)?.severity ?? '';
    });
    setSelections(initial);
    setShowHint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, part?.code]);

  const applicableSeverities = (defect: ClassifierEntry): RsiDefectSeverity[] => {
    const list = (defect.description ?? '').split(',').map((s) => s.trim());
    return SEVERITIES.filter((s) => list.includes(s));
  };

  const handleConfirm = () => {
    const selected = Object.entries(selections)
      .filter(([, sev]) => !!sev)
      .map(([defectCode, sev]) => ({ defectCode, severity: sev as RsiDefectSeverity }));
    if (selected.length === 0) {
      setShowHint(true);
      return;
    }
    onConfirm(selected);
  };

  return (
    <Modal open={open} onToggle={(next) => !next && onClose()}>
      <Modal.Content aria-label={part?.name ?? ''}>
        <Modal.Header title={part?.name ?? ''} />
        <Modal.Body>
          {defects.length === 0 && <Text>{t('erru.rsi.defectModal.noDefects')}</Text>}
          {defects.map((defect) => (
            <div key={defect.code} className="mb-1">
              <ChoiceGroup
                id={`rsi-defect-${defect.code}`}
                name={`rsi-defect-${defect.code}`}
                label={defect.name}
                inputType="radio"
                direction="row"
                value={selections[defect.code] ?? ''}
                onChange={(val) =>
                  setSelections((prev) => ({ ...prev, [defect.code]: val as RsiDefectSeverity }))
                }
                items={applicableSeverities(defect).map((sev) => ({
                  id: `rsi-defect-${defect.code}-${sev}`,
                  value: sev,
                  label: sev,
                }))}
              />
            </div>
          ))}
          {showHint && <Text color="danger">{t('erru.rsi.defectModal.selectAtLeastOne')}</Text>}
        </Modal.Body>
        <Modal.Footer>
          <Button visualType="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm}>{t('erru.rsi.defectModal.select')}</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
