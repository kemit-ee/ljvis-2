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
  Modal,
  Alert,
  Separator,
} from '@tedi-design-system/react/tedi';
import type { ClassifierValueData } from '../../../../classifier-values/types.ts';
import styles from './CheckModal.module.css';

export interface DocRightCheckEntry {
  level1Code: string;
  level1Name: string;
  level2Code: string;
  level2Name: string;
  level3Code: string;
  level3Name: string;
  severity: string;
}

interface Props {
  level1Item: ClassifierValueData;
  level2Items: ClassifierValueData[];
  level3Items: ClassifierValueData[];
  existingEntries: DocRightCheckEntry[];
  onConfirm: (entries: DocRightCheckEntry[]) => void;
  triggerLabel?: string;
  modalRef?: React.RefObject<{ open: () => void }>;
  isDocCheck: boolean;
}

interface DropdownState {
  open: boolean;
  selected: string[];
}

export function CheckModal({
  level1Item,
  level2Items,
  level3Items,
  existingEntries,
  onConfirm,
  triggerLabel,
  modalRef,
  isDocCheck,
}: Props) {
  const { t } = useTranslation();
  const [dropdowns, setDropdowns] = useState<Record<string, DropdownState>>({});
  const [showValidation, setValidationError] = useState(false);
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
      level2Items.filter((v) => v.parentKey === level1Item.classifierValueKey),
    [level2Items, level1Item.classifierValueKey],
  );

  const getLevel3ForLevel2 = (l2ClassifierValueKey: number) =>
    level3Items.filter((v) => v.parentKey === l2ClassifierValueKey);

  const buildDropdowns = (l2List: typeof myLevel2) => {
    const init: Record<string, DropdownState> = {};
    l2List.forEach((l2) => {
      const existingForL2 = existingEntries
        .filter(
          (e) => e.level1Code === level1Item.code && e.level2Code === l2.code,
        )
        .map((e) => e.level3Code);
      init[l2.code] = { open: false, selected: existingForL2 };
    });
    return init;
  };

  useEffect(() => {
    setDropdowns(buildDropdowns(myLevel2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level1Item.code]);

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
    const entries: DocRightCheckEntry[] = [];
    myLevel2.forEach((l2) => {
      const selected = dropdowns[l2.code]?.selected ?? [];
      selected.forEach((l3Code) => {
        const l3 = level3Items.find(
          (v) => v.code === l3Code && v.parentKey === l2.classifierValueKey,
        );
        if (l3) {
          entries.push({
            level1Code: level1Item.code,
            level1Name: level1Item.name,
            level2Code: l2.code,
            level2Name: l2.name,
            level3Code: l3.code,
            level3Name: l3.name,
            severity: l3.description ?? '',
          });
        }
      });
    });

    if (entries.length === 0) {
      setValidationError(true);
      return;
    }

    onConfirm(entries);
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
        return !isDocCheck && l3.description ? (
          <Text key={code}>
            <strong>{l3.name}</strong>
            <Separator
              axis="vertical"
              color="secondary"
              display="inline"
              dotSize="small"
              element="span"
              spacing={0.3}
              variant="dot-only"
            />
            {l3.description}
          </Text>
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
    <Modal key={level1Item.code}>
      <Modal.Trigger>
        <Button ref={triggerRef} className={styles['trigger-button']}>
          {triggerLabel}
        </Button>
      </Modal.Trigger>
      <Modal.Content
        width="xl"
        className={styles['doc-right-check-modal-wrapper']}
      >
        <Modal.Header title={level1Item.name} closeButton />
        <Modal.Body>
          <div
            className={styles['modal-body-wrapper']}
            style={{
              minHeight:
                myLevel2.length === 1
                  ? '20vh'
                  : myLevel2.length === 2
                    ? '25vh'
                    : myLevel2.length === 3
                      ? '35vh'
                      : '25vh',
            }}
          >
            {showValidation && (
              <div className="mb-1">
                <Alert
                  type="danger"
                  size="small"
                  onClose={() => setValidationError(false)}
                >
                  {t(
                    'forms.docRightCheck.selectAtLeastOne',
                    'Valige vähemalt üks rikkumine.',
                  )}
                </Alert>
              </div>
            )}
            <table className={styles.table}>
              <tbody>
                {myLevel2.map((l2) => {
                  const l3Options = getLevel3ForLevel2(l2.classifierValueKey);
                  const state = dropdowns[l2.code] ?? {
                    open: false,
                    selected: [],
                  };
                  const label = getDropdownLabel(l2.code);
                  const isDefault = state.selected.length === 0;
                  return (
                    <tr key={l2.code} className={styles['table-row']}>
                      <td className={styles['table-cell-name']}>
                        <Text>{l2.name}</Text>
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
                              l3Options.length > 0 && toggleDropdown(l2.code)
                            }
                            disabled={l3Options.length === 0}
                            className={`${styles['dropdown-trigger-button']} ${isDefault ? styles['is-default'] : ''}`}
                          >
                            <span className={styles['dropdown-label']}>
                              {label}
                            </span>
                            <span className={styles['dropdown-arrow']}>▾</span>
                          </button>
                          {state.open && (
                            <div className={styles['dropdown-menu']}>
                              {l3Options.map((l3) => (
                                <label
                                  key={l3.code}
                                  className={styles['dropdown-item']}
                                >
                                  <input
                                    type="checkbox"
                                    checked={state.selected.includes(l3.code)}
                                    onChange={() =>
                                      toggleLevel3(l2.code, l3.code)
                                    }
                                  />
                                  <span>
                                    {isDocCheck ? (
                                      <strong>{l3.name}</strong>
                                    ) : (
                                      <Text>
                                        <strong>{l3.name}</strong>
                                        <Separator
                                          axis="vertical"
                                          color="secondary"
                                          display="inline"
                                          dotSize="small"
                                          element="span"
                                          spacing={0.3}
                                          variant="dot-only"
                                        />
                                        {l3.description}
                                      </Text>
                                    )}
                                  </span>
                                </label>
                              ))}
                              <div className={styles['clear-button-container']}>
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
            {t('forms.docRightCheck.select', 'Vali')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
