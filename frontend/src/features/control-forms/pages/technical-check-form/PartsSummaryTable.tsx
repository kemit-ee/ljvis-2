import { useTranslation } from 'react-i18next';
import { Button, Checkbox, ChoiceGroup, StatusBadge } from '@tedi-design-system/react/tedi';
import type { StatusBadgeColor } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { PartDefectEntry, PartSeverity, PartSummaryEntry } from '../../types';
import styles from '../../../../shared/components/CheckedItemsTable.module.css';

const severityColor = (sev: PartSeverity): StatusBadgeColor => {
  if (sev === 'EOV') return 'danger';
  if (sev === 'OV') return 'accent';
  return 'warning';
};

/** Trailing number of a classifier code (e.g. "CAA_11" -> 11) — the part's
 *  official number, used for display. Not a list index: `parts` can have gaps
 *  (trailer variant excludes CAA_2/3/7/9). */
const partNumber = (code: string): number => {
  const m = code.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
};

interface PartsSummaryTableProps {
  /** Already sorted by the parent hook. */
  parts: ClassifierEntry[];
  partsSummary: PartSummaryEntry[];
  /** "Kontrollitud" toggle — cannot turn off while hasDefect is true (enforced
   *  by the hook too; disabled here for the same reason). */
  onCheckedChange: (partCode: string, checked: boolean) => void;
  /** "Ei vasta nõuetele" toggle: turning it on opens the defect-selection
   *  modal for this part; turning it off clears all of the part's defects
   *  (checked stays true either way — LJVIS2-72 15 ettepanekut p2). */
  onDefectToggle: (partCode: string, hasDefect: boolean) => void;
  disabled?: boolean;
  /** Inline defect display (like RSI): pass to show selected defects under each row. */
  partsDefects?: PartDefectEntry[];
  defectsByPartKey?: Map<number, ClassifierEntry[]>;
  onRemoveDefect?: (partCode: string, defectCode: string) => void;
}

export function PartsSummaryTable({
  parts,
  partsSummary,
  onCheckedChange,
  onDefectToggle,
  disabled,
  partsDefects,
  defectsByPartKey,
  onRemoveDefect,
}: PartsSummaryTableProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const entryOf = (partCode: string): PartSummaryEntry =>
    partsSummary.find((p) => p.partCode === partCode) ?? { partCode, checked: false, hasDefect: false };

  const indexClass = (entry: PartSummaryEntry): string => {
    if (entry.hasDefect) return styles.partIndexNonCompliant;
    if (entry.checked) return styles.partIndexChecked;
    return '';
  };

  const defectsBlock = (part: ClassifierEntry) => {
    const entry = entryOf(part.code);
    if (!partsDefects || !defectsByPartKey || !entry.hasDefect) return null;
    const defects = partsDefects.filter((d) => d.partCode === part.code);
    return (
      <>
        {defects.length > 0 && (
          <ul className={styles.defectsList}>
            {defects.map((d) => (
              <li key={d.defectCode} className={styles.defectItem}>
                <span className={styles.defectName}>
                  {defectsByPartKey
                    .get(part.classifierValueKey)
                    ?.find((c) => c.code === d.defectCode)?.name ?? d.defectCode}
                </span>
                <StatusBadge color={severityColor(d.severity)} variant="bordered">
                  {d.severity}
                </StatusBadge>
                {!disabled && onRemoveDefect && (
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
        {!disabled && (
          <Button
            visualType="link"
            size="small"
            onClick={() => onDefectToggle(part.code, true)}
          >
            {t('forms.technical_check.parts.editDefects')}
          </Button>
        )}
      </>
    );
  };

  const checkedItems = (partCode: string, entry: PartSummaryEntry) => [
    {
      id: `part-status-${partCode}-not-checked`,
      value: 'false',
      label: t('forms.technical_check.parts.notChecked'),
      // hasDefect always implies checked — can't uncheck while a defect exists.
      disabled: disabled || entry.hasDefect,
    },
    {
      id: `part-status-${partCode}-checked`,
      value: 'true',
      label: t('forms.technical_check.parts.checked'),
      disabled,
    },
  ];

  const renderControls = (part: ClassifierEntry, direction: 'row' | 'column') => {
    const entry = entryOf(part.code);
    return (
      <>
        <ChoiceGroup
          id={`part-status-${part.code}`}
          name={`part-status-${part.code}`}
          label={t('forms.technical_check.parts.statusColumn')}
          hideLabel
          inputType="radio"
          direction={direction}
          value={String(entry.checked)}
          onChange={(val) => !disabled && onCheckedChange(part.code, val === 'true')}
          items={checkedItems(part.code, entry)}
        />
        <Checkbox
          id={`part-defect-${part.code}`}
          name={`part-defect-${part.code}`}
          value="hasDefect"
          label={t('forms.technical_check.parts.nonCompliant')}
          checked={entry.hasDefect}
          disabled={disabled}
          onChange={(checked) => !disabled && onDefectToggle(part.code, !!checked)}
        />
      </>
    );
  };

  if (isDesktop) {
    return (
      <table className={styles.checkedItemsTable}>
        <thead>
          <tr>
            <th>{t('forms.technical_check.parts.column')}</th>
            <th>{t('forms.technical_check.parts.statusColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => {
            const entry = entryOf(part.code);
            const rowCls = entry.hasDefect
              ? styles.rowNonCompliant
              : entry.checked
                ? styles.rowChecked
                : '';
            return (
              <tr key={part.classifierValueKey} className={rowCls}>
                <td>
                  <span className={styles.partName}>
                    <span className={`${styles.partIndex} ${indexClass(entry)}`}>
                      {partNumber(part.code)}
                    </span>
                    <span className={styles.partLabel}>{part.name}</span>
                  </span>
                </td>
                <td>
                  {renderControls(part, 'row')}
                  {defectsBlock(part)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  /* Tablet / Phone: card grid */
  return (
    <div className={styles.cardList}>
      {parts.map((part) => {
        const entry = entryOf(part.code);
        const cardCls = [
          styles.partCard,
          entry.hasDefect ? styles.cardNonCompliant : entry.checked ? styles.cardChecked : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={part.classifierValueKey} className={cardCls}>
            <div className={styles.cardHeader}>
              <span className={styles.partName}>
                <span className={`${styles.partIndex} ${indexClass(entry)}`}>
                  {partNumber(part.code)}
                </span>
                <span className={styles.partLabel}>{part.name}</span>
              </span>
            </div>
            <div className={styles.cardRadios}>{renderControls(part, 'column')}</div>
            {defectsBlock(part)}
          </div>
        );
      })}
    </div>
  );
}
