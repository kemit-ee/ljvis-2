// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../testing/tediStubs');
  return { ...(await orig<object>()), Select: stubs.SelectStub, TextField: stubs.TextFieldStub };
});

import { ControlsMatrixTable } from './ControlsMatrixTable';

const types = [
  { classifierValueKey: 1, name: 'Reisijad', isValid: true },
  { classifierValueKey: 2, name: 'Kaup', isValid: true },
  { classifierValueKey: 3, name: 'Vana', isValid: false },
] as never[];

const row = (transportClass: number, extra = {}) => ({
  transportClass,
  analogRecorderDrivers: 1,
  digitalRecorderDrivers: 2,
  smartRecorderDrivers: 3,
  analogRecorderWorkDays: 4,
  digitalRecorderWorkDays: 5,
  smartRecorderWorkDays: 6,
  ...extra,
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ControlsMatrixTable', () => {
  it('lisab valitud transpordiklassi rea', () => {
    const onAddRow = vi.fn();
    render(
      <ControlsMatrixTable rows={[]} transportTypes={types} onAddRow={onAddRow} onUpdateRow={vi.fn()} onRemoveRow={vi.fn()} />,
    );
    const addBtn = screen.getByText('common.add').closest('button')!;
    expect(addBtn.disabled).toBe(true);
    fireEvent.click(addBtn);
    expect(onAddRow).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('add-controls-matrix-row'), { target: { value: '2' } });
    fireEvent.click(addBtn);
    expect(onAddRow).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByTestId('add-controls-matrix-row'), { target: { value: '' } });
    expect((screen.getByText('common.add').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('muudab ja eemaldab ridu; tundmatu klass näitab võtit', () => {
    const onUpdateRow = vi.fn();
    const onRemoveRow = vi.fn();
    render(
      <ControlsMatrixTable
        rows={[row(1), row(9, { analogRecorderDrivers: undefined })] as never[]}
        transportTypes={types}
        onAddRow={vi.fn()}
        onUpdateRow={onUpdateRow}
        onRemoveRow={onRemoveRow}
      />,
    );
    expect(screen.getByText('Reisijad')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    fireEvent.change(screen.getByTestId('matrix-0-analogRecorderDrivers'), { target: { value: '12ab' } });
    expect(onUpdateRow).toHaveBeenCalledWith(0, { analogRecorderDrivers: 12 });
    fireEvent.change(screen.getByTestId('matrix-0-smartRecorderWorkDays'), { target: { value: 'x' } });
    expect(onUpdateRow).toHaveBeenCalledWith(0, { smartRecorderWorkDays: 0 });
    fireEvent.click(screen.getAllByText('common.remove')[1]);
    expect(onRemoveRow).toHaveBeenCalledWith(1);
  });

  it('readOnly režiimis näitab ainult tekste', () => {
    render(
      <ControlsMatrixTable
        rows={[row(2, { smartRecorderWorkDays: null })] as never[]}
        transportTypes={types}
        readOnly
        onAddRow={vi.fn()}
        onUpdateRow={vi.fn()}
        onRemoveRow={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('matrix-0-analogRecorderDrivers')).toBeNull();
    expect(screen.queryByText('common.add')).toBeNull();
    expect(screen.queryByText('common.remove')).toBeNull();
    expect(screen.getByText('Kaup')).toBeTruthy();
  });

  it('puuduva klassi võtme korral näitab kriipsu ja kõik klassid kasutusel peidab lisamise', () => {
    render(
      <ControlsMatrixTable
        rows={[row(1), row(2), { ...row(1), transportClass: null }] as never[]}
        transportTypes={types}
        onAddRow={vi.fn()}
        onUpdateRow={vi.fn()}
        onRemoveRow={vi.fn()}
      />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByTestId('add-controls-matrix-row')).toBeNull();
  });
});
