import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Text, Search, Card } from '@tedi-design-system/react/tedi';
import type { ClassifierValueData } from '../../../classifier-values/types';
import {
  CheckModal,
  type DocRightCheckEntry,
} from './CheckModal/CheckModal.tsx';
import styles from './DocRightCheckSection.module.css';

interface Props {
  docRightChecks: ClassifierValueData[];
}

export function DocRightCheckSection({ docRightChecks }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<DocRightCheckEntry[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLevel1, setSelectedLevel1] =
    useState<ClassifierValueData | null>(null);
  const modalRef = useRef<{ open: () => void }>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const level1Items = useMemo(
    () => docRightChecks.filter((v) => !v.parentKey),
    [docRightChecks],
  );
  const level2Items = useMemo(
    () =>
      docRightChecks.filter(
        (v) =>
          v.parentKey &&
          level1Items.some((l1) => l1.classifierValueKey === v.parentKey),
      ),
    [docRightChecks, level1Items],
  );
  const level3Items = useMemo(
    () =>
      docRightChecks.filter(
        (v) =>
          v.parentKey &&
          level2Items.some((l2) => l2.classifierValueKey === v.parentKey),
      ),
    [docRightChecks, level2Items],
  );

  const filteredLevel1 = useMemo(() => {
    if (!search.trim()) return level1Items;
    const q = search.toLowerCase();
    return level1Items.filter((l1) => l1.name.toLowerCase().includes(q));
  }, [search, level1Items]);

  const handleConfirm = (newEntries: DocRightCheckEntry[]) => {
    setEntries((prev) => {
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
      { name: string; entries: (DocRightCheckEntry & { idx: number })[] }
    > = {};
    entries.forEach((e, idx) => {
      if (!groups[e.level1Code]) {
        groups[e.level1Code] = { name: e.level1Name, entries: [] };
      }
      groups[e.level1Code].entries.push({ ...e, idx });
    });
    return groups;
  }, [entries]);

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

  return (
    <div>
      <div className={styles.header}>
        <Text modifiers="bold">
          {t(
            'forms.docRightCheck.sectionTitle',
            'Dokumendi või õiguse kontroll',
          )}
        </Text>
        <div className="pos-relative">
          <Button
            type="button"
            visualType="secondary"
            onClick={() => {
              setDropdownOpen((v) => !v);
              setSearch('');
            }}
          >
            {t('forms.docRightCheck.add', '+ Lisa')} ▾
          </Button>
          {dropdownOpen && (
            <div ref={dropdownRef} className={styles.dropdown}>
              <div className="mb-05">
                <Search
                  id="doc-right-check-search"
                  value={search}
                  onChange={setSearch}
                  placeholder={t('common.search', 'Otsi')}
                />
              </div>
              {filteredLevel1.map((l1) => {
                return (
                  <div key={l1.code}>
                    <button
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
                  </div>
                );
              })}
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
            </div>
          )}
        </div>
      </div>

      {selectedLevel1 && (
        <CheckModal
          key={selectedLevel1.code}
          level1Item={selectedLevel1}
          level2Items={level2Items}
          level3Items={level3Items}
          existingEntries={entries}
          onConfirm={handleConfirm}
          modalRef={modalRef}
          isDocCheck={true}
        />
      )}

      {entries.length === 0 ? (
        <div className={styles.emptyState}>
          <Text>{t('forms.docRightCheck.empty', 'Sisu puudub')}</Text>
        </div>
      ) : (
        <div className={styles.entriesContainer}>
          {Object.values(groupedEntries).map((group) => (
            <div key={group.name}>
              {group.entries.map((entry) => (
                <Card key={entry.idx}>
                  <Card.Content className={styles.cardContent}>
                    <div className={styles.entryRow}>
                      <Text>{entry.level2Name}</Text>
                      <Text>{entry.level3Name}</Text>
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
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
