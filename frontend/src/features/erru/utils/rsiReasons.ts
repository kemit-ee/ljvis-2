import type { ClassifierEntry } from '../../classifiers/types';
import type { RsiCheckedItem, RsiDefectSeverity } from '../types';

/**
 * RSI_FAILED_REASON classifier helpers (direktiiv 2014/47/EL II ja III lisa).
 *
 * Tree shape (see Liquibase 20261125100000):
 *  - level 1 ('0'..'10', '20') = ERRU rsiItemType, one row in "Kontrollitud punkt";
 *  - 'G:<nr>' = heading or aspect group, never sent;
 *  - leaf (no children) = selectable ERRU rsiFailedReason, description = allowed
 *    severities ("VO,OV,EOV").
 */

export const RSI_REASON_CLASSIFIER = 'RSI_FAILED_REASON';
export const RSI_SEVERITIES: RsiDefectSeverity[] = ['VO', 'OV', 'EOV'];

export interface RsiReasonNode {
  entry: ClassifierEntry;
  /** Display number: code without the 'G:' group prefix. */
  number: string;
  children: RsiReasonNode[];
  isLeaf: boolean;
  severities: RsiDefectSeverity[];
}

export interface RsiReasonTree {
  items: RsiReasonNode[];
  byCode: Map<string, RsiReasonNode>;
}

const displayNumber = (code: string) => code.replace(/^G:/, '');

/** Natural order of dotted codes: 1.1.2 < 1.1.10, 1.1.3.a < 1.1.3.b. */
export function compareReasonCodes(a: string, b: string): number {
  const pa = displayNumber(a).split('.');
  const pb = displayNumber(b).split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = Number(x);
    const ny = Number(y);
    if (!isNaN(nx) && !isNaN(ny)) {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) {
      return x.localeCompare(y);
    }
  }
  return 0;
}

export function parseSeverities(
  description?: string | null,
): RsiDefectSeverity[] {
  const list = (description ?? '').split(',').map((s) => s.trim());
  return RSI_SEVERITIES.filter((s) => list.includes(s));
}

export function buildReasonTree(entries: ClassifierEntry[]): RsiReasonTree {
  const valid = entries.filter((e) => e.isValid !== false);
  const childrenOf = new Map<number | null, ClassifierEntry[]>();
  valid.forEach((e) => {
    const list = childrenOf.get(e.parentKey) ?? [];
    list.push(e);
    childrenOf.set(e.parentKey, list);
  });
  const byCode = new Map<string, RsiReasonNode>();
  const build = (entry: ClassifierEntry): RsiReasonNode => {
    const kids = (childrenOf.get(entry.classifierValueKey) ?? [])
      .slice()
      .sort((a, b) => compareReasonCodes(a.code, b.code))
      .map(build);
    const node: RsiReasonNode = {
      entry,
      number: displayNumber(entry.code),
      children: kids,
      isLeaf: kids.length === 0,
      severities: kids.length === 0 ? parseSeverities(entry.description) : [],
    };
    byCode.set(entry.code, node);
    return node;
  };
  const items = (childrenOf.get(null) ?? [])
    .slice()
    .sort((a, b) => compareReasonCodes(a.code, b.code))
    .map(build);
  return { items, byCode };
}

/** Letter of a lettered reason ('1.1.3.a' -> 'a'), otherwise null. */
export const reasonLetter = (code: string): string | null => {
  const m = code.match(/\.([a-z])$/);
  return m ? m[1] : null;
};

/**
 * Label of a reason in the "Mitteläbimise põhjus" column: "a) …" for lettered reasons,
 * plain text when the reason is the only child of its own aspect group (e.g. 1.1.4),
 * "10.1.1 …" otherwise (cargo securing reasons carry their own number).
 */
export function reasonLabel(
  node: RsiReasonNode,
  parent?: RsiReasonNode,
): string {
  const letter = reasonLetter(node.entry.code);
  if (letter) return `${letter}) ${node.entry.name}`;
  if (parent && parent.number === node.number) return node.entry.name;
  return `${node.number} ${node.entry.name}`;
}

/** All leaves under a node, in display order. */
export function leavesOf(node: RsiReasonNode): RsiReasonNode[] {
  if (node.isLeaf) return [node];
  return node.children.flatMap(leavesOf);
}

const ERRU_SEVERITY: Record<string, RsiDefectSeverity> = {
  Minor: 'VO',
  Major: 'OV',
  Dangerous: 'EOV',
};

/** True when the stored checked items use the pre-20261125100000 TECHNICAL_CHECK codes. */
export const isLegacyCheckedItems = (raw: unknown): boolean =>
  Array.isArray(raw) &&
  raw.some(
    (i) => typeof i?.partCode === 'string' && i.partCode.startsWith('CAA_'),
  );

/**
 * Normalises stored checked items to the RsiCheckedItem shape. Outgoing messages already
 * use it; incoming messages keep the ERRU shape as received
 * ({itemType, itemFailed, failedChecks:[{failedReason, failedAssessment}]}); the
 * {infringementStatus, defects:[{defectCode, severity}]} variant is accepted as well.
 */
export function normaliseCheckedItems(raw: unknown): RsiCheckedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((i): RsiCheckedItem => {
    if (i && typeof i === 'object' && 'partCode' in i)
      return i as RsiCheckedItem;
    const failed =
      i?.itemFailed === true ||
      i?.itemFailed === 'true' ||
      i?.infringementStatus === 'infringement';
    const checks: ErruFailedCheck[] = Array.isArray(i?.failedChecks)
      ? i.failedChecks
      : Array.isArray(i?.failedChecks?.failedCheck)
        ? i.failedChecks.failedCheck
        : Array.isArray(i?.defects)
          ? i.defects
          : [];
    return {
      partCode: String(i?.itemType ?? ''),
      status: failed ? 'non_compliant' : 'checked',
      defects: checks.map((c) => {
        const sev = c.failedAssessment ?? c.severity ?? '';
        return {
          defectCode: String(c.failedReason ?? c.defectCode ?? ''),
          severity: ERRU_SEVERITY[sev] ?? (sev as RsiDefectSeverity),
        };
      }),
    };
  });
}

interface ErruFailedCheck {
  failedReason?: string;
  failedAssessment?: string;
  defectCode?: string;
  severity?: string;
}

/** One entry per level-1 item, keeping stored values (incl. nationalDefects). */
export function withAllItems(
  tree: RsiReasonTree,
  items: RsiCheckedItem[],
): RsiCheckedItem[] {
  return tree.items.map(
    (node) =>
      items.find((i) => i.partCode === node.entry.code) ?? {
        partCode: node.entry.code,
        status: 'not_checked',
        defects: [],
      },
  );
}
