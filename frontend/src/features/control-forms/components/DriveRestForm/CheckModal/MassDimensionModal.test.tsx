// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../../testing/tediStubs');
  return {
    ...(await orig<object>()),
    Modal: stubs.ModalStub,
    Checkbox: stubs.CheckboxStub,
    Textarea: stubs.TextareaStub,
  };
});

import { MassDimensionModal } from './MassDimensionModal';

const e = (key: number, parentKey: number | null, code: string, name: string, description?: string) =>
  ({ classifierValueKey: key, parentKey, code, name, description }) as never;

const level1 = [
  e(1, null, 'M3', 'Mass N3', 'Mass'),
  e(2, null, 'M2', 'Mass N2', 'Mass'),
  e(3, null, 'DIM', 'Mõõtmed'),
];
const level2 = [
  e(10, 1, 'M3A', 'Üle 40t', 'raske'),
  e(11, 1, 'M3B', 'Telg'),
  e(12, 2, 'M2A', 'Üle 12t'),
  e(13, 3, 'DIM1', 'Pikkus', 'pikk'),
  e(14, 3, 'DIM2', 'Laius'),
];

const render_ = (open: boolean, existing: unknown[] = []) => {
  const onConfirm = vi.fn();
  const setOpen = vi.fn();
  const ui = (o: boolean, ex: unknown[]) => (
    <MassDimensionModal
      level1Items={level1}
      level2Items={level2}
      existingEntries={ex as never}
      onConfirm={onConfirm}
      isModalOpen={o}
      setIsModalOpen={setOpen}
    />
  );
  const view = render(ui(open, existing));
  return { onConfirm, setOpen, rerender: (o: boolean, ex: unknown[] = existing) => view.rerender(ui(o, ex)) };
};

const confirmBtn = () => screen.getAllByText('common.select').at(-1) as HTMLElement;
const groupTrigger = (name: string) => screen.getByText(name).closest('tr')!.querySelector('button') as HTMLButtonElement;

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MassDimensionModal', () => {
  it('kuvab sama kirjeldusega rühmade päise ainult korra', () => {
    render_(true);
    expect(screen.getAllByText('Mass')).toHaveLength(1);
    expect(screen.getByText('Mass N3')).toBeTruthy();
    expect(screen.getByText('Mass N2')).toBeTruthy();
  });

  it('rühma ripploend: valik, kinnitus ja sulgemine', () => {
    const { onConfirm, setOpen } = render_(true);
    fireEvent.click(groupTrigger('Mass N3'));
    fireEvent.click(screen.getByTestId('check-M3A'));
    fireEvent.click(screen.getByTestId('check-M3B'));
    fireEvent.click(screen.getByTestId('check-M3B'));
    expect(screen.getAllByText('raske').length).toBeGreaterThan(0);
    fireEvent.click(confirmBtn());
    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ level1Code: 'M3', level2Code: 'M3A', level3Code: 'M3A', severity: 'raske' }),
    ]);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('rühma ripploend: eemalda, teine klikk ja välisklikk sulgevad', () => {
    const { onConfirm } = render_(true);
    fireEvent.click(groupTrigger('Mass N3'));
    fireEvent.click(screen.getByTestId('check-M3A'));
    fireEvent.click(screen.getByText('common.remove'));
    expect(screen.queryByTestId('check-M3A')).toBeNull();
    fireEvent.click(confirmBtn());
    expect(screen.getByText('Valige vähemalt üks rikkumine.')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(groupTrigger('Mass N3'));
    fireEvent.click(groupTrigger('Mass N3'));
    expect(screen.queryByTestId('check-M3A')).toBeNull();
    fireEvent.click(groupTrigger('Mass N2'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('check-M2A')).toBeNull();
    fireEvent.mouseDown(document.body);
  });

  it('kirjelduseta rühma l2 read on otse linnukesed märkusega', () => {
    const { onConfirm } = render_(true);
    fireEvent.click(screen.getByTestId('check-DIM1'));
    fireEvent.click(screen.getByTestId('check-DIM2'));
    const notes = screen.getAllByPlaceholderText('common.note');
    expect(notes).toHaveLength(2);
    fireEvent.change(notes[0], { target: { value: 'märkus' } });
    fireEvent.click(confirmBtn());
    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ level2Code: 'DIM1', note: 'märkus', severity: 'pikk' }),
      expect.objectContaining({ level2Code: 'DIM2', note: '' }),
    ]);
  });

  it('olemasolevad kirjed on eelvalitud; muutuvad kirjed lähtestavad seisu', () => {
    const { rerender } = render_(true, [{ level2Code: 'DIM2', note: 'vana' }, { level2Code: 'M3B' }]);
    expect((screen.getByTestId('check-DIM2') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(groupTrigger('Mass N3'));
    expect((screen.getByTestId('check-M3B') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByDisplayValue('vana')).toBeTruthy();
    rerender(true, [{ level2Code: 'DIM1' }]);
    expect((screen.getByTestId('check-DIM1') as HTMLInputElement).checked).toBe(true);
  });

  it('sulgemisel tühjendatakse märkmed märkimata kirjetelt', () => {
    const { rerender } = render_(true);
    fireEvent.change(screen.getAllByPlaceholderText('common.note')[0], { target: { value: 'ununeb' } });
    expect(screen.getByDisplayValue('ununeb')).toBeTruthy();
    rerender(false);
    rerender(true);
    expect(screen.queryByDisplayValue('ununeb')).toBeNull();
  });

  it('veateate sulgemine', () => {
    render_(true);
    fireEvent.click(confirmBtn());
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
    expect(screen.queryByText('Valige vähemalt üks rikkumine.')).toBeNull();
  });
});
