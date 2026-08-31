import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Modal,
  Alert,
  Separator,
  Checkbox,
} from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../../classifiers/types';
import type { CheckEntry } from '../../../types.ts';
import styles from './CheckModal.module.css';

interface Props {
  level1Item: ClassifierEntry | null;
  level1Items: ClassifierEntry[];
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

export function DrivingViolationModal({
  level1Item,
  level1Items,
  level2Items,
  level3Items,
  existingEntries,
  onConfirm,
  isModalOpen,
  setIsModalOpen,
}: Props) {
  const { t } = useTranslation();
  const [dropdowns, setDropdowns] = useState<Record<string, DropdownState>>({});
  const [showValidation, setValidationError] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const myLevel2 = useMemo(
    () =>
      level1Item
        ? level2Items.filter(
            (v) => v.parentKey === level1Item.classifierValueKey,
          )
        : level2Items,
    [level2Items, level1Item],
  );

  const myLevel1 = level1Item ? [level1Item] : level1Items;

  const groupedLevel2 = useMemo(() => {
    const groups: Record<string, typeof myLevel2> = {};
    myLevel2.forEach((l2) => {
      const description = l2.description || 'Muud';
      if (!groups[description]) {
        groups[description] = [];
      }
      groups[description].push(l2);
    });
    return groups;
  }, [myLevel2]);

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

  useEffect(() => {
    setDropdowns((prev) => {
      const hasChanged = myLevel2.some(
        (l2) =>
          JSON.stringify(prev[l2.code]?.selected) !==
          JSON.stringify(initialDropdowns[l2.code].selected),
      );
      return hasChanged ? initialDropdowns : prev;
    });
  }, [initialDropdowns, myLevel2]);

  const toggleDropdown = (l2Code: string) => {
    setDropdowns((prev) => ({
      ...prev,
      [l2Code]: { ...prev[l2Code], open: !prev[l2Code]?.open },
    }));
  };

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

  const clearDropdown = (l2Code: string) => {
    setDropdowns((prev) => ({
      ...prev,
      [l2Code]: { ...prev[l2Code], selected: [], open: false },
    }));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach((l2Code) => {
        const ref = dropdownRefs.current[l2Code];
        if (ref && !ref.contains(e.target as Node)) {
          setDropdowns((prev) =>
            prev[l2Code]?.open
              ? { ...prev, [l2Code]: { ...prev[l2Code], open: false } }
              : prev,
          );
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirm = () => {
    const entries: CheckEntry[] = [];
    myLevel2.forEach((l2) => {
      const selected = dropdowns[l2.code]?.selected ?? [];
      selected.forEach((l3Code) => {
        const l3 = level3Items.find(
          (v) => v.code === l3Code && v.parentKey === l2.classifierValueKey,
        );
        if (l3) {
          const level1 = myLevel1.find(
            (l1) => l1.classifierValueKey === l2.parentKey,
          );
          if (level1) {
            entries.push({
              level1Code: level1.code,
              level1Name: level1.name,
              level2Code: l2.code,
              level2Name: l2.name,
              level2Description: l2.description ?? '',
              level3Code: l3.code,
              level3Name: l3.name,
              severity: l3.description ?? '',
            });
          }
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

  const getDropdownLabel = (l2Code: string) => {
    const selected = dropdowns[l2Code]?.selected ?? [];
    if (selected.length === 0) return t('common.select', 'Vali');
    const l2 = myLevel2.find((item) => item.code === l2Code);
    return selected
      .map((code) => {
        const l3 = level3Items.find(
          (v) => v.code === code && v.parentKey === l2?.classifierValueKey,
        );
        if (!l3) return code;
        return l3.description ? (
          <span key={code} style={{ display: 'inline' }}>
            <strong>{l3.description}</strong>
            <Separator
              axis="vertical"
              color="secondary"
              display="inline"
              dotSize="small"
              element="span"
              spacing={0.3}
              variant="dot-only"
            />
            {l3.name}
          </span>
        ) : (
          l3.name
        );
      })
      .reduce(
        (acc, item, idx) => {
          if (idx === 0) return [item];
          return [...acc, ', ', item];
        },
        [] as (string | JSX.Element)[],
      );
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
                {Object.entries(groupedLevel2).map(([description, items]) => (
                  <React.Fragment key={description}>
                    {description && (
                      <tr
                        key={`header-${description}`}
                        className={styles['table-row']}
                      >
                        <td className={styles['table-cell-name']}>
                          <Text modifiers="h4">{description}</Text>
                        </td>
                        <td className={styles['table-cell-dropdown']}></td>
                      </tr>
                    )}
                    {items.map((l2, itemIndex) => {
                      const l3Options = level3Items.filter(
                        (v) => v.parentKey === l2.classifierValueKey,
                      );
                      const state = dropdowns[l2.code] ?? {
                        open: false,
                        selected: [],
                      };
                      const label = getDropdownLabel(l2.code);
                      const isDefault = state.selected.length === 0;
                      const isLastItem = itemIndex === items.length - 1;
                      return (
                        <tr
                          key={l2.code}
                          className={
                            isLastItem
                              ? styles['table-row-last']
                              : styles['table-row']
                          }
                        >
                          <td className={styles['table-cell-name']}>
                            <div className={styles['indented-name']}>
                              <Text>{l2.name}</Text>
                            </div>
                          </td>
                          <td className={styles['table-cell-dropdown']}>
                            <div
                              ref={(el) => {
                                dropdownRefs.current[l2.code] = el;
                              }}
                              className={styles['dropdown-wrapper']}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  l3Options.length > 0 &&
                                  toggleDropdown(l2.code)
                                }
                                disabled={l3Options.length === 0}
                                className={`${styles['dropdown-trigger-button']} ${isDefault ? styles['is-default'] : ''}`}
                              >
                                <span className={styles['dropdown-label']}>
                                  {label}
                                </span>
                                <span className={styles['dropdown-arrow']}>
                                  ▾
                                </span>
                              </button>
                              {state.open && (
                                <div className={styles['dropdown-menu']}>
                                  {l3Options.map((l3) => (
                                    <div
                                      key={l3.code}
                                      className={styles['dropdown-item']}
                                    >
                                      <Checkbox
                                        id={`check-${l2.code}-${l3.code}`}
                                        name={`check-${l2.code}-${l3.code}`}
                                        value={l3.code}
                                        checked={state.selected.includes(
                                          l3.code,
                                        )}
                                        onChange={() =>
                                          toggleLevel3(l2.code, l3.code)
                                        }
                                        label={
                                          <Text>
                                            <strong>{l3.description}</strong>
                                            <Separator
                                              axis="vertical"
                                              color="secondary"
                                              display="inline"
                                              dotSize="small"
                                              element="span"
                                              spacing={0.3}
                                              variant="dot-only"
                                            />
                                            {l3.name}
                                          </Text>
                                        }
                                      />
                                    </div>
                                  ))}
                                  <div
                                    className={styles['clear-button-container']}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => clearDropdown(l2.code)}
                                      className={styles['clear-button']}
                                    >
                                      {t('common.remove', 'Eemalda')}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Closer>
            <Button type="button" visualType="secondary">
              {t('common.cancel', 'Tühista')}
            </Button>
          </Modal.Closer>
          <Button type="button" onClick={handleConfirm}>
            {t('common.select', 'Vali')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
