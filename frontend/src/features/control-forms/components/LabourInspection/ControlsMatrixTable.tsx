import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextField, Select, Text } from '@tedi-design-system/react/tedi';
import type { ControlsMatrixRow } from '../../types';
import type { ClassifierEntry } from '../../../classifiers/types';

interface ControlsMatrixTableProps {
  rows: ControlsMatrixRow[];
  transportTypes: ClassifierEntry[];
  readOnly?: boolean;
  onAddRow: (transportClass: number) => void;
  onUpdateRow: (index: number, patch: Partial<ControlsMatrixRow>) => void;
  onRemoveRow: (index: number) => void;
}

const NUMERIC_COLUMNS: Array<{
  key: keyof ControlsMatrixRow;
  labelKey: string;
}> = [
  {
    key: 'analogRecorderDrivers',
    labelKey: 'forms.labour_inspection.controlsMatrix.analogRecorderDrivers',
  },
  {
    key: 'digitalRecorderDrivers',
    labelKey: 'forms.labour_inspection.controlsMatrix.digitalRecorderDrivers',
  },
  {
    key: 'smartRecorderDrivers',
    labelKey: 'forms.labour_inspection.controlsMatrix.smartRecorderDrivers',
  },
  {
    key: 'analogRecorderWorkDays',
    labelKey: 'forms.labour_inspection.controlsMatrix.analogRecorderWorkDays',
  },
  {
    key: 'digitalRecorderWorkDays',
    labelKey: 'forms.labour_inspection.controlsMatrix.digitalRecorderWorkDays',
  },
  {
    key: 'smartRecorderWorkDays',
    labelKey: 'forms.labour_inspection.controlsMatrix.smartRecorderWorkDays',
  },
];

export function ControlsMatrixTable({
  rows,
  transportTypes,
  readOnly,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}: ControlsMatrixTableProps) {
  const { t } = useTranslation();
  const [selectedTransportClass, setSelectedTransportClass] = useState<string | null>(null);

  const labelFor = (key: number) =>
    transportTypes.find((tt) => tt.classifierValueKey === key)?.name ??
    String(key);

  const availableToAdd = transportTypes.filter(
    (tt) =>
      tt.isValid !== false &&
      !rows.some((r) => r.transportClass === tt.classifierValueKey),
  );

  const handleAddRow = () => {
    if (!selectedTransportClass) return;
    onAddRow(Number(selectedTransportClass));
    setSelectedTransportClass(null);
  };

  return (
    <div>
      {!readOnly && availableToAdd.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ maxWidth: 320, flex: 1 }}>
            <Select
              id="add-controls-matrix-row"
              label={t('forms.labour_inspection.controlsMatrix.addRow')}
              options={availableToAdd.map((tt) => ({
                value: String(tt.classifierValueKey),
                label: tt.name,
              }))}
              value={
                selectedTransportClass
                  ? { value: selectedTransportClass, label: labelFor(Number(selectedTransportClass)) }
                  : null
              }
              onChange={(val) => {
                if (val && !Array.isArray(val)) {
                  setSelectedTransportClass((val as { value: string }).value);
                } else {
                  setSelectedTransportClass(null);
                }
              }}
            />
          </div>
          <Button
            type="button"
            visualType="secondary"
            onClick={handleAddRow}
            disabled={!selectedTransportClass}
          >
            {t('common.add')}
          </Button>
        </div>
      )}
      {rows.length > 0 && (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>
                {t('forms.labour_inspection.controlsMatrix.transportClass')}
              </th>
              {NUMERIC_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={{ textAlign: 'left', padding: '0.5rem', minWidth: 110 }}
                >
                  {t(col.labelKey)}
                </th>
              ))}
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.transportClass}>
                <td style={{ padding: '0.5rem' }}>
                  {labelFor(row.transportClass)}
                </td>
                {NUMERIC_COLUMNS.map((col) => (
                  <td key={col.key} style={{ padding: '0.5rem' }}>
                    {readOnly ? (
                      <Text>{String(row[col.key] ?? 0)}</Text>
                    ) : (
                      <TextField
                        id={`matrix-${index}-${col.key}`}
                        label={t(col.labelKey)}
                        hideLabel
                        value={String(row[col.key] ?? 0)}
                        onChange={(v) => {
                          const numeric = v.replace(/\D/g, '');
                          onUpdateRow(index, {
                            [col.key]: parseInt(numeric, 10) || 0,
                          });
                        }}
                        input={{ maxLength: 4 }}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td style={{ padding: '0.5rem' }}>
                    <Button
                      type="button"
                      visualType="link"
                      color="danger"
                      icon="delete"
                      onClick={() => onRemoveRow(index)}
                    >
                      {t('common.remove')}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
