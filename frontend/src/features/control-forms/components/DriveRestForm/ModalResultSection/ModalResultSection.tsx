import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Search,
  Card,
  Separator,
  Heading,
} from '@tedi-design-system/react/tedi';
import type { ClassifierValueData } from '../../../../classifier-values/types.ts';
import {
  CheckModal,
  type DocRightCheckEntry,
} from '../CheckModal/CheckModal.tsx';
import styles from './ModalResultSection.module.css';

interface Props {
  checks: ClassifierValueData[];
  type: 'docCheck' | 'drivingViolation' | 'massDimension';
}

export function ModalResultSection({ checks, type }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<DocRightCheckEntry[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLevel1, setSelectedLevel1] =
    useState<ClassifierValueData | null>(null);
  const modalRef = useRef<{ open: () => void }>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, position: 'bottom' as 'bottom' | 'top' });

  const level1Items = useMemo(
    () => checks.filter((v) => !v.parentKey),
    [checks],
  );
  const level2Items = useMemo(
    () =>
      checks.filter(
        (v) =>
          v.parentKey &&
          level1Items.some((l1) => l1.classifierValueKey === v.parentKey),
      ),
    [checks, level1Items],
  );
  const level3Items = useMemo(() => {
    if (type === 'massDimension') {
      return [];
    }
    return checks.filter(
      (v) =>
        v.parentKey &&
        level2Items.some((l2) => l2.classifierValueKey === v.parentKey),
    );
  }, [checks, level2Items, type]);

  const filteredLevel1 = useMemo(() => {
    if (!search.trim()) return level1Items;
    const q = search.toLowerCase();
    return level1Items.filter(
      (l1) =>
        l1.name.toLowerCase().includes(q) ||
        (l1.description && l1.description.toLowerCase().includes(q)),
    );
  }, [search, level1Items]);

  const groupedLevel1 = useMemo(() => {
    if (type === 'docCheck') {
      return { '': filteredLevel1 };
    }
    const groups: Record<string, typeof level1Items> = {};
    filteredLevel1.forEach((l1) => {
      const description = l1.description || 'Muud';
      if (!groups[description]) {
        groups[description] = [];
      }
      groups[description].push(l1);
    });
    return groups;
  }, [filteredLevel1, type]);

  const handleConfirm = (newEntries: DocRightCheckEntry[]) => {
    setEntries((prev) => {
      if (type === 'massDimension') {
        return [...newEntries];
      }
      const otherEntries = prev.filter(
        (e) => e.level1Code !== newEntries[0]?.level1Code,
      );
      return [...otherEntries, ...newEntries];
    });
    setSelectedLevel1(null);
    setDropdownOpen(false);
    setSearch('');
  };

  const handleRemoveEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const groupedEntries = useMemo(() => {
    const groups: Record<
      string,
      { name: string; description: string; entries: (DocRightCheckEntry & { idx: number })[] }
    > = {};
    entries.forEach((e, idx) => {
      if (!groups[e.level1Code]) {
        const level1Item = level1Items.find((l1) => l1.code === e.level1Code);
        groups[e.level1Code] = { 
          name: e.level1Name, 
          description: level1Item?.description || '', 
          entries: [] 
        };
      }
      groups[e.level1Code].entries.push({ ...e, idx });
    });
    return groups;
  }, [entries, level1Items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (dropdownOpen) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dropdownOpen]);

  useEffect(() => {
    if (dropdownOpen && buttonRef.current) {
      setTimeout(() => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          const dropdownHeight = dropdownRef.current?.offsetHeight || 0;
          const dropdownWidth = dropdownRef.current?.offsetWidth || 0;
          const spaceBelow = window.innerHeight - rect.bottom;
          const positionBottom = spaceBelow >= dropdownHeight;
          const top = positionBottom ? rect.bottom + 4 : rect.top - dropdownHeight - 4;
          
          setDropdownPosition({
            top,
            left: rect.right - dropdownWidth,
            position: positionBottom ? 'bottom' : 'top',
          });
        }
      }, 0);
    }
  }, [dropdownOpen]);

  return (
    <div>
      <div className={styles.header}>
        <Heading element="h5" modifiers="bold">
          {type === 'docCheck'
            ? t(
                'forms.drive_rest.sectionTitle',
                'Dokumendi või õiguse kontroll',
              )
            : type === 'massDimension'
              ? t(
                  'forms.massDimension.sectionTitle',
                  'Andmed sõiduki massi ja mõõtmete kohta',
                )
              : t(
                  'forms.drive_rest.violationSectionTitle',
                  'Sõidu- ja puhkeaja nõuete rikkumised',
                )}
        </Heading>
        <div className="pos-relative">
          <Button
            ref={buttonRef}
            type="button"
            visualType="secondary"
            onClick={() => {
              if (type === 'massDimension') {
                setSelectedLevel1(null);
                setTimeout(() => {
                  modalRef.current?.open();
                }, 100);
              } else {
                setDropdownOpen((v) => !v);
                setSearch('');
              }
            }}
          >
            {t('common.add', '+ Lisa')} {type !== 'massDimension' && '▾'}
          </Button>
          {dropdownOpen &&
            createPortal(
              <div
                ref={dropdownRef}
                className={styles.dropdown}
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  position: 'fixed',
                }}
              >
                <div className="mb-05">
                  <Search
                    id="doc-right-check-search"
                    value={search}
                    onChange={setSearch}
                    placeholder={t('common.search', 'Otsi')}
                  />
                </div>
                {Object.entries(groupedLevel1).map(([description, items]) => (
                  <div key={description}>
                    {type !== 'docCheck' && description && (
                      <div className={styles.groupHeader}>{description}</div>
                    )}
                    {items.map((l1) => (
                      <button
                        key={l1.code}
                        type="button"
                        onClick={() => {
                          setSelectedLevel1(l1);
                          setDropdownOpen(false);
                          setSearch('');
                          setTimeout(() => {
                            modalRef.current?.open();
                          }, 100);
                        }}
                        className={styles.dropdownButton}
                      >
                        {l1.name}
                      </button>
                    ))}
                  </div>
                ))}
                {filteredLevel1.length === 0 && (
                  <div className={styles.noResults}>
                    <Text>
                      {t(
                        'common.noResults',
                        'Päring ei tagastanud ühtegi tulemust',
                      )}
                    </Text>
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>

      {selectedLevel1 && (
        <CheckModal
          key={selectedLevel1.code}
          level1Item={selectedLevel1}
          level1Items={level1Items}
          level2Items={level2Items}
          level3Items={level3Items}
          existingEntries={entries}
          onConfirm={handleConfirm}
          modalRef={modalRef}
          type={type}
        />
      )}
      {type === 'massDimension' && !selectedLevel1 && (
        <CheckModal
          key="massDimension-all"
          level1Item={null}
          level1Items={level1Items}
          level2Items={level2Items}
          level3Items={level3Items}
          existingEntries={entries}
          onConfirm={handleConfirm}
          modalRef={modalRef}
          type={type}
        />
      )}

      {entries.length === 0 ? (
        <div className={styles.emptyState}>
          <Text>{t('forms.dirve_rest.empty', 'Sisu puudub')}</Text>
        </div>
      ) : (
        <div className={styles.entriesContainer}>
          {Object.values(groupedEntries).map((group) => (
            <div key={group.name}>
              {group.entries.length > 0 && (
                <div className="mb-1">
                  <strong>
                    {type === 'massDimension' ? group.description : group.name}
                  </strong>
                </div>
              )}
              {group.entries.map((entry) => (
                <div className="mb-1">
                  <Card key={entry.idx}>
                    <Card.Content className={styles.cardContent}>
                      <div
                        className={
                          type === 'docCheck'
                            ? styles.entryRowDoc
                            : type === 'massDimension'
                              ? styles.entryRowMassDimension
                              : styles.entryRow
                        }
                      >
                        {type === 'massDimension' ? (
                          <>
                            <Text>{entry.level1Name}</Text>
                            <Text>{entry.level2Name}</Text>
                            {entry.severity != '' ? (
                              <Text>{entry.level2Code}</Text>
                            ) : (
                              <div></div>
                            )}
                            {entry.note ? (
                              <Text>{entry.note}</Text>
                            ) : (
                              <div></div>
                            )}
                          </>
                        ) : type !== 'docCheck' ? (
                          <>
                            <Text>{entry.level2Description}</Text>
                            <Text>{entry.level2Name}</Text>
                            <Text>
                              <strong>{entry.severity}</strong>
                              <Separator
                                axis="vertical"
                                color="secondary"
                                display="inline"
                                dotSize="small"
                                element="span"
                                spacing={0.3}
                                variant="dot-only"
                              />
                              {entry.level3Name}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text>{entry.level2Name}</Text>
                            <Text>{entry.level3Code}</Text>
                          </>
                        )}
                        <div className="pos-rel-left">
                          <Button
                            icon="delete"
                            id="deleteDoc"
                            visualType="neutral"
                            color="danger"
                            size="small"
                            onClick={() => handleRemoveEntry(entry.idx)}
                          >
                            {t('common.remove', 'Eemalda')}
                          </Button>
                        </div>
                      </div>
                    </Card.Content>
                  </Card>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
