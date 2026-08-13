import { useTranslation } from 'react-i18next';
import { ChoiceGroup } from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { PartSummaryEntry, PartSummaryStatus } from '../../types';

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

  const statusOf = (partCode: string): PartSummaryStatus =>
    partsSummary.find((p) => p.partCode === partCode)?.status ?? 'not_checked';

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '4px 8px' }}>
            {t('forms.technical_check.parts.column')}
          </th>
          <th style={{ textAlign: 'left', padding: '4px 8px' }}>
            {t('forms.technical_check.parts.statusColumn')}
          </th>
        </tr>
      </thead>
      <tbody>
        {parts.map((part) => (
          <tr key={part.classifierValueKey}>
            <td style={{ padding: '4px 8px' }}>
              {part.code} — {part.name}
            </td>
            <td style={{ padding: '4px 8px' }}>
              <ChoiceGroup
                id={`part-status-${part.code}`}
                name={`part-status-${part.code}`}
                label={t('forms.technical_check.parts.statusColumn')}
                hideLabel
                inputType="radio"
                direction="row"
                value={statusOf(part.code)}
                onChange={(val) =>
                  !disabled && onStatusChange(part.code, val as PartSummaryStatus)
                }
                items={[
                  {
                    id: `part-status-${part.code}-not-checked`,
                    value: 'not_checked',
                    label: t('forms.technical_check.parts.notChecked'),
                    disabled,
                  },
                  {
                    id: `part-status-${part.code}-checked`,
                    value: 'checked',
                    label: t('forms.technical_check.parts.checked'),
                    disabled,
                  },
                  {
                    id: `part-status-${part.code}-non-compliant`,
                    value: 'non_compliant',
                    label: t('forms.technical_check.parts.nonCompliant'),
                    disabled,
                  },
                ]}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
