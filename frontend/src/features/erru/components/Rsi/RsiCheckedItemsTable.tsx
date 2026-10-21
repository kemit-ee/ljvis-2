import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, StatusBadge, Text } from '@tedi-design-system/react/tedi';
import type { StatusBadgeColor } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import type { RsiCheckedItem, RsiDefectSeverity } from '../../types';
import {
  RSI_SEVERITIES,
  leavesOf,
  reasonLabel,
  type RsiReasonNode,
  type RsiReasonTree,
} from '../../utils/rsiReasons';
import shared from '../../../../shared/components/CheckedItemsTable.module.css';
import styles from './RsiCheckedItemsTable.module.css';

const severityColor = (sev: RsiDefectSeverity): StatusBadgeColor => {
  if (sev === 'EOV') return 'danger';
  if (sev === 'OV') return 'accent';
  return 'warning'; // VO
};

type Selected = Map<string, RsiDefectSeverity>;

/**
 * "Kontrollitud punkt" + "Kontrollitud punkti andmed" (vana süsteemi RSI teate vormi
 * plokid 10 ja 11): one row per RSI_FAILED_REASON level-1 item with two checkboxes
 * ("Kontrollitud", "Ei vasta nõuetele"). Ticking "Ei vasta nõuetele" opens the item's
 * full reason table right below the row — aspect | reason | Väheoluline | Oluline |
 * Ohtlik, a checkbox only where the directive allows that severity, one severity per
 * reason (clicking the ticked box again clears it).
 *
 * Without `onChange` the table is read-only and lists only the selected reasons.
 */
