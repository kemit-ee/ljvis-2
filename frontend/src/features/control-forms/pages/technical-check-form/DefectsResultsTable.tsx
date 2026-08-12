import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { PartDefectEntry } from '../../types';

interface DefectsResultsTableProps {
  parts: ClassifierEntry[];
  defectsByPartKey: Map<number, ClassifierEntry[]>;
  partsDefects: PartDefectEntry[];
  onRemove: (partCode: string, defectCode: string) => void;
  disabled?: boolean;
}

/** LJVIS2-72 §4 (UC-11/UC-12): table of all currently-selected defects across all
 * parts, with a per-row delete (Kustuta) action. Removing a defect here does not
 * remove the corresponding auto-generated line from "Märkused" (LJVIS2-72 §4). */
export function DefectsResultsTable({
  parts,
  defectsByPartKey,
  partsDefects,
  onRemove,
  disabled,
}: DefectsResultsTableProps) {
  const { t } = useTranslation();

  const resolveDefectName = (partCode: string, defectCode: string): string => {
    const part = parts.find((p) => p.code === partCode);
    const defects = part ? defectsByPartKey.get(part.classifierValueKey) ?? [] : [];
    return defects.find((d) => d.code === defectCode)?.name ?? defectCode;
  };

  const resolvePartLabel = (partCode: string): string => {
    const part = parts.find((p) => p.code === partCode);
    return part ? `${part.code} — ${part.name}` : partCode;
  };

  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h4" className="mb-1">
          {t('forms.technical_check.resultsTable.title')}
        </Heading>
        {partsDefects.length === 0 ? (
          <Text>{t('forms.technical_check.resultsTable.empty')}</Text>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>
                  {t('forms.technical_check.resultsTable.part')}
                </th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>
                  {t('forms.technical_check.resultsTable.defect')}
                </th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>
                  {t('forms.technical_check.resultsTable.severity')}
                </th>
                <th style={{ padding: '4px 8px' }} />
              </tr>
            </thead>
            <tbody>
              {partsDefects.map((d) => (
                <tr key={`${d.partCode}-${d.defectCode}`}>
                  <td style={{ padding: '4px 8px' }}>{resolvePartLabel(d.partCode)}</td>
                  <td style={{ padding: '4px 8px' }}>{resolveDefectName(d.partCode, d.defectCode)}</td>
                  <td style={{ padding: '4px 8px' }}>{d.severity}</td>
                  <td style={{ padding: '4px 8px' }}>
                    <Button
                      icon="delete"
                      visualType="neutral"
                      color="danger"
                      size="small"
                      disabled={disabled}
                      onClick={() => onRemove(d.partCode, d.defectCode)}
                    >
                      {t('common.delete')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card.Content>
    </Card>
  );
}
