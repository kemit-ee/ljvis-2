// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../testing/tediStubs');
  return { ...(await orig<object>()), TextField: stubs.TextFieldStub };
});

import { ViolationPickerModal } from './ViolationPickerModal';

const e = (key: number, parentKey: number | null, code: string, name: string, isValid = true) =>
  ({ classifierValueKey: key, parentKey, code, name, isValid }) as never;

const classifiers = [
  e(1, null, 'A', 'Esimene'),
  e(2, 1, 'A1', 'Alam'),
  e(3, 2, 'A11', 'Leht'),
  e(4, 1, 'A2', 'Teine leht'),
  e(5, null, 'B', 'Teine rühm'),
  e(6, 5, 'B1', 'Muu leht'),
  e(7, null, 'Z', 'Aegunud', false),
];

const setup = () => {
  const onAdd = vi.fn();
  const onClose = vi.fn();
  render(<ViolationPickerModal violationClassifiers={classifiers} onAdd={onAdd} onClose={onClose} />);
  return { onAdd, onClose };
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ViolationPickerModal', () => {
  it('aegunud väärtused on peidetud ja lisamine on algul keelatud', () => {
    setup();
    expect(screen.queryByText(/Aegunud/)).toBeNull();
    expect((screen.getByText('forms.labour_inspection.violations.add').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('valib kolmanda taseme lehe ja lisab selle kogusega', () => {
    const { onAdd, onClose } = setup();
    fireEvent.click(screen.getByText('A — Esimene'));
    fireEvent.click(screen.getByText('A1 — Alam'));
    fireEvent.click(screen.getByText('A11 — Leht'));
    expect(screen.getByText('Esimene → Alam → Leht')).toBeTruthy();
    fireEvent.change(screen.getByTestId('violation-quantity'), { target: { value: '4x' } });
    fireEvent.click(screen.getByText('forms.labour_inspection.violations.add'));
    expect(onAdd).toHaveBeenCalledWith({ level1ValueKey: 1, level2ValueKey: 2, level3ValueKey: 3, quantity: 4 });
    expect(onClose).toHaveBeenCalled();
  });

  it('teise taseme leht ilma kolmanda tasemeta; tühi kogus on 1', () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByText('A — Esimene'));
    fireEvent.click(screen.getByText('A2 — Teine leht'));
    fireEvent.change(screen.getByTestId('violation-quantity'), { target: { value: '' } });
    fireEvent.click(screen.getByText('forms.labour_inspection.violations.add'));
    expect(onAdd).toHaveBeenCalledWith({ level1ValueKey: 1, level2ValueKey: 4, level3ValueKey: undefined, quantity: 1 });
  });

  it('juurtaseme leht ei ole lisatav ja haru saab kokku voltida', () => {
    setup();
    fireEvent.click(screen.getByText('A — Esimene'));
    expect(screen.getByText('A2 — Teine leht')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('collapse'));
    expect(screen.queryByText('A2 — Teine leht')).toBeNull();
  });

  it('radionupuga valik töötab', () => {
    setup();
    fireEvent.click(screen.getByText('B — Teine rühm'));
    const radio = document.querySelector('#violation-leaf-6') as HTMLInputElement;
    fireEvent.click(radio);
    expect(screen.getByText('Teine rühm → Muu leht')).toBeTruthy();
  });

  it('otsing näitab sobivaid ridu koos esivanematega', () => {
    setup();
    fireEvent.change(screen.getByTestId('violation-search'), { target: { value: 'a11' } });
    expect(screen.getByText('A11 — Leht')).toBeTruthy();
    expect(screen.getByText('A1 — Alam')).toBeTruthy();
    expect(screen.queryByText('B — Teine rühm')).toBeNull();
    fireEvent.change(screen.getByTestId('violation-search'), { target: { value: 'esimene' } });
    expect(screen.getByText('A2 — Teine leht')).toBeTruthy();
    fireEvent.change(screen.getByTestId('violation-search'), { target: { value: 'ei leia' } });
    expect(screen.getByText('common.tableIsEmpty')).toBeTruthy();
  });

  it('sulgemine nupust ja taustalt, dialoogi klikk ei sulge', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByText('common.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('forms.labour_inspection.violations.pickerTitle'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('forms.labour_inspection.violations.pickerTitle').closest('div[class*="overlay"]')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
