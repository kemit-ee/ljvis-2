// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../../testing/tediStubs');
  return { ...(await orig<object>()), Modal: stubs.ModalStub, Checkbox: stubs.CheckboxStub };
});

import { DocCheckModal } from './DocCheckModal';

const e = (key: number, parentKey: number | null, code: string, name: string, description?: string) =>
  ({ classifierValueKey: key, parentKey, code, name, description }) as never;

const l1 = e(1, null, 'L1', 'Dokument');
const l2 = [e(2, 1, 'L2A', 'Alam A', 'kirjeldus'), e(3, 1, 'L2B', 'Alam B'), e(9, 8, 'OTHER', 'Teise vanema')];
const l3 = [e(4, 2, 'X1', 'Rikkumine 1', 'raske'), e(5, 2, 'X2', 'Rikkumine 2'), e(6, 3, 'Y1', 'Rikkumine 3')];

const setup = (opts: { level1?: unknown; existing?: unknown[]; open?: boolean } = {}) => {
  const onConfirm = vi.fn();
  const setOpen = vi.fn();
  render(
    <DocCheckModal
      level1Item={(opts.level1 === undefined ? l1 : opts.level1) as never}
      level2Items={l2}
      level3Items={l3}
      existingEntries={(opts.existing ?? []) as never}
      onConfirm={onConfirm}
      isModalOpen={opts.open ?? true}
      setIsModalOpen={setOpen}
    />,
  );
  return { onConfirm, setOpen };
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DocCheckModal', () => {
  it('suletud modaal ei renderda midagi', () => {
    setup({ open: false });
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('tühja valikuga kinnitamine näitab viga ja linnukese seadmine peidab selle', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByText('common.select'));
    expect(screen.getByText('Valige vähemalt üks rikkumine.')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('check-L2A-X1'));
    expect(screen.queryByText('Valige vähemalt üks rikkumine.')).toBeNull();
  });

  it('kinnitab valitud kirjed ja sulgeb modaali', () => {
    const { onConfirm, setOpen } = setup();
    fireEvent.click(screen.getByTestId('check-L2A-X1'));
    fireEvent.click(screen.getByTestId('check-L2B-Y1'));
    fireEvent.click(screen.getByText('common.select'));
    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ level1Code: 'L1', level2Code: 'L2A', level3Code: 'X1', severity: 'raske', level2Description: 'kirjeldus', violationCode: 'X1' }),
      expect.objectContaining({ level2Code: 'L2B', level3Code: 'Y1', severity: '', level2Description: '' }),
    ]);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('olemasolevad kirjed on eelvalitud ja linnukese eemaldamine eemaldab valiku', () => {
    const { onConfirm } = setup({
      existing: [{ level1Code: 'L1', level2Code: 'L2A', level3Code: 'X2' }, { level1Code: 'ZZ', level2Code: 'L2A', level3Code: 'X1' }],
    });
    expect((screen.getByTestId('check-L2A-X2') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('check-L2A-X1') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByTestId('check-L2A-X2'));
    fireEvent.click(screen.getByText('common.select'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ilma level1 elemendita kuvatakse kõik level2 read ja kinnitus ei lisa kirjeid', () => {
    const { onConfirm } = setup({ level1: null });
    expect(screen.getByText('Teise vanema')).toBeTruthy();
    fireEvent.click(screen.getByTestId('check-L2A-X1'));
    fireEvent.click(screen.getByText('common.select'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('veateate sulgemine', () => {
    setup();
    fireEvent.click(screen.getByText('common.select'));
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
    expect(screen.queryByText('Valige vähemalt üks rikkumine.')).toBeNull();
  });
});
