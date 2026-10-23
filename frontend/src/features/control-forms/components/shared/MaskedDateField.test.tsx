// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaskedDateField } from './MaskedDateField';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('MaskedDateField', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const input = (c: HTMLElement) => c.querySelector('#d') as HTMLInputElement;

  it('lisab kuupäeva eraldajad kirjutamise ajal', () => {
    const { container } = render(<MaskedDateField id="d" label="Kuupäev" />);
    fireEvent.input(input(container), { target: { value: '31032026' } });
    expect(input(container).value).toBe('31.03.2026');
  });

  it('täiendab lühikuupäeva fookuse kaotamisel', () => {
    const onSelect = vi.fn();
    const { container } = render(<MaskedDateField id="d" label="Kuupäev" onSelect={onSelect} />);
    fireEvent.input(input(container), { target: { value: '031225' } });
    fireEvent.blur(input(container));
    expect(input(container).value).toBe('03.12.2025');
  });

  it('lõpetatud kuupäev blur-il jääb samaks', () => {
    const { container } = render(<MaskedDateField id="d" label="Kuupäev" selected={new Date('2026-03-31')} />);
    fireEvent.blur(input(container));
    expect(input(container).value).toBe('31.03.2026');
  });

  it('hoiab valitud kuupäeva identiteeti ja talub mitte-Date väärtust', () => {
    const { container, rerender } = render(<MaskedDateField id="d" label="K" selected={new Date('2026-03-31')} />);
    rerender(<MaskedDateField id="d" label="K" selected={new Date('2026-03-31')} />);
    rerender(<MaskedDateField id="d" label="K" selected={undefined} />);
    expect(input(container)).toBeTruthy();
  });
});
