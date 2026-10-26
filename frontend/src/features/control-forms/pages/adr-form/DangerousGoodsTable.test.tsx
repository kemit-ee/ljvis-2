// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DangerousGoodsTable } from './DangerousGoodsTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: (code: string) =>
      code === 'ADR_QUANTITY_UNIT'
        ? [{ code: 'KG', name: 'kg', isValid: true }, { code: 'OLD', name: 'vana', isValid: false }]
        : [{ code: 'II', name: 'Rühm II', isValid: true }, { code: 'OLD', name: 'vana', isValid: false }],
  }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => ({
  ...(await orig<object>()),
  ...(await import('../pageTestHarness')).tediSelectOverride(),
}));

const row = { unNumber: '1203', packagingGroup: 'II', quantity: '5', unitCode: 'KG' };

const setup = (props: Partial<Parameters<typeof DangerousGoodsTable>[0]> = {}) => {
  const handlers = { onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn() };
  render(<DangerousGoodsTable rows={[row]} {...handlers} {...props} />);
  return handlers;
};

describe('DangerousGoodsTable', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the empty message and an add button', () => {
    const { onAdd } = setup({ rows: [] });
    expect(screen.getByText('forms.adr.dangerousGoods.empty')).toBeTruthy();
    fireEvent.click(screen.getByText('forms.adr.dangerousGoods.addRow'));
    expect(onAdd).toHaveBeenCalled();
  });

  it('updates fields and removes a row', () => {
    const { onUpdate, onRemove } = setup({ isDesktop: true });
    fireEvent.change(document.getElementById('dangerousGoods-0-unNumber')!, { target: { value: '1999' } });
    expect(onUpdate).toHaveBeenCalledWith(0, { unNumber: '1999' });
    fireEvent.change(document.getElementById('dangerousGoods-0-quantity')!, { target: { value: '7,5abc' } });
    expect(onUpdate).toHaveBeenCalledWith(0, expect.objectContaining({ quantity: expect.any(String) }));
    fireEvent.change(document.getElementById('dangerousGoods-0-packagingGroup')!, { target: { value: '' } });
    expect(onUpdate).toHaveBeenCalledWith(0, { packagingGroup: '' });
    fireEvent.change(document.getElementById('dangerousGoods-0-unitCode')!, { target: { value: '' } });
    expect(onUpdate).toHaveBeenCalledWith(0, { unitCode: '' });
    fireEvent.click(screen.getByTestId('clear-dangerousGoods-0-packagingGroup'));
    fireEvent.click(screen.getByTestId('clear-dangerousGoods-0-unitCode'));
    fireEvent.click(screen.getByText('common.remove'));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('selects an option', () => {
    const { onUpdate } = setup({ rows: [{ ...row, packagingGroup: '', unitCode: '' }] });
    fireEvent.change(document.getElementById('dangerousGoods-0-packagingGroup')!, { target: { value: 'II' } });
    expect(onUpdate).toHaveBeenCalledWith(0, { packagingGroup: 'II' });
    fireEvent.change(document.getElementById('dangerousGoods-0-unitCode')!, { target: { value: 'KG' } });
    expect(onUpdate).toHaveBeenCalledWith(0, { unitCode: 'KG' });
  });

  it('shows quantity errors once touched or when all errors are shown, and reports blur', () => {
    const onQuantityBlur = vi.fn();
    const { unmount } = render(
      <DangerousGoodsTable rows={[row]} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} rowErrors={[{ quantity: 'vigane' }]} rowTouched={[{ quantity: true }]} onQuantityBlur={onQuantityBlur} />,
    );
    expect(screen.getByText('vigane')).toBeTruthy();
    fireEvent.blur(document.getElementById('dangerousGoods-0-quantity')!);
    expect(onQuantityBlur).toHaveBeenCalledWith(0);
    unmount();
    render(<DangerousGoodsTable rows={[row]} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} rowErrors={[{ quantity: 'vigane2' }]} showAllErrors />);
    expect(screen.getByText('vigane2')).toBeTruthy();
    fireEvent.blur(document.getElementById('dangerousGoods-0-quantity')!);
  });

  it('hides errors for untouched rows', () => {
    setup({ rowErrors: [{ quantity: 'peidus' }], rowTouched: [{}] });
    expect(screen.queryByText('peidus')).toBeNull();
  });

  it('is read-only when disabled', () => {
    setup({ disabled: true });
    expect(screen.queryByText('common.remove')).toBeNull();
    expect(screen.queryByText('forms.adr.dangerousGoods.addRow')).toBeNull();
  });
});
