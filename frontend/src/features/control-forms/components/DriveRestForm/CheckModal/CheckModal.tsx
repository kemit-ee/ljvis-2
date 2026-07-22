import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useImperativeHandle,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  TextArea,
  Modal,
  Alert,
  Separator,
  Checkbox,
} from '@tedi-design-system/react/tedi';
import type { ClassifierValueData } from '../../../../classifier-values/types.ts';
import styles from './CheckModal.module.css';

export interface DocRightCheckEntry {
  level1Code: string;
  level1Name: string;
  level2Code: string;
  level2Name: string;
  level2Description: string;
  level3Code: string;
  level3Name: string;
  severity: string;
  note?: string;
}

interface Props {
  level1Item: ClassifierValueData | null;
  level1Items: ClassifierValueData[];
  level2Items: ClassifierValueData[];
  level3Items: ClassifierValueData[];
  existingEntries: DocRightCheckEntry[];
  onConfirm: (entries: DocRightCheckEntry[]) => void;
  triggerLabel?: string;
  modalRef?: React.RefObject<{ open: () => void }>;
  type: 'docCheck' | 'drivingViolation' | 'massDimension';
}

interface DropdownState {
  open: boolean;
  selected: string[];
  note?: string;
}

export function CheckModal({
  level1Item,
  level1Items,
  level2Items,
  level3Items,
  existingEntries,
  onConfirm,
  triggerLabel,
  modalRef,
  type,
}: Props) {
  const { t } = useTranslation();
  const [dropdowns, setDropdowns] = useState<Record<string, DropdownState>>({});
  const [showValidation, setValidationError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(modalRef, () => ({
    open: () => {
      if (triggerRef.current) {
        triggerRef.current.click();
      }
    },
  }));

  const myLevel2 = useMemo(
    () =>
      level1Item
        ? level2Items.filter((v) => v.parentKey === level1Item.classifierValueKey)
        : level2Items,
    [level2Items, level1Item],
  );

  const myLevel1 = useMemo(
    () => level1Item ? [level1Item] : level1Items,
    [level1Item, level1Items],
  );

  const groupedLevel2 = useMemo(() => {
    if (type === 'docCheck') {
      return { '': myLevel2 };
    }
    if (type === 'massDimension') {
      const groups: Record<string, typeof myLevel2> = {};
      const ungrouped: typeof myLevel2 = [];
      myLevel2.forEach((l2) => {
        const description = l2.description;
        if (!description) {
          ungrouped.push(l2);
        } else {
          if (!groups[description]) {
            groups[description] = [];
          }
          groups[description].push(l2);
        }
      });
      return { ...groups, '': ungrouped };
    }
    const groups: Record<string, typeof myLevel2> = {};
    myLevel2.forEach((l2) => {
      const description = l2.description || 'Muud';
      if (!groups[description]) {
        groups[description] = [];
      }
      groups[description].push(l2);
    });
    return groups;
  }, [myLevel2, type]);

  const getLevel3ForLevel2 = (l2ClassifierValueKey: number) =>
    level3Items.filter((v) => v.parentKey === l2ClassifierValueKey);

  const buildDropdowns = (l2List: typeof myLevel2) => {
    const init: Record<string, DropdownState> = {};
    l2List.forEach((l2) => {
      const existingForL2 = existingEntries
        .filter(
          (e) => (type === 'massDimension' || level1Item?.code === e.level1Code) && e.level2Code === l2.code,
        )
        .map((e) => e.level3Code);
      init[l2.code] = { open: false, selected: existingForL2 };
    });
    return init;
  };

  useEffect(() => {
    setDropdowns(buildDropdowns(myLevel2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level1Item?.code, type === 'massDimension' ? existingEntries : undefined]);

  const toggleDropdown = (l2Code: string) => {
    setDropdowns((prev) => ({
      ...prev,
      [l2Code]: { ...prev[l2Code], open: !prev[l2Code]?.open },
    }));
  };

  const toggleLevel3 = (l2Code: string, l3Code: string) => {
    setDropdowns((prev) => {
      if (type === 'massDimension') {
        // For massDimension, checkboxes are mutually exclusive within each level 1 row
        // Allow unchecking if the same item is clicked
        const current = prev[l2Code]?.selected ?? [];
        if (current.includes(l3Code)) {
          return { ...prev, [l2Code]: { ...prev[l2Code], selected: [] } };
        }
        return { ...prev, [l2Code]: { ...prev[l2Code], selected: [l3Code] } };
      }
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

  useEffect(() => {
    if (!isModalOpen && type === 'massDimension') {
      // Clear notes for unchecked items when modal is closed
      setDropdowns((prev) => {
        const updated = { ...prev };
        myLevel1.forEach((l1) => {
          const l2Items = level2Items.filter((v) => v.parentKey === l1.classifierValueKey);
          l2Items.forEach((l2) => {
            const state = updated[l2.code];
            if (state && !state.selected.includes(l2.code) && state.note) {
              updated[l2.code] = { ...state, note: '' };
            }
          });
        });
        return updated;
      });
    }
  }, [isModalOpen, type, myLevel1, level2Items]);

  const handleConfirm = () => {
    const entries: DocRightCheckEntry[] = [];
    if (type === 'massDimension') {
      // For massDimension, iterate over level2Items filtered by each level1
      myLevel1.forEach((l1) => {
        const l2Items = level2Items.filter((v) => v.parentKey === l1.classifierValueKey);
        l2Items.forEach((l2) => {
          const selected = dropdowns[l2.code]?.selected ?? [];
          const note = dropdowns[l2.code]?.note;
          if (selected.length > 0) {
            entries.push({
              level1Code: l1.code,
              level1Name: l1.name,
              level2Code: l2.code,
              level2Name: l2.name,
              level2Description: l2.description ?? '',
              level3Code: l2.code,
              level3Name: l2.name,
              severity: l2.description ?? '',
              note: note,
            });
          }
        });
      });
    } else {
      // For other types, iterate over myLevel2
      myLevel2.forEach((l2) => {
        const selected = dropdowns[l2.code]?.selected ?? [];
        const note = dropdowns[l2.code]?.note;
        selected.forEach((l3Code) => {
          const l3 = level3Items.find(
            (v) => v.code === l3Code && v.parentKey === l2.classifierValueKey,
          );
          if (l3) {
            const level1 = myLevel1.find((l1) => l1.classifierValueKey === l2.parentKey);
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
                note: note,
              });
            }
          }
        });
      });
    }

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
        return type !== 'docCheck' && l3.description ? (
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
    <Modal key={level1Item?.code || 'massDimension'} open={isModalOpen} onToggle={setIsModalOpen}>
      <Modal.Trigger>
        <Button ref={triggerRef} className={styles['trigger-button']}>
          {triggerLabel}
        </Button>
      </Modal.Trigger>
      <Modal.Content
        width="xl"
        className={styles['doc-right-check-modal-wrapper']}
      >
        <Modal.Header title={type === 'massDimension' ? t('forms.massDimension.modalTitle', 'Andmed sõiduki massi ja mõõtmete kohta') : level1Item?.name} closeButton />
        <Modal.Body>
          <div
            className={styles['modal-body-wrapper']}

          >
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
                {type === 'docCheck'
                  ? myLevel2.map((l2) => {
                      const l3Options = getLevel3ForLevel2(
                        l2.classifierValueKey,
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
                                  onChange={() =>
                                    toggleLevel3(l2.code, l3.code)
                                  }
                                  label={<strong>{l3.name}</strong>}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : type === 'massDimension'
                    ? myLevel1.map((l1) => {
                        const l2Items = level2Items.filter((v) => v.parentKey === l1.classifierValueKey);
                        return (
                          <React.Fragment key={l1.code}>
                            <tr className={styles['table-row']}>
                              <td className={styles['table-cell-name']}>
                                <Text modifiers="h4">{l1.name}</Text>
                              </td>
                              <td className={styles['table-cell-dropdown']}></td>
                            </tr>
                            {l2Items.map((l2, itemIndex) => {
                              const state = dropdowns[l2.code] ?? {
                                open: false,
                                selected: [],
                                note: '',
                              };
                              const isLastItem = itemIndex === l2Items.length - 1;
                              const hasNote = !l2.description; // Kõrgus, Teljekoormus have notes
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
                                    {/* Hide name for massDimension as it's shown in checkbox label */}
                                  </td>
                                  <td className={styles['table-cell-dropdown']}>
                                    <div>
                                      <Checkbox
                                        id={`check-${l2.code}`}
                                        name={`check-${l2.code}`}
                                        value={l2.code}
                                        checked={state.selected.includes(
                                          l2.code,
                                        )}
                                        onChange={() =>
                                          toggleLevel3(l2.code, l2.code)
                                        }
                                        label={
                                          <Text>
                                            {l2.description && (
                                              <>
                                                <strong>
                                                  {l2.description}
                                                </strong>
                                                <Separator
                                                  axis="vertical"
                                                  color="secondary"
                                                  display="inline"
                                                  dotSize="small"
                                                  element="span"
                                                  spacing={0.3}
                                                  variant="dot-only"
                                                />
                                              </>
                                            )}
                                            {l2.name}
                                          </Text>
                                        }
                                      />
                                      {hasNote && (
                                        <div className="mt-05">
                                          <TextArea
                                            autoGrow
                                            id="auto-grow"
                                            maxRows={10}
                                            minRows={2}
                                            maxHeight="100px"
                                            placeholder={t(
                                              'common.note',
                                              'Märkus',
                                            )}
                                            value={state.note || ''}
                                            onChange={(value) =>
                                              setDropdowns((prev) => ({
                                                ...prev,
                                                [l2.code]: {
                                                  ...prev[l2.code],
                                                  note: value,
                                                },
                                              }))
                                            }
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })
                    : Object.entries(groupedLevel2).map(
                        ([description, items]) => (
                          <React.Fragment key={description}>
                            {description && (
                              <tr
                                key={`header-${description}`}
                                className={styles['table-row']}
                              >
                                <td className={styles['table-cell-name']}>
                                  <Text modifiers="h4">{description}</Text>
                                </td>
                                <td
                                  className={styles['table-cell-dropdown']}
                                ></td>
                              </tr>
                            )}
                            {items.map((l2, itemIndex) => {
                              const l3Options = getLevel3ForLevel2(
                                l2.classifierValueKey,
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
                                        <span
                                          className={styles['dropdown-label']}
                                        >
                                          {label}
                                        </span>
                                        <span
                                          className={styles['dropdown-arrow']}
                                        >
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
                                                    <strong>
                                                      {l3.description}
                                                    </strong>
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
                                            className={
                                              styles['clear-button-container']
                                            }
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                clearDropdown(l2.code)
                                              }
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
                        ),
                      )}
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