export function RsiCheckedItemsTable({
  tree,
  items,
  onChange,
  error,
}: {
  tree: RsiReasonTree;
  items: RsiCheckedItem[];
  onChange?: (items: RsiCheckedItem[]) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { getValue } = useClassifiers();
  const readOnly = !onChange;

  const itemOf = (code: string): RsiCheckedItem =>
    items.find((i) => i.partCode === code) ?? {
      partCode: code,
      status: 'not_checked',
      defects: [],
    };

  const update = (
    code: string,
    patch: (item: RsiCheckedItem) => RsiCheckedItem,
  ) =>
    onChange?.(
      tree.items.map((node) => {
        const item = itemOf(node.entry.code);
        return node.entry.code === code ? patch(item) : item;
      }),
    );

  const setChecked = (code: string, on: boolean) =>
    update(code, (it) =>
      on
        ? { ...it, status: it.status === 'not_checked' ? 'checked' : it.status }
        : { ...it, status: 'not_checked', defects: [] },
    );

  const setNonCompliant = (code: string, on: boolean) =>
    update(code, (it) =>
      on
        ? { ...it, status: 'non_compliant' }
        : { ...it, status: 'checked', defects: [] },
    );

  const toggleSeverity = (
    itemCode: string,
    reasonCode: string,
    sev: RsiDefectSeverity,
  ) =>
    update(itemCode, (it) => {
      const current = it.defects.find(
        (d) => d.defectCode === reasonCode,
      )?.severity;
      const rest = it.defects.filter((d) => d.defectCode !== reasonCode);
      return {
        ...it,
        defects:
          current === sev
            ? rest
            : [...rest, { defectCode: reasonCode, severity: sev }],
      };
    });

  const sevLabel = (sev: RsiDefectSeverity) =>
    t(`erru.rsi.checkedItems.severity.${sev}`);

  /* ─── Reason table of one non-compliant item ─── */

  const severityBox = (
    itemCode: string,
    leaf: RsiReasonNode,
    sev: RsiDefectSeverity,
    selected: Selected,
  ) =>
    leaf.severities.includes(sev) ? (
      <Checkbox
        id={`rsi-reason-${leaf.entry.code}-${sev}`}
        name={`rsi-reason-${leaf.entry.code}`}
        value={sev}
        label={`${leaf.number} ${sevLabel(sev)}`}
        hideLabel={isDesktop}
        checked={selected.get(leaf.entry.code) === sev}
        disabled={readOnly}
        onChange={() =>
          !readOnly && toggleSeverity(itemCode, leaf.entry.code, sev)
        }
      />
    ) : null;

  const visible = (node: RsiReasonNode, selected: Selected) =>
    !readOnly || leavesOf(node).some((l) => selected.has(l.entry.code));

  const desktopRows = (
    itemCode: string,
    node: RsiReasonNode,
    selected: Selected,
  ): ReactNode[] =>
    node.children
      .filter((child) => visible(child, selected))
      .map((child) => {
        if (child.isLeaf) {
          return (
            <tr key={child.entry.code}>
              <td colSpan={2}>{reasonLabel(child)}</td>
              {RSI_SEVERITIES.map((sev) => (
                <td key={sev} className={styles.sevCell}>
                  {severityBox(itemCode, child, sev, selected)}
                </td>
              ))}
            </tr>
          );
        }
        if (child.children.every((c) => c.isLeaf)) {
          const leaves = child.children.filter((l) => visible(l, selected));
          return (
            <Fragment key={child.entry.code}>
              {leaves.map((leaf, i) => (
                <tr
                  key={leaf.entry.code}
                  className={
                    selected.has(leaf.entry.code)
                      ? styles.selectedRow
                      : undefined
                  }
                >
                  {i === 0 && (
                    <td rowSpan={leaves.length} className={styles.aspectCell}>
                      {child.number} {child.entry.name}
                    </td>
                  )}
                  <td>{reasonLabel(leaf, child)}</td>
                  {RSI_SEVERITIES.map((sev) => (
                    <td key={sev} className={styles.sevCell}>
                      {severityBox(itemCode, leaf, sev, selected)}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          );
        }
        return (
          <Fragment key={child.entry.code}>
            <tr className={styles.headingRow}>
              <td colSpan={5}>
                {child.number} {child.entry.name}
              </td>
            </tr>
            {desktopRows(itemCode, child, selected)}
          </Fragment>
        );
      });

  const mobileBlocks = (
    itemCode: string,
    node: RsiReasonNode,
    selected: Selected,
  ): ReactNode[] =>
    node.children
      .filter((child) => visible(child, selected))
      .map((child) =>
        child.isLeaf ? (
          <div key={child.entry.code} className={styles.mobileReason}>
            <div>{reasonLabel(child, node)}</div>
            <div className={styles.mobileSeverities}>
              {RSI_SEVERITIES.map((sev) => (
                <Fragment key={sev}>
                  {severityBox(itemCode, child, sev, selected)}
                </Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div key={child.entry.code} className={styles.mobileGroup}>
            <div className={styles.mobileGroupTitle}>
              {child.number} {child.entry.name}
            </div>
            {mobileBlocks(itemCode, child, selected)}
          </div>
        ),
      );

  const nationalHint = (item: RsiCheckedItem) =>
    !readOnly && item.nationalDefects && item.nationalDefects.length > 0 ? (
      <div className={styles.nationalHint}>
        <Text modifiers="bold">{t('erru.rsi.checkedItems.nationalHint')}</Text>
        <ul>
          {item.nationalDefects.map((d) => (
            <li key={d.defectCode}>
              {getValue('TECHNICAL_CHECK', d.defectCode)?.name ?? d.defectCode}{' '}
              <StatusBadge color={severityColor(d.severity)} variant="bordered">
                {d.severity}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const reasonsBlock = (node: RsiReasonNode, item: RsiCheckedItem) => {
    const selected: Selected = new Map(
      item.defects.map((d) => [d.defectCode, d.severity]),
    );
    const missing = !readOnly && item.defects.length === 0;
    return (
      <div className={styles.reasons}>
        {nationalHint(item)}
        {isDesktop ? (
          <table className={styles.reasonsTable}>
            <thead>
              <tr>
                <th>{t('erru.rsi.checkedItems.aspect')}</th>
                <th>{t('erru.rsi.checkedItems.reason')}</th>
                {RSI_SEVERITIES.map((sev) => (
                  <th key={sev} className={styles.sevCell}>
                    {sevLabel(sev)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{desktopRows(node.entry.code, node, selected)}</tbody>
          </table>
        ) : (
          mobileBlocks(node.entry.code, node, selected)
        )}
        {missing && error && (
          <Text color="danger" className="mt-05">
            {error}
          </Text>
        )}
      </div>
    );
  };

  /* ─── Item rows ─── */

  const itemBoxes = (node: RsiReasonNode, item: RsiCheckedItem) => ({
    checked: (
      <Checkbox
        id={`rsi-item-${node.entry.code}-checked`}
        name={`rsi-item-${node.entry.code}-checked`}
        value="checked"
        label={t('erru.rsi.checkedItems.checked')}
        hideLabel={isDesktop}
        checked={item.status !== 'not_checked'}
        disabled={readOnly}
        onChange={(_, on) => !readOnly && setChecked(node.entry.code, on)}
      />
    ),
    nonCompliant: (
      <Checkbox
        id={`rsi-item-${node.entry.code}-non-compliant`}
        name={`rsi-item-${node.entry.code}-non-compliant`}
        value="non_compliant"
        label={t('erru.rsi.checkedItems.nonCompliant')}
        hideLabel={isDesktop}
        checked={item.status === 'non_compliant'}
        disabled={readOnly}
        onChange={(_, on) => !readOnly && setNonCompliant(node.entry.code, on)}
      />
    ),
  });

  const indexClass = (status: RsiCheckedItem['status']) =>
    status === 'checked'
      ? shared.partIndexChecked
      : status === 'non_compliant'
        ? shared.partIndexNonCompliant
        : '';

  const partName = (node: RsiReasonNode, item: RsiCheckedItem) => (
    <span className={shared.partName}>
      <span className={`${shared.partIndex} ${indexClass(item.status)}`}>
        {node.number}
      </span>
      <span className={shared.partLabel}>{node.entry.name}</span>
    </span>
  );

  const shown = tree.items.filter(
    (node) => !readOnly || itemOf(node.entry.code).status !== 'not_checked',
  );
  if (readOnly && shown.length === 0)
    return <Text>{t('erru.rsi.checkedItems.noneChecked')}</Text>;

  if (isDesktop) {
    return (
      <table className={shared.checkedItemsTable}>
        <thead>
          <tr>
            <th>{t('erru.rsi.checkedItems.part')}</th>
            <th className={styles.boxHeader}>
              {t('erru.rsi.checkedItems.checked')}
            </th>
            <th className={styles.boxHeader}>
              {t('erru.rsi.checkedItems.nonCompliant')}
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((node) => {
            const item = itemOf(node.entry.code);
            const boxes = itemBoxes(node, item);
            const rowCls =
              item.status === 'checked'
                ? shared.rowChecked
                : item.status === 'non_compliant'
                  ? shared.rowNonCompliant
                  : '';
            return (
              <Fragment key={node.entry.code}>
                <tr className={rowCls}>
                  <td>{partName(node, item)}</td>
                  <td className={styles.boxCell}>{boxes.checked}</td>
                  <td className={styles.boxCell}>{boxes.nonCompliant}</td>
                </tr>
                {item.status === 'non_compliant' && (
                  <tr>
                    <td colSpan={3} className={styles.reasonsCell}>
                      {reasonsBlock(node, item)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className={shared.cardList}>
      {shown.map((node) => {
        const item = itemOf(node.entry.code);
        const boxes = itemBoxes(node, item);
        const cardCls = [
          shared.partCard,
          item.status === 'checked' ? shared.cardChecked : '',
          item.status === 'non_compliant' ? shared.cardNonCompliant : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={node.entry.code} className={cardCls}>
            <div className={shared.cardHeader}>{partName(node, item)}</div>
            <div className={styles.mobileItemBoxes}>
              {boxes.checked}
              {boxes.nonCompliant}
            </div>
            {item.status === 'non_compliant' && reasonsBlock(node, item)}
          </div>
        );
      })}
    </div>
  );
}
