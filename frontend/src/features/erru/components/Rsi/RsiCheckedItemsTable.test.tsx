// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { RsiCheckedItem } from '../../types';
import { buildReasonTree, withAllItems } from '../../utils/rsiReasons';
import { RsiCheckedItemsTable } from './RsiCheckedItemsTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getValue: (_: string, code: string) =>
      code === 'CAA_1.1.3' ? { name: '1.1.3 Vaakumpump' } : undefined,
  }),
}));

let key = 0;
const entry = (
  code: string,
  name: string,
  parentKey: number | null,
  description?: string,
): ClassifierEntry => ({
  classifierValueKey: ++key,
  classifierCode: 'RSI_FAILED_REASON',
  code,
  name,
  parentKey,
  description,
});

function sampleTree() {
  key = 0;
  const item0 = entry('0', 'Sõiduki identifitseerimine', null);
  const item1 = entry('1', 'Pidurisüsteem', null);
  const g11 = entry(
    'G:1.1',
    'Mehaaniline seisund ja toimimine',
    item1.classifierValueKey,
  );
  const g112 = entry('G:1.1.2', 'Pedaali seisund', g11.classifierValueKey);
  const g114 = entry(
    'G:1.1.4',
    'Alarõhu hoiatusmärgutuli',
    g11.classifierValueKey,
  );
  return buildReasonTree([
    item0,
    item1,
    g11,
    g112,
    entry(
      '1.1.2.a',
      'Liigne käigutagavara.',
      g112.classifierValueKey,
      'OV,EOV',
    ),
    entry(
      '1.1.2.b',
      'Toimimine on häiritud.',
      g112.classifierValueKey,
      'VO,OV',
    ),
    g114,
    entry('1.1.4', 'Defektne mõõtur.', g114.classifierValueKey, 'VO,OV'),
  ]);
}

function Harness({ initial }: { initial: RsiCheckedItem[] }) {
  const tree = sampleTree();
  const [items, setItems] = useState(withAllItems(tree, initial));
  return (
    <>
      <RsiCheckedItemsTable
        tree={tree}
        items={items}
        onChange={setItems}
        error="missing"
      />
      <output data-testid="state">{JSON.stringify(items)}</output>
    </>
  );
}

const state = () =>
  JSON.parse(
    screen.getByTestId('state').textContent ?? '[]',
  ) as RsiCheckedItem[];
const box = (id: string) =>
  document.getElementById(id) as HTMLInputElement | null;

describe('RsiCheckedItemsTable', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ticking "Ei vasta nõuetele" marks the item checked and opens its reasons', () => {
    render(<Harness initial={[]} />);
    expect(box('rsi-reason-1.1.2.a-OV')).toBeNull();
    fireEvent.click(box('rsi-item-1-non-compliant')!);
    expect(state()[1].status).toBe('non_compliant');
    expect(box('rsi-item-1-checked')!.checked).toBe(true);
    // Only the severities the directive allows get a checkbox.
    expect(box('rsi-reason-1.1.2.a-OV')).not.toBeNull();
    expect(box('rsi-reason-1.1.2.a-VO')).toBeNull();
    expect(screen.getByText('missing')).toBeTruthy();
  });

  it('one severity per reason; clicking the ticked box clears it', () => {
    render(
      <Harness
        initial={[{ partCode: '1', status: 'non_compliant', defects: [] }]}
      />,
    );
    fireEvent.click(box('rsi-reason-1.1.2.a-OV')!);
    fireEvent.click(box('rsi-reason-1.1.2.a-EOV')!);
    fireEvent.click(box('rsi-reason-1.1.4-VO')!);
    expect(state()[1].defects).toEqual([
      { defectCode: '1.1.2.a', severity: 'EOV' },
      { defectCode: '1.1.4', severity: 'VO' },
    ]);
    fireEvent.click(box('rsi-reason-1.1.2.a-EOV')!);
    expect(state()[1].defects).toEqual([
      { defectCode: '1.1.4', severity: 'VO' },
    ]);
  });

  it('unticking "Kontrollitud" clears the item and its reasons', () => {
    render(
      <Harness
        initial={[
          {
            partCode: '1',
            status: 'non_compliant',
            defects: [{ defectCode: '1.1.4', severity: 'OV' }],
            nationalDefects: [{ defectCode: 'CAA_1.1.3', severity: 'OV' }],
          },
        ]}
      />,
    );
    expect(screen.getByText(/1\.1\.3 Vaakumpump/)).toBeTruthy();
    fireEvent.click(box('rsi-item-1-checked')!);
    expect(state()[1]).toMatchObject({ status: 'not_checked', defects: [] });
    expect(box('rsi-reason-1.1.4-VO')).toBeNull();
  });

  it('read-only mode lists only checked items and selected reasons', () => {
    const tree = sampleTree();
    render(
      <RsiCheckedItemsTable
        tree={tree}
        items={[
          {
            partCode: '1',
            status: 'non_compliant',
            defects: [{ defectCode: '1.1.4', severity: 'OV' }],
          },
        ]}
      />,
    );
    expect(screen.queryByText('Sõiduki identifitseerimine')).toBeNull();
    expect(screen.getByText('Defektne mõõtur.')).toBeTruthy();
    expect(screen.queryByText(/Liigne käigutagavara/)).toBeNull();
    expect(box('rsi-reason-1.1.4-OV')!.checked).toBe(true);
    expect(box('rsi-reason-1.1.4-OV')!.disabled).toBe(true);
  });
});
