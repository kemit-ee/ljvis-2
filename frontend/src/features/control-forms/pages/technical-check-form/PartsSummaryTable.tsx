import { useMemo, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ChoiceGroup, StatusBadge } from '@tedi-design-system/react/tedi';
import type { StatusBadgeColor } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { PartDefectEntry, PartSeverity, PartSummaryEntry, PartSummaryStatus } from '../../types';
import styles from '../../../erru/components/Rsi/RsiCheckedItemsTable.module.css';

const severityColor = (sev: PartSeverity): StatusBadgeColor => {
  if (sev === 'EOV') return 'danger';
  if (sev === 'OV') return 'accent';
  return 'warning';
};

/** Extract the trailing number from a classifier code (e.g. "CAA_11" -> 11). */
const numericSuffix = (code: string): number => {
  const m = code.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
};

interface PartsSummaryTableProps {
  parts: ClassifierEntry[];
  partsSummary: PartSummaryEntry[];
  onStatusChange: (partCode: string, status: PartSummaryStatus) => void;
  disabled?: boolean;
  /** Inline defect display (like RSI): pass to show selected defects under each row. */
  partsDefects?: PartDefectEntry[];
  defectsByPartKey?: Map<number, ClassifierEntry[]>;
  onRemoveDefect?: (partCode: string, defectCode: string) => void;
}

export function PartsSummaryTable({
  parts,
  partsSummary,
  onStatusChange,
  disabled,
  partsDefects,
  defectsByPartKey,
  onRemoveDefect,
}: PartsSummaryTableProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const sortedParts = useMemo(
    () => [...parts].sort((a, b) => numericSuffix(a.code) - numericSuffix(b.code)),
    [parts],
  );

  const statusOf = (partCode: string): PartSummaryStatus =>
    partsSummary.find((p) => p.partCode === partCode)?.status ?? 'not_checked';

  // Re-clicking an already-selected radio fires no onChange, so clicking
  // "Ei vasta nõuetele" while already selected wouldn't reopen the defect
  // modal. Catch that click on the wrapper and re-fire onStatusChange
  // (handlePartStatusChange reopens the modal for non_compliant).
  const handleRadioClick = (partCode: string, e: MouseEvent) => {
    if (disabled) return;
    const el = e.target as HTMLElement;
    const input =
      ((el.closest('label') as HTMLLabelElement | null)?.control as HTMLInputElement | null) ??
      (el instanceof HTMLInputElement ? el : null);
    if (
      input?.id === `part-status-${partCode}-non-compliant` &&
      statusOf(partCode) === 'non_compliant'
    ) {
      onStatusChange(partCode, 'non_compliant');
    }
  };

  const indexClass = (status: PartSummaryStatus): string => {
    if (status === 'checked') return styles.partIndexChecked;
    if (status === 'non_compliant') return styles.partIndexNonCompliant;
    return '';
  };

  const defectsBlock = (part: ClassifierEntry) => {
    if (!partsDefects || !defectsByPartKey) return null;
    const defects = partsDefects.filter((d) => d.partCode === part.code);
    if (defects.length === 0) return null;
    return (
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
    );
  };

  const radioItems = (partCode: string) => [
    {
      id: `part-status-${partCode}-not-checked`,
      value: 'not_checked',
      label: t('forms.technical_check.parts.notChecked'),
      disabled,
    },
    {
      id: `part-status-${partCode}-checked`,
      value: 'checked',
      label: t('forms.technical_check.parts.checked'),
      disabled,
    },
    {
      id: `part-status-${partCode}-non-compliant`,
      value: 'non_compliant',
      label: t('forms.technical_check.parts.nonCompliant'),
      disabled,
    },
  ];

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
          {sortedParts.map((part, idx) => {
            const status = statusOf(part.code);
            const rowCls =
              status === 'checked'
                ? styles.rowChecked
                : status === 'non_compliant'
                  ? styles.rowNonCompliant
                  : '';
            return (
              <tr key={part.classifierValueKey} className={rowCls}>
                <td>
                  <span className={styles.partName}>
                    <span className={`${styles.partIndex} ${indexClass(status)}`}>{idx + 1}</span>
                    <span className={styles.partLabel}>{part.name}</span>
                  </span>
                </td>
                <td>
                  <div onClick={(e) => handleRadioClick(part.code, e)}>
                    <ChoiceGroup
                      id={`part-status-${part.code}`}
                      name={`part-status-${part.code}`}
                      label={t('forms.technical_check.parts.statusColumn')}
                      hideLabel
                      inputType="radio"
                      direction="row"
                      value={status}
                      onChange={(val) =>
                        !disabled && onStatusChange(part.code, val as PartSummaryStatus)
                      }
                      items={radioItems(part.code)}
                    />
                  </div>
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
      {sortedParts.map((part, idx) => {
        const status = statusOf(part.code);
        const cardCls = [
          styles.partCard,
          status === 'checked' ? styles.cardChecked : '',
          status === 'non_compliant' ? styles.cardNonCompliant : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={part.classifierValueKey} className={cardCls}>
            <div className={styles.cardHeader}>
              <span className={styles.partName}>
                <span className={`${styles.partIndex} ${indexClass(status)}`}>{idx + 1}</span>
                <span className={styles.partLabel}>{part.name}</span>
              </span>
            </div>
            <div
              className={styles.cardRadios}
              onClick={(e) => handleRadioClick(part.code, e)}
            >
              <ChoiceGroup
                id={`part-status-${part.code}`}
                name={`part-status-${part.code}`}
                label={t('forms.technical_check.parts.statusColumn')}
                hideLabel
                inputType="radio"
                direction="column"
                value={status}
                onChange={(val) =>
                  !disabled && onStatusChange(part.code, val as PartSummaryStatus)
                }
                items={radioItems(part.code)}
              />
            </div>
            {defectsBlock(part)}
          </div>
        );
      })}
    </div>
  );
}
