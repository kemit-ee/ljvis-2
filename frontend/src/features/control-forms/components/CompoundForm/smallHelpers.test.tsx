// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SelectedFormsNavigation } from './SelectedFormsNavigation';
import { vehicleCategoryColWidth } from './vehicleCategoryLayout';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('SelectedFormsNavigation', () => {
  afterEach(cleanup);
  it('ei renderda tühja nimekirja', () => {
    const { container } = render(<SelectedFormsNavigation tabIds={[]} labels={{}} onSelect={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
  it('valik kerib üles ja teavitab', () => {
    const onSelect = vi.fn();
    window.scrollTo = vi.fn() as never;
    render(<SelectedFormsNavigation tabIds={['a', 'b']} labels={{ a: 'Silt A' }} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Silt A'));
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(window.scrollTo).toHaveBeenCalled();
    expect(screen.getByText('b')).toBeTruthy();
  });
});

describe('vehicleCategoryColWidth', () => {
  it('annab laiuse koodi ja ekraani järgi', () => {
    expect(vehicleCategoryColWidth('A_2012')).toBe(6);
    expect(vehicleCategoryColWidth('G3_2012')).toBe(2);
    expect(vehicleCategoryColWidth('OTHER_2012')).toBe(12);
    expect(vehicleCategoryColWidth('UNKNOWN')).toBe(12);
    expect(vehicleCategoryColWidth('A_2012', false)).toBe(12);
  });
});
