import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ChoiceGroup,
  Modal,
  StatusBadge,
  Text,
} from '@tedi-design-system/react/tedi';
import type { StatusBadgeColor } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { RsiCheckedItem, RsiDefectSeverity } from '../../types';
import styles from './RsiCheckedItemsTable.module.css';

const SEVERITIES: RsiDefectSeverity[] = ['VO', 'OV', 'EOV'];

const severityColor = (sev: RsiDefectSeverity): StatusBadgeColor => {
  if (sev === 'EOV') return 'danger';
  if (sev === 'OV') return 'accent';
  return 'warning'; // VO
};

/** Extract the trailing number from a classifier code (e.g. "CAA_11" -> 11). */
const numericSuffix = (code: string): number => {
  const m = code.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
};

/**
 * "Kontrollitud punkt" block (LJVIS2-147 §Plokk "Kontrollitud punkt"): one row per
 * TECHNICAL_CHECK level-1 part (CAA_10 excluded upstream, see useRsiForm.ts), a
 * three-way radio per row, and a defect-selection modal for "Ei vasta nõuetele".
 * Mirrors control-forms/technical-check-form's PartsSummaryTable + DefectSelectionModal
 * + DefectsResultsTable, adapted to RSI's nested checked_items shape. Uses only
 * native TEDI components (ChoiceGroup, StatusBadge, Modal) and TEDI colour tokens.
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
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const [modalPart, setModalPart] = useState<ClassifierEntry | null>(null);

  const sortedParts = useMemo(
    () =>
      [...parts].sort((a, b) => numericSuffix(a.code) - numericSuffix(b.code)),
    [parts],
  );

  const itemOf = (partCode: string): RsiCheckedItem =>
    items.find((i) => i.partCode === partCode) ?? {
      partCode,
      status: 'not_checked',
      defects: [],
    };

  const handleStatusChange = (
    part: ClassifierEntry,
    status: RsiCheckedItem['status'],
  ) => {
    if (status === 'non_compliant') {
      setModalPart(part);
      return;
    }
    onStatusChange(part.code, status);
  };

  const indexClass = (status: RsiCheckedItem['status']): string => {
    if (status === 'checked') return styles.partIndexChecked;
    if (status === 'non_compliant') return styles.partIndexNonCompliant;
    return '';
  };

  const radioItems = (partCode: string) => [
    {
      id: `rsi-part-status-${partCode}-not-checked`,
      value: 'not_checked',
      label: t('erru.rsi.checkedItems.notChecked'),
      disabled,
    },
    {
      id: `rsi-part-status-${partCode}-checked`,
      value: 'checked',
      label: t('erru.rsi.checkedItems.checked'),
      disabled,
    },
    {
      id: `rsi-part-status-${partCode}-non-compliant`,
      value: 'non_compliant',
      label: t('erru.rsi.checkedItems.nonCompliant'),
      disabled,
    },
  ];

  const defectsBlock = (part: ClassifierEntry, item: RsiCheckedItem) =>
    item.defects.length > 0 ? (
      <ul className={styles.defectsList}>
        {item.defects.map((d) => (
          <li key={d.defectCode} className={styles.defectItem}>
            <span className={styles.defectName}>
              {defectsByPartKey
                .get(part.classifierValueKey)
                ?.find((c) => c.code === d.defectCode)?.name ?? d.defectCode}
            </span>
            <StatusBadge color={severityColor(d.severity)} variant="bordered">
              {d.severity}
            </StatusBadge>
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
    ) : null;

  /* ─── Desktop: classic two-column table ─── */
  if (isDesktop) {
    return (
      <>
        <table className={styles.checkedItemsTable}>
          <thead>
            <tr>
              <th>{t('erru.rsi.checkedItems.part')}</th>
              <th>{t('erru.rsi.checkedItems.result')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedParts.map((part, idx) => {
              const item = itemOf(part.code);
              const rowCls =
                item.status === 'checked'
                  ? styles.rowChecked
                  : item.status === 'non_compliant'
                    ? styles.rowNonCompliant
                    : '';
              return (
                <tr key={part.classifierValueKey} className={rowCls}>
                  <td>
                    <span className={styles.partName}>
                      <span
                        className={`${styles.partIndex} ${indexClass(item.status)}`}
                      >
                        {idx + 1}
                      </span>
                      <span className={styles.partLabel}>{part.name}</span>
                    </span>
                  </td>
                  <td>
                    <ChoiceGroup
                      id={`rsi-part-status-${part.code}`}
                      name={`rsi-part-status-${part.code}`}
                      label={t('erru.rsi.checkedItems.result')}
                      hideLabel
                      inputType="radio"
                      direction="row"
                      value={item.status}
                      onChange={(val) =>
                        !disabled &&
                        handleStatusChange(
                          part,
                          val as RsiCheckedItem['status'],
                        )
                      }
                      items={radioItems(part.code)}
                    />
                    {defectsBlock(part, item)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <RsiDefectModal
          open={!!modalPart}
          part={modalPart}
          defects={
            modalPart
              ? (defectsByPartKey.get(modalPart.classifierValueKey) ?? [])
              : []
          }
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

  /* ─── Tablet / Phone: card grid ─── */
  return (
    <>
      <div className={styles.cardList}>
        {sortedParts.map((part, idx) => {
          const item = itemOf(part.code);
          const cardCls = [
            styles.partCard,
            item.status === 'checked' ? styles.cardChecked : '',
            item.status === 'non_compliant' ? styles.cardNonCompliant : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={part.classifierValueKey} className={cardCls}>
              <div className={styles.cardHeader}>
                <span className={styles.partName}>
                  <span
                    className={`${styles.partIndex} ${indexClass(item.status)}`}
                  >
                    {idx + 1}
                  </span>
                  <span className={styles.partLabel}>{part.name}</span>
                </span>
              </div>
              <div className={styles.cardRadios}>
                <ChoiceGroup
                  id={`rsi-part-status-${part.code}`}
                  name={`rsi-part-status-${part.code}`}
                  label={t('erru.rsi.checkedItems.result')}
                  hideLabel
                  inputType="radio"
                  direction="column"
                  value={item.status}
                  onChange={(val) =>
                    !disabled &&
                    handleStatusChange(part, val as RsiCheckedItem['status'])
                  }
                  items={radioItems(part.code)}
                />
              </div>
              {defectsBlock(part, item)}
            </div>
          );
        })}
      </div>

      <RsiDefectModal
        open={!!modalPart}
        part={modalPart}
        defects={
          modalPart
            ? (defectsByPartKey.get(modalPart.classifierValueKey) ?? [])
            : []
        }
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

/* ═══════════════════════════════════════════════════════════
   Defect-selection modal — one TEDI radio group per defect, with
   an explicit "Puudub" (none) option so a chosen severity can be
   cleared. Same pattern as technical-check-form's DefectSelectionModal.
   ═══════════════════════════════════════════════════════════ */

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
  onConfirm: (
    selected: { defectCode: string; severity: RsiDefectSeverity }[],
  ) => void;
}) {
  const { t } = useTranslation();
  const [selections, setSelections] = useState<
    Record<string, RsiDefectSeverity | ''>
  >({});
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, RsiDefectSeverity | ''> = {};
    defects.forEach((d) => {
      initial[d.code] =
        existing.find((e) => e.defectCode === d.code)?.severity ?? '';
    });
    setSelections(initial);
    setShowHint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, part?.code]);

  const applicableSeverities = (
    defect: ClassifierEntry,
  ): RsiDefectSeverity[] => {
    const list = (defect.description ?? '').split(',').map((s) => s.trim());
    return SEVERITIES.filter((s) => list.includes(s));
  };

  const handleConfirm = () => {
    const selected = Object.entries(selections)
      .filter(([, sev]) => !!sev)
      .map(([defectCode, sev]) => ({
        defectCode,
        severity: sev as RsiDefectSeverity,
      }));
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
          {defects.length === 0 && (
            <Text>{t('erru.rsi.defectModal.noDefects')}</Text>
          )}
          {defects.map((defect) => {
            const current = selections[defect.code] || '';
            return (
              <div key={defect.code} className="mb-1">
                <ChoiceGroup
                  id={`rsi-defect-${defect.code}`}
                  name={`rsi-defect-${defect.code}`}
                  label={defect.name}
                  inputType="checkbox"
                  direction="row"
                  value={current ? [current] : []}
                  onChange={(val) => {
                    const arr = (
                      Array.isArray(val) ? val : []
                    ) as RsiDefectSeverity[];
                    const added = arr.find((v) => v !== current);
                    setSelections((prev) => ({
                      ...prev,
                      [defect.code]: added ?? '',
                    }));
                  }}
                  items={applicableSeverities(defect).map((sev) => ({
                    id: `rsi-defect-${defect.code}-${sev}`,
                    value: sev,
                    label: sev,
                  }))}
                />
              </div>
            );
          })}
          {showHint && (
            <Text color="danger">
              {t('erru.rsi.defectModal.selectAtLeastOne')}
            </Text>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button visualType="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm}>
            {t('erru.rsi.defectModal.select')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
