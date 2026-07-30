import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Icon, Radio, Text, TextField } from '@tedi-design-system/react/tedi';
import type { ViolationEntry } from '../../types';
import type { ClassifierEntry } from '../../../classifiers/types';
import styles from './ViolationPickerModal.module.css';

interface ViolationPickerModalProps {
  violationClassifiers: ClassifierEntry[];
  onAdd: (violation: ViolationEntry) => void;
  onClose: () => void;
}

interface ViolationTreeNodeProps {
  item: ClassifierEntry;
  childrenMap: Map<number, ClassifierEntry[]>;
  depth: number;
  expandedKeys: Set<number>;
  selectedKey: number | null;
  onToggle: (key: number) => void;
  onSelect: (item: ClassifierEntry) => void;
}

function ViolationTreeNode({
  item,
  childrenMap,
  depth,
  expandedKeys,
  selectedKey,
  onToggle,
  onSelect,
}: ViolationTreeNodeProps) {
  const children = childrenMap.get(item.classifierValueKey) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedKeys.has(item.classifierValueKey);
  const isSelected = selectedKey === item.classifierValueKey;

  return (
    <div>
      <div className={styles.row} style={{ paddingLeft: depth * 24 }}>
        {hasChildren ? (
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => onToggle(item.classifierValueKey)}
            aria-label={isExpanded ? 'collapse' : 'expand'}
          >
            <Icon
              name={isExpanded ? 'indeterminate_check_box' : 'add_box'}
              type="outlined"
              size={18}
              color="brand"
            />
          </button>
        ) : (
          <span className={styles.leafRadio}>
            <Radio
              id={`violation-leaf-${item.classifierValueKey}`}
              name="violation-leaf"
              value={String(item.classifierValueKey)}
              label=""
              hideLabel
              checked={isSelected}
              onChange={() => onSelect(item)}
            />
          </span>
        )}
        <span
          className={hasChildren ? styles.groupLabel : styles.leafLabel}
          onClick={() => (hasChildren ? onToggle(item.classifierValueKey) : onSelect(item))}
        >
          {item.code} — {item.name}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <ViolationTreeNode
              key={child.classifierValueKey}
              item={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              expandedKeys={expandedKeys}
              selectedKey={selectedKey}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ViolationPickerModal({
  violationClassifiers,
  onAdd,
  onClose,
}: ViolationPickerModalProps) {
  const { t } = useTranslation();
  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(new Set());
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [searchTerm, setSearchTerm] = useState('');

  // Only currently-valid (non-expired) classifier values may be selected for
  // a new violation entry; already-recorded (possibly since-expired) values
  // are still rendered correctly elsewhere via the unfiltered classifier list.
  const validClassifiers = useMemo(
    () => violationClassifiers.filter((c) => c.isValid !== false),
    [violationClassifiers],
  );

  const itemsByKey = useMemo(() => {
    const map = new Map<number, ClassifierEntry>();
    validClassifiers.forEach((c) => map.set(c.classifierValueKey, c));
    return map;
  }, [validClassifiers]);

  const childrenMap = useMemo(() => {
    const map = new Map<number, ClassifierEntry[]>();
    validClassifiers.forEach((c) => {
      if (c.parentKey === null) return;
      const list = map.get(c.parentKey) ?? [];
      list.push(c);
      map.set(c.parentKey, list);
    });
    return map;
  }, [validClassifiers]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  // When searching, compute the set of items that either match the search
  // term themselves or have at least one matching descendant, plus the set
  // of ancestor keys that should be force-expanded to reveal the match.
  const { visibleKeys, autoExpandKeys } = useMemo(() => {
    if (!normalizedSearch) {
      return { visibleKeys: null as Set<number> | null, autoExpandKeys: new Set<number>() };
    }
    const matches = validClassifiers.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedSearch) ||
        c.code.toLowerCase().includes(normalizedSearch),
    );
    const visible = new Set<number>();
    const expand = new Set<number>();
    const addWithAncestors = (item: ClassifierEntry, includeSelf: boolean) => {
      if (includeSelf) visible.add(item.classifierValueKey);
      let current = item.parentKey !== null ? itemsByKey.get(item.parentKey) : undefined;
      while (current) {
        visible.add(current.classifierValueKey);
        expand.add(current.classifierValueKey);
        current = current.parentKey !== null ? itemsByKey.get(current.parentKey) : undefined;
      }
    };
    const addDescendants = (key: number) => {
      (childrenMap.get(key) ?? []).forEach((child) => {
        visible.add(child.classifierValueKey);
        addDescendants(child.classifierValueKey);
      });
    };
    matches.forEach((m) => {
      addWithAncestors(m, true);
      addDescendants(m.classifierValueKey);
      if ((childrenMap.get(m.classifierValueKey) ?? []).length > 0) {
        expand.add(m.classifierValueKey);
      }
    });
    return { visibleKeys: visible, autoExpandKeys: expand };
  }, [normalizedSearch, validClassifiers, itemsByKey, childrenMap]);

  const effectiveExpandedKeys = useMemo(() => {
    if (!normalizedSearch) return expandedKeys;
    const merged = new Set(expandedKeys);
    autoExpandKeys.forEach((k) => merged.add(k));
    return merged;
  }, [normalizedSearch, expandedKeys, autoExpandKeys]);

  const rootItems = useMemo(
    () =>
      validClassifiers.filter(
        (c) => c.parentKey === null && (!visibleKeys || visibleKeys.has(c.classifierValueKey)),
      ),
    [validClassifiers, visibleKeys],
  );

  const visibleChildrenMap = useMemo(() => {
    if (!visibleKeys) return childrenMap;
    const map = new Map<number, ClassifierEntry[]>();
    childrenMap.forEach((children, parentKey) => {
      map.set(
        parentKey,
        children.filter((c) => visibleKeys.has(c.classifierValueKey)),
      );
    });
    return map;
  }, [childrenMap, visibleKeys]);

  const toggleExpand = (key: number) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getAncestorChain = (key: number): ClassifierEntry[] => {
    const chain: ClassifierEntry[] = [];
    let current = itemsByKey.get(key);
    while (current) {
      chain.unshift(current);
      current = current.parentKey !== null ? itemsByKey.get(current.parentKey) : undefined;
    }
    return chain;
  };

  const selectedChain = selectedKey !== null ? getAncestorChain(selectedKey) : [];
  const canAdd = selectedChain.length >= 2;

  const handleAdd = () => {
    if (!canAdd) return;
    const [l1, l2, l3] = selectedChain;
    onAdd({
      level1ValueKey: l1.classifierValueKey,
      level2ValueKey: l2.classifierValueKey,
      level3ValueKey: l3?.classifierValueKey,
      quantity: parseInt(quantity, 10) || 1,
    });
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <Card>
          <Card.Content>
            <div className={styles.header}>
              <Heading element="h3">
                {t('forms.labour_inspection.violations.pickerTitle')}
              </Heading>
              <Button type="button" visualType="secondary" onClick={onClose}>
                {t('common.close')}
              </Button>
            </div>

            <div className={styles.searchWrapper} style={{ marginBottom: '0.75rem' }}>
              <TextField
                id="violation-search"
                label={t('forms.labour_inspection.violations.search')}
                hideLabel
                placeholder={t('forms.labour_inspection.violations.search')}
                value={searchTerm}
                onChange={(v) => setSearchTerm(v)}
              />
            </div>

            <div className={styles.tree}>
              {rootItems.length === 0 ? (
                <Text>{t('common.tableIsEmpty')}</Text>
              ) : (
                rootItems.map((item) => (
                  <ViolationTreeNode
                    key={item.classifierValueKey}
                    item={item}
                    childrenMap={visibleChildrenMap}
                    depth={0}
                    expandedKeys={effectiveExpandedKeys}
                    selectedKey={selectedKey}
                    onToggle={toggleExpand}
                    onSelect={(selected) => setSelectedKey(selected.classifierValueKey)}
                  />
                ))
              )}
            </div>

            {selectedChain.length > 0 && (
              <Text element="p" className={styles.selectedPath}>
                {selectedChain.map((c) => c.name).join(' → ')}
              </Text>
            )}

            <div className={styles.footer}>
              <div style={{ maxWidth: 140 }}>
                <TextField
                  id="violation-quantity"
                  label={t('forms.labour_inspection.violations.quantity')}
                  value={quantity}
                  onChange={(v) => setQuantity(v.replace(/\D/g, ''))}
                  input={{ maxLength: 3 }}
                />
              </div>
              <Button type="button" onClick={handleAdd} disabled={!canAdd}>
                {t('forms.labour_inspection.violations.add')}
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
