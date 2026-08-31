import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import type { ClassifierEntry } from '../../../../classifiers/types';
import type { CheckEntry } from '../../../types.ts';
import styles from './CheckModal.module.css';

interface Props {
  level1Items: ClassifierEntry[];
  level2Items: ClassifierEntry[];
  existingEntries: CheckEntry[];
  onConfirm: (entries: CheckEntry[]) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

interface DropdownState {
  open: boolean;
  selected: string[];
  note?: string;
}

export function MassDimensionModal({
  level1Items,
  level2Items,
  existingEntries,
  onConfirm,
  isModalOpen,
  setIsModalOpen,
}: Props) {
  const { t } = useTranslation();
  const [showValidation, setValidationError] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isInitializedRef = useRef(false);

  const initialDropdowns = useMemo(() => {
    const init: Record<string, DropdownState> = {};
    level1Items.forEach((l1) => {
      const l2Items = level2Items.filter(
        (v) => v.parentKey === l1.classifierValueKey,
      );
      const existingForGroup = existingEntries
        .filter((e) => l2Items.some((l2) => l2.code === e.level2Code))
        .map((e) => e.level2Code);
      init[l1.code] = { open: false, selected: existingForGroup };
      l2Items.forEach((l2) => {
        const existingEntry = existingEntries.find(
          (e) => e.level2Code === l2.code,
        );
        init[l2.code] = {
          open: false,
          selected: existingEntry ? [l2.code] : [],
          note: existingEntry?.note ?? '',
        };
      });
    });
    return init;
  }, [existingEntries, level1Items, level2Items]);

  const [dropdowns, setDropdowns] = useState<Record<string, DropdownState>>(initialDropdowns);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }
    setDropdowns(initialDropdowns);
  }, [initialDropdowns]);

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
      // Update l1 dropdown selected if l2Code is a level2 item
      const l1Code = level1Items.find((l1) =>
        level2Items.some(
          (l2) => l2.code === l2Code && l2.parentKey === l1.classifierValueKey,
        ),
      )?.code;
      if (l1Code) {
        const l1Selected = prev[l1Code]?.selected ?? [];
        const l1Updated = updated.includes(l3Code)
          ? [...l1Selected, l3Code].filter((c, i, a) => a.indexOf(c) === i)
          : l1Selected.filter((c) => c !== l3Code);
        return {
          ...prev,
          [l2Code]: { ...prev[l2Code], selected: updated },
          [l1Code]: { ...prev[l1Code], selected: l1Updated },
        };
      }
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
    if (!isModalOpen) {
      // Clear notes for unchecked items when modal is closed
      setDropdowns((prev) => {
        const updated = { ...prev };
        level1Items.forEach((l1) => {
          const l2Items = level2Items.filter(
            (v) => v.parentKey === l1.classifierValueKey,
          );
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
  }, [isModalOpen, level1Items, level2Items]);

  const handleConfirm = () => {
    const entries: CheckEntry[] = [];
    level1Items.forEach((l1) => {
      const l2Items = level2Items.filter(
        (v) => v.parentKey === l1.classifierValueKey,
      );
      const selected = dropdowns[l1.code]?.selected ?? [];
      selected.forEach((l2Code) => {
        const l2 = l2Items.find((item) => item.code === l2Code);
        if (!l2) return;
        const note = dropdowns[l2.code]?.note;
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
    if (selected.length === 0) return t('common.select');
    const l1 = level1Items.find((item) => item.code === l2Code);
    return selected
      .map((code) => {
        const l2 = level2Items.find(
          (v) => v.code === code && v.parentKey === l1?.classifierValueKey,
        );
        if (!l2) return code;
        return l2.description ? (
          <span key={code} style={{ display: 'inline' }}>
            <strong>{l2.description}</strong>
            <Separator
              axis="vertical"
              color="secondary"
              display="inline"
              dotSize="small"
              element="span"
              spacing={0.3}
              variant="dot-only"
            />
            {l2.name}
          </span>
        ) : (
          l2.name
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
    <Modal key="massDimension" open={isModalOpen} onToggle={setIsModalOpen}>
      <Modal.Content
        width="xl"
        className={styles['doc-right-check-modal-wrapper']}
      >
        <Modal.Header
          title={t(
            'forms.massDimension.modalTitle',
            'Andmed sõiduki massi ja mõõtmete kohta',
          )}
          closeButton
        />
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
                {level1Items.map((l1) => {
                  const l2Items = level2Items.filter(
                    (v) => v.parentKey === l1.classifierValueKey,
                  );
                  const hasDescription = !!l1.description;
                  const groupKey = l1.code;
                  return (
                    <React.Fragment key={l1.code}>
                      {hasDescription ? (
                        <>
                          <tr className={styles['table-row']}>
                            <td className={styles['table-cell-name']}>
                              <Text modifiers="h4">{l1.description}</Text>
                            </td>
                            <td className={styles['table-cell-dropdown']}></td>
                          </tr>
                          <tr className={styles['table-row']}>
                            <td className={styles['table-cell-name']}>
                              <div className={styles['indented-name']}>
                                <Text>{l1.name}</Text>
                              </div>
                            </td>
                            <td className={styles['table-cell-dropdown']}>
                              <div
                                ref={(el) => {
                                  dropdownRefs.current[groupKey] = el;
                                }}
                                className={styles['dropdown-wrapper']}
                              >
                                {(() => {
                                  const state = dropdowns[groupKey] ?? {
                                    open: false,
                                    selected: [],
                                  };
                                  const label = getDropdownLabel(groupKey);
                                  const isDefault = state.selected.length === 0;
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => toggleDropdown(groupKey)}
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
                                        <div
                                          className={styles['dropdown-menu']}
                                        >
                                          {l2Items.map((l2) => {
                                            return (
                                              <div
                                                key={l2.code}
                                                className={
                                                  styles['dropdown-item']
                                                }
                                              >
                                                <Checkbox
                                                  id={`check-${l2.code}`}
                                                  name={`check-${l2.code}`}
                                                  value={l2.code}
                                                  checked={state.selected.includes(
                                                    l2.code,
                                                  )}
                                                  onChange={() =>
                                                    toggleLevel3(
                                                      groupKey,
                                                      l2.code,
                                                    )
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
                                              </div>
                                            );
                                          })}
                                          <div
                                            className={
                                              styles['clear-button-container']
                                            }
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                clearDropdown(groupKey)
                                              }
                                              className={styles['clear-button']}
                                            >
                                              {t('common.remove')}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        </>
                      ) : (
                        l2Items.map((l2, itemIndex) => {
                          const state = dropdowns[l2.code] ?? {
                            open: false,
                            selected: [],
                            note: '',
                          };
                          const isLastItem = itemIndex === l2Items.length - 1;
                          return (
                            <React.Fragment key={l2.code}>
                              <tr className={styles['table-row']}>
                                <td className={styles['table-cell-name']}>
                                  <Text modifiers="h4">{l1.name}</Text>
                                </td>
                                <td
                                  className={styles['table-cell-dropdown']}
                                ></td>
                              </tr>
                              <tr
                                key={l2.code}
                                className={
                                  isLastItem
                                    ? styles['table-row-last']
                                    : styles['table-row']
                                }
                              >
                                <td className={styles['table-cell-name']}>
                                  <div
                                    className={styles['indented-name']}
                                  ></div>
                                </td>
                                <td className={styles['table-cell-dropdown']}>
                                  <div>
                                    <Checkbox
                                      id={`check-${l2.code}`}
                                      name={`check-${l2.code}`}
                                      value={l2.code}
                                      checked={state.selected.includes(l2.code)}
                                      onChange={() =>
                                        toggleLevel3(l2.code, l2.code)
                                      }
                                      label={
                                        <Text>
                                          {l2.description && (
                                            <>
                                              <strong>{l2.description}</strong>
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
                                    <div className="mt-05">
                                      <TextArea
                                        autoGrow
                                        id="auto-grow"
                                        maxRows={10}
                                        minRows={2}
                                        maxHeight="100px"
                                        placeholder={t('common.note')}
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
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })
                      )}
                    </React.Fragment>
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
