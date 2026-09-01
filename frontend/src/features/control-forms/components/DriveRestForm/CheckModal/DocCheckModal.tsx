import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Modal,
  Alert,
  Checkbox,
} from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../../classifiers/types';
import type { CheckEntry } from '../../../types.ts';
import styles from './CheckModal.module.css';

interface Props {
  level1Item: ClassifierEntry | null;
  level2Items: ClassifierEntry[];
  level3Items: ClassifierEntry[];
  existingEntries: CheckEntry[];
  onConfirm: (entries: CheckEntry[]) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

interface DropdownState {
  open: boolean;
  selected: string[];
}

export function DocCheckModal({
  level1Item,
  level2Items,
  level3Items,
  existingEntries,
  onConfirm,
  isModalOpen,
  setIsModalOpen,
}: Props) {
  const { t } = useTranslation();
  const [showValidation, setValidationError] = useState(false);

  const myLevel2 = useMemo(
    () =>
      level1Item
        ? level2Items.filter(
            (v) => v.parentKey === level1Item.classifierValueKey,
          )
        : level2Items,
    [level2Items, level1Item],
  );

  const initialDropdowns = useMemo(() => {
    const init: Record<string, DropdownState> = {};
    myLevel2.forEach((l2) => {
      const existingForL2 = existingEntries
        .filter(
          (e) => level1Item?.code === e.level1Code && e.level2Code === l2.code,
        )
        .map((e) => e.level3Code);
      init[l2.code] = { open: false, selected: existingForL2 };
    });
    return init;
  }, [level1Item?.code, existingEntries, myLevel2]);

  const [dropdowns, setDropdowns] = useState<Record<string, DropdownState>>(initialDropdowns);

  const toggleLevel3 = (l2Code: string, l3Code: string) => {
    setDropdowns((prev) => {
      const current = prev[l2Code]?.selected ?? [];
      const updated = current.includes(l3Code)
        ? current.filter((c) => c !== l3Code)
        : [...current, l3Code];
      return { ...prev, [l2Code]: { ...prev[l2Code], selected: updated } };
    });
    setValidationError(false);
  };

  const handleConfirm = () => {
    const entries: CheckEntry[] = [];
    myLevel2.forEach((l2) => {
      const selected = dropdowns[l2.code]?.selected ?? [];
      selected.forEach((l3Code) => {
        const l3 = level3Items.find(
          (v) => v.code === l3Code && v.parentKey === l2.classifierValueKey,
        );
        if (l3 && level1Item) {
          entries.push({
            level1Code: level1Item.code,
            level1Name: level1Item.name,
            level2Code: l2.code,
            level2Name: l2.name,
            level2Description: l2.description ?? '',
            level3Code: l3.code,
            level3Name: l3.name,
            severity: l3.description ?? '',
            documentCode: l2.code,
            documentName: l2.name,
            severityCode: l3.name,
            violationCode: l3.code,
          });
        }
      });
    });

    if (entries.length === 0) {
      setValidationError(true);
      return;
    }

    onConfirm(entries);
    setIsModalOpen(false);
  };

  return (
    <Modal key={level1Item?.code} open={isModalOpen} onToggle={setIsModalOpen}>
      <Modal.Content
        width="xl"
        className={styles['doc-right-check-modal-wrapper']}
      >
        <Modal.Header title={level1Item?.name} closeButton />
        <Modal.Body>
          <div className={styles['modal-body-wrapper']}>
            {showValidation && (
              <div className="mb-1">
                <Alert
                  type="danger"
                  size="small"
                  onClose={() => setValidationError(false)}
                >
                  {t(
                    'forms.drive_rest.selectAtLeastOne',
                    'Valige vähemalt üks rikkumine.',
                  )}
                </Alert>
              </div>
            )}
            <table className={styles.table}>
              <tbody>
                {myLevel2.map((l2) => {
                  const l3Options = level3Items.filter(
                    (v) => v.parentKey === l2.classifierValueKey,
                  );
                  const state = dropdowns[l2.code] ?? {
                    open: false,
                    selected: [],
                  };
                  return (
                    <tr key={l2.code} className={styles['table-row']}>
                      <td className={styles['table-cell-name']}>
                        <Text>{l2.name}</Text>
                      </td>
                      <td className={styles['table-cell-dropdown']}>
                        <div>
                          {l3Options.map((l3) => (
                            <Checkbox
                              key={l3.code}
                              id={`check-${l2.code}-${l3.code}`}
                              name={`check-${l2.code}-${l3.code}`}
                              value={l3.code}
                              checked={state.selected.includes(l3.code)}
                              onChange={() => toggleLevel3(l2.code, l3.code)}
                              label={<strong>{l3.name}</strong>}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Closer>
            <Button type="button" visualType="secondary">
              {t('common.cancel')}
            </Button>
          </Modal.Closer>
          <Button type="button" onClick={handleConfirm}>
            {t('common.select')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
