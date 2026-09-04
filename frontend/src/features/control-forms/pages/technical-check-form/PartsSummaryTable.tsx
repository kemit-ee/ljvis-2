import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoiceGroup } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { PartSummaryEntry, PartSummaryStatus } from '../../types';
import styles from '../../../erru/components/Rsi/RsiCheckedItemsTable.module.css';

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
}

export function PartsSummaryTable({
  parts,
  partsSummary,
  onStatusChange,
  disabled,
}: PartsSummaryTableProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const sortedParts = useMemo(
    () => [...parts].sort((a, b) => numericSuffix(a.code) - numericSuffix(b.code)),
    [parts],
  );

  const statusOf = (partCode: string): PartSummaryStatus =>
    partsSummary.find((p) => p.partCode === partCode)?.status ?? 'not_checked';

  const indexClass = (status: PartSummaryStatus): string => {
    if (status === 'checked') return styles.partIndexChecked;
    if (status === 'non_compliant') return styles.partIndexNonCompliant;
    return '';
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
            <div className={styles.cardRadios}>
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
          </div>
        );
      })}
    </div>
  );
}
