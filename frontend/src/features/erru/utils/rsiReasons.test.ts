// Seed SQL and ERRU XSD straight from the repository, so the test fails when either drifts.
import seedSql from '../../../../../DSL/Liquibase/changelog/20261125100000-rsi-failed-reason-classifier.sql?raw';
import rsiTypesXsd from '../../../../../contracts/erru/3.5/RoadSideInspection_Types.xsd?raw';
import { describe, expect, it } from 'vitest';
import type { ClassifierEntry } from '../../classifiers/types';
import {
  buildReasonTree,
  compareReasonCodes,
  isLegacyCheckedItems,
  leavesOf,
  normaliseCheckedItems,
  reasonLabel,
  withAllItems,
} from './rsiReasons';

/** Classifier entries as seeded by the Liquibase changeset (code, parent, name, severities). */
function seededEntries(): ClassifierEntry[] {
  const sql = seedSql;
  const q = "'((?:[^']|'')*)'";
  const row = new RegExp(`\\(${q}, ${q}, ${q}, ${q}\\)`, 'g');
  const rows = [...sql.matchAll(row)].map((m) =>
    m.slice(1, 5).map((s: string) => s.replace(/''/g, "'")),
  );
  const keyOf = new Map(rows.map(([code], i) => [code, i + 1]));
  return rows.map(([code, parent, name, severities], i) => ({
    classifierValueKey: i + 1,
    classifierCode: 'RSI_FAILED_REASON',
    code,
    name,
    parentKey: parent ? (keyOf.get(parent) ?? -1) : null,
    description: severities || undefined,
  }));
}

function xsdFailedReasons(): string[] {
  const xsd = rsiTypesXsd;
  const block = xsd.slice(xsd.indexOf('name="rsiFailedReason"'));
  return [
    ...block
      .slice(0, block.indexOf('</xs:simpleType>'))
      .matchAll(/value="([^"]+)"/g),
  ].map((m) => m[1]);
}

describe('RSI_FAILED_REASON seed', () => {
  const tree = buildReasonTree(seededEntries());

  it('has the 12 ERRU rsiItemType items in order', () => {
    expect(tree.items.map((n) => n.entry.code)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '20',
    ]);
  });

  it('leaves are exactly the ERRU rsiFailedReason codes, each with at least one severity', () => {
    const leaves = tree.items.flatMap(leavesOf);
    expect(leaves.map((l) => l.entry.code).sort()).toEqual(
      xsdFailedReasons().sort(),
    );
    expect(leaves.filter((l) => l.severities.length === 0)).toEqual([]);
  });

  it('keeps directive severities per reason', () => {
    expect(tree.byCode.get('1.1.2.a')?.severities).toEqual(['OV', 'EOV']);
    expect(tree.byCode.get('20.1.2.1')?.severities).toEqual([
      'VO',
      'OV',
      'EOV',
    ]);
    expect(tree.byCode.get('30')?.severities).toEqual(['EOV']);
  });

  it('labels lettered, aspect-only and numbered reasons', () => {
    const aspect = tree.byCode.get('G:1.1.4')!;
    expect(reasonLabel(tree.byCode.get('0.1.a')!)).toMatch(
      /^a\) Registreerimismärk/,
    );
    expect(reasonLabel(aspect.children[0], aspect)).toMatch(/^Defektne mõõtur/);
    expect(
      reasonLabel(tree.byCode.get('10.1.1')!, tree.byCode.get('G:10.1')),
    ).toMatch(/^10\.1\.1 /);
  });
});

describe('rsiReasons helpers', () => {
  it('sorts dotted codes naturally', () => {
    expect(
      ['1.1.10', 'G:1.1.2', '1.1.3.b', '1.1.3.a', '20', '9'].sort(
        compareReasonCodes,
      ),
    ).toEqual(['G:1.1.2', '1.1.3.a', '1.1.3.b', '1.1.10', '9', '20']);
  });

  it('normalises incoming ERRU items', () => {
    expect(
      normaliseCheckedItems([
        {
          itemType: 1,
          itemFailed: true,
          failedChecks: [
            { failedReason: '1.1.3.a', failedAssessment: 'Dangerous' },
          ],
        },
        { itemType: '20', itemFailed: false },
      ]),
    ).toEqual([
      {
        partCode: '1',
        status: 'non_compliant',
        defects: [{ defectCode: '1.1.3.a', severity: 'EOV' }],
      },
      { partCode: '20', status: 'checked', defects: [] },
    ]);
  });

  it('detects legacy TECHNICAL_CHECK items and fills missing items', () => {
    expect(
      isLegacyCheckedItems([
        { partCode: 'CAA_1', status: 'checked', defects: [] },
      ]),
    ).toBe(true);
    expect(
      isLegacyCheckedItems([{ partCode: '1', status: 'checked', defects: [] }]),
    ).toBe(false);
    const tree = buildReasonTree(seededEntries());
    const items = withAllItems(tree, [
      { partCode: '4', status: 'checked', defects: [] },
    ]);
    expect(items).toHaveLength(12);
    expect(items[4]).toEqual({ partCode: '4', status: 'checked', defects: [] });
    expect(items[0].status).toBe('not_checked');
  });
});
