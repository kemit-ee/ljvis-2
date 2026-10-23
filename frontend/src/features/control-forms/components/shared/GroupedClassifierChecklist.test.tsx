// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupedClassifierChecklist } from './GroupedClassifierChecklist';
import type { ClassifierEntry } from '../../../classifiers/types';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);

const e = (key: number, code: string, parentKey: number | null) =>
  ({ classifierValueKey: key, code, name: `N${code}`, parentKey }) as ClassifierEntry;

describe('GroupedClassifierChecklist', () => {
  afterEach(cleanup);
  const items = [e(2, 'B', null), e(1, 'A', null), e(3, 'C', null), e(10, 'A1', 1), e(11, 'A2', 1), e(20, 'B1', 2)];

  it('grupeerib koodi järgi, jätab tühjad grupid välja ja renderdab read', () => {
    render(
      <GroupedClassifierChecklist
        items={items}
        className="c"
        renderRow={(item, group) => <p key={item.code}>{`${group.code}>${item.code}`}</p>}
      />,
    );
    const headings = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(headings).toEqual(['A — NA', 'B — NB']);
    expect(screen.getByText('A>A2')).toBeTruthy();
  });

  it('rakendab filterItem-it', () => {
    render(
      <GroupedClassifierChecklist
        items={items}
        filterItem={(i) => i.code !== 'A1' && i.code !== 'A2'}
        renderRow={(item) => <p key={item.code}>{item.code}</p>}
      />,
    );
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByText('B1')).toBeTruthy();
  });
});
