import { useTranslation } from 'react-i18next';
import { Button, TextField, Card } from '@tedi-design-system/react/tedi';
import type { DangerousGoodEntry } from '../../types';

interface DangerousGoodsTableProps {
  rows: DangerousGoodEntry[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<DangerousGoodEntry>) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

/** LJVIS2-141 §4.7: repeatable "veetavad ohtlikud kaubad" rows. */
export function DangerousGoodsTable({
  rows,
  onAdd,
  onUpdate,
  onRemove,
  disabled,
}: DangerousGoodsTableProps) {
  const { t } = useTranslation();

  return (
    <div>
      {rows.length === 0 && (
        <p className="mb-1">{t('forms.adr.dangerousGoods.empty')}</p>
      )}
      {rows.map((row, index) => (
        <Card key={index} className="mb-1">
          <Card.Content>
            <div className="grid-row">
              <TextField
                id={`dangerousGoods-${index}-unNumber`}
                label={t('forms.adr.dangerousGoods.unNumber')}
                value={row.unNumber}
                onChange={(v) => onUpdate(index, { unNumber: v })}
                disabled={disabled}
              />
              <TextField
                id={`dangerousGoods-${index}-packagingGroup`}
                label={t('forms.adr.dangerousGoods.packagingGroup')}
                value={row.packagingGroup}
                onChange={(v) => onUpdate(index, { packagingGroup: v })}
                disabled={disabled}
              />
              <TextField
                id={`dangerousGoods-${index}-quantity`}
                label={t('forms.adr.dangerousGoods.quantity')}
                value={row.quantity}
                onChange={(v) => onUpdate(index, { quantity: v })}
                disabled={disabled}
              />
              <TextField
                id={`dangerousGoods-${index}-unitCode`}
                label={t('forms.adr.dangerousGoods.unitCode')}
                value={row.unitCode}
                onChange={(v) => onUpdate(index, { unitCode: v })}
                disabled={disabled}
              />
            </div>
            {!disabled && (
              <Button
                type="button"
                visualType="neutral"
                color="danger"
                size="small"
                icon="delete"
                onClick={() => onRemove(index)}
              >
                {t('common.remove', 'Eemalda')}
              </Button>
            )}
          </Card.Content>
        </Card>
      ))}
      {!disabled && (
        <Button type="button" visualType="secondary" onClick={onAdd}>
          {t('forms.adr.dangerousGoods.addRow')}
        </Button>
      )}
    </div>
  );
}
