import { useMemo } from 'react';
import { Card, Heading } from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../classifiers/types';

interface GroupedClassifierChecklistProps {
  /** Flat list of classifier values, e.g. filtered from the bundle by classifierCode. */
  items: ClassifierEntry[];
  /** Render a single leaf row (2nd-level classifier value). */
  renderRow: (item: ClassifierEntry, group: ClassifierEntry) => React.ReactNode;
  /** Optional filter applied to leaf items before grouping (e.g. exclude codes not applicable to a variant). */
  filterItem?: (item: ClassifierEntry) => boolean;
  className?: string;
}

/**
 * Generic presentational grouping of a 2-level classifier (1st level = group,
 * 2nd level = leaf rows) into cards, one per group, with a caller-supplied row
 * renderer. Used by e.g. the ADR violations checklist (LJVIS2-141) and the
 * vehicle/trailer technical inspection parts list (LJVIS2-72).
 */
export function GroupedClassifierChecklist({
  items,
  renderRow,
  filterItem,
  className,
}: GroupedClassifierChecklistProps) {
  const { groups, childrenByGroup } = useMemo(() => {
    const groupItems = items
      .filter((i) => i.parentKey === null)
      .sort((a, b) => a.code.localeCompare(b.code));
    const childMap = new Map<number, ClassifierEntry[]>();
    items
      .filter((i) => i.parentKey !== null)
      .filter((i) => (filterItem ? filterItem(i) : true))
      .forEach((i) => {
        const list = childMap.get(i.parentKey as number) ?? [];
        list.push(i);
        childMap.set(i.parentKey as number, list);
      });
    return { groups: groupItems, childrenByGroup: childMap };
  }, [items, filterItem]);

  return (
    <div className={className}>
      {groups.map((group) => {
        const children = childrenByGroup.get(group.classifierValueKey) ?? [];
        if (children.length === 0) return null;
        return (
          <Card key={group.classifierValueKey} className="mb-1">
            <Card.Content>
              <Heading element="h4" className="mb-1">
                {group.code} — {group.name}
              </Heading>
              {children.map((child) => renderRow(child, group))}
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}
