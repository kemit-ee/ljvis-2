// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { XroadLogContentModal } from './XroadLogContentModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// TEDI vajab matchMedia'd, mida jsdom ei paku.
window.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

afterEach(cleanup);

describe('XroadLogContentModal', () => {
  it('kuvab JSON-i vormindatult', () => {
    render(<XroadLogContentModal title="Päring" content='{"a":1}' onClose={vi.fn()} />);
    expect(screen.getByText('Päring')).toBeTruthy();
    expect(document.querySelector('pre')?.textContent).toBe('{\n  "a": 1\n}');
  });

  it('mitte-JSON sisu jääb samaks', () => {
    render(<XroadLogContentModal title="T" content="<xml/>" onClose={vi.fn()} />);
    expect(document.querySelector('pre')?.textContent).toBe('<xml/>');
  });

  it('tühi sisu näitab tühja teadet', () => {
    render(<XroadLogContentModal title="T" content="" onClose={vi.fn()} />);
    expect(screen.getByText('xroadLogs.empty')).toBeTruthy();
  });

  it('sulgemisnupp kutsub onClose', () => {
    const onClose = vi.fn();
    render(<XroadLogContentModal title="T" content="x" onClose={onClose} />);
    fireEvent.click(screen.getByText('common.close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('null sisu = suletud modaal', () => {
    render(<XroadLogContentModal title="Suletud" content={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Suletud')).toBeNull();
  });
});
