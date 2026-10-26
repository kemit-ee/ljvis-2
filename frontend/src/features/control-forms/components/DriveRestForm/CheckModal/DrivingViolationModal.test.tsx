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

import { DrivingViolationModal } from './DrivingViolationModal';

const e = (key: number, parentKey: number | null, code: string, name: string, description?: string) =>
  ({ classifierValueKey: key, parentKey, code, name, description }) as never;

const l1a = e(1, null, 'A', 'Esimene');
const l1b = e(2, null, 'B', 'Teine');
const l2 = [
  e(10, 1, 'A1', 'Alam A1', 'Grupp 1'),
  e(11, 1, 'A2', 'Alam A2', 'Grupp 1'),
  e(12, 1, 'A3', 'Alam A3'),
  e(13, 2, 'B1', 'Alam B1', 'Grupp 2'),
];
const l3 = [
  e(20, 10, 'X1', 'Rikkumine 1', 'raske'),
  e(21, 10, 'X2', 'Rikkumine 2'),
  e(22, 13, 'Y1', 'Rikkumine Y'),
  e(23, 11, '', 'Nimeta kood'),
];

const setup = (opts: { level1?: unknown; existing?: unknown[] } = {}) => {
  const onConfirm = vi.fn();
  const setOpen = vi.fn();
  const props = {
    level1Items: [l1a, l1b],
    level2Items: l2,
    level3Items: l3,
    onConfirm,
    isModalOpen: true,
    setIsModalOpen: setOpen,
  };
  const ui = (existing: unknown[]) => (
    <DrivingViolationModal
      {...props}
      level1Item={(opts.level1 === undefined ? l1a : opts.level1) as never}
      existingEntries={existing as never}
    />
  );
  const view = render(ui(opts.existing ?? []));
  return { onConfirm, setOpen, rerender: (existing: unknown[]) => view.rerender(ui(existing)) };
};

const trigger = (name: string) => screen.getByText(name).closest('tr')!.querySelector('button') as HTMLButtonElement;
const confirmBtn = () => screen.getAllByText('common.select').at(-1) as HTMLElement;

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DrivingViolationModal', () => {
  it('rühmitab level2 read kirjelduse järgi ("Muud" puuduva korral)', () => {
    setup();
    expect(screen.getByText('Grupp 1')).toBeTruthy();
    expect(screen.getByText('Muud')).toBeTruthy();
    expect(screen.queryByText('Alam B1')).toBeNull();
    expect((trigger('Alam A3')).disabled).toBe(true);
  });

  it('level1 puudumisel kuvatakse kõik level2 read', () => {
    setup({ level1: null });
    expect(screen.getByText('Alam B1')).toBeTruthy();
  });

  it('ripploend avaneb, valib, kinnitab ja eemaldab valiku', () => {
    const { onConfirm, setOpen } = setup();
    fireEvent.click(trigger('Alam A1'));
    fireEvent.click(screen.getByTestId('check-A1-X1'));
    fireEvent.click(screen.getByTestId('check-A1-X2'));
    expect(screen.getAllByText('X1').length).toBeGreaterThan(0);
    fireEvent.click(confirmBtn());
    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ level1Code: 'A', level2Code: 'A1', level3Code: 'X1', severity: 'raske', level2Description: 'Grupp 1' }),
      expect.objectContaining({ level3Code: 'X2', severity: '' }),
    ]);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('eemalda nupp tühjendab valiku ja viib tühja kinnituse veani', () => {
    const { onConfirm } = setup();
    fireEvent.click(trigger('Alam A1'));
    fireEvent.click(screen.getByTestId('check-A1-X1'));
    fireEvent.click(screen.getByText('common.remove'));
    expect(screen.queryByTestId('check-A1-X1')).toBeNull();
    fireEvent.click(confirmBtn());
    expect(screen.getByText('Valige vähemalt üks rikkumine.')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(trigger('Alam A1'));
    fireEvent.click(screen.getByTestId('check-A1-X1'));
    expect(screen.queryByText('Valige vähemalt üks rikkumine.')).toBeNull();
  });

  it('teine klikk sulgeb ripploendi; väljaspool klikk sulgeb ka', () => {
    setup();
    fireEvent.click(trigger('Alam A1'));
    expect(screen.getByTestId('check-A1-X1')).toBeTruthy();
    fireEvent.click(trigger('Alam A1'));
    expect(screen.queryByTestId('check-A1-X1')).toBeNull();
    fireEvent.click(trigger('Alam A1'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('check-A1-X1')).toBeNull();
    fireEvent.mouseDown(document.body);
  });

  it('ripploend avaneb ülespoole, kui all pole ruumi', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 700, bottom: 740, left: 5, width: 120, height: 40, right: 125, x: 5, y: 700, toJSON: () => ({}),
    });
    setup();
    fireEvent.click(trigger('Alam A1'));
    const menu = screen.getByTestId('check-A1-X1').closest('[style]') as HTMLElement;
    expect(menu.style.bottom).not.toBe('');
  });

  it('ripploend avaneb allapoole, kui ruumi on', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 100, bottom: 140, left: 5, width: 120, height: 40, right: 125, x: 5, y: 100, toJSON: () => ({}),
    });
    setup();
    fireEvent.click(trigger('Alam A1'));
    const menu = screen.getByTestId('check-A1-X1').closest('[style]') as HTMLElement;
    expect(menu.style.top).toBe('140px');
  });

  it('olemasolevad kirjed on eelvalitud ja muutuvad, kui sissetulevad kirjed muutuvad', () => {
    const { rerender } = setup({ existing: [{ level1Code: 'A', level2Code: 'A1', level3Code: 'X2' }] });
    fireEvent.click(trigger('Alam A1'));
    expect((screen.getByTestId('check-A1-X2') as HTMLInputElement).checked).toBe(true);
    rerender([{ level1Code: 'A', level2Code: 'A1', level3Code: 'X1' }]);
    fireEvent.click(trigger('Alam A1'));
    expect((screen.getByTestId('check-A1-X1') as HTMLInputElement).checked).toBe(true);
  });

  it('level3 ilma koodita näitab ainult nime; tundmatu valitud kood näitab koodi', () => {
    setup({ existing: [{ level1Code: 'A', level2Code: 'A2', level3Code: '' }, { level1Code: 'A', level2Code: 'A1', level3Code: 'GONE' }] });
    expect(screen.getByText('Nimeta kood')).toBeTruthy();
    expect(screen.getByText('GONE')).toBeTruthy();
  });

  it('kirjed, millel puudub level1 vaste, ei satu tulemusse', () => {
    const { onConfirm } = setup({ level1: null });
    fireEvent.click(trigger('Alam B1'));
    fireEvent.click(screen.getByTestId('check-B1-Y1'));
    fireEvent.click(confirmBtn());
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ level1Code: 'B', level3Code: 'Y1' })]);
  });

  it('veateate sulgemine', () => {
    setup();
    fireEvent.click(confirmBtn());
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
    expect(screen.queryByText('Valige vähemalt üks rikkumine.')).toBeNull();
  });
});
