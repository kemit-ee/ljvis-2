// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { XroadLogStatusFilter } from './XroadLogStatusFilter';

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

const setup = (f: boolean, nf: boolean, e: boolean) => {
  const onChange = vi.fn();
  render(<XroadLogStatusFilter includeFound={f} includeNotFound={nf} includeError={e} includeUnmapped={true} onChange={onChange} />);
  return onChange;
};

describe('XroadLogStatusFilter', () => {
  it('"Kõik" märgib kõik kui mõni puudub', () => {
    const onChange = setup(true, false, true);
    fireEvent.click(screen.getByLabelText('xroadLogs.filter.all'));
    expect(onChange).toHaveBeenCalledWith({ includeFound: true, includeNotFound: true, includeError: true, includeUnmapped: true });
  });

  it('"Kõik" eemaldab kõik kui kõik märgitud', () => {
    const onChange = setup(true, true, true);
    fireEvent.click(screen.getByLabelText('xroadLogs.filter.all'));
    expect(onChange).toHaveBeenCalledWith({ includeFound: false, includeNotFound: false, includeError: false, includeUnmapped: false });
  });

  it('üksikud märkeruudud lülituvad eraldi', () => {
    const onChange = setup(true, true, true);
    fireEvent.click(screen.getByLabelText('xroadLogs.status.found'));
    expect(onChange).toHaveBeenLastCalledWith({ includeFound: false, includeNotFound: true, includeError: true, includeUnmapped: true });
    fireEvent.click(screen.getByLabelText('xroadLogs.status.notFound'));
    expect(onChange).toHaveBeenLastCalledWith({ includeFound: true, includeNotFound: false, includeError: true, includeUnmapped: true });
    fireEvent.click(screen.getByLabelText('xroadLogs.status.unmapped'));
    expect(onChange).toHaveBeenLastCalledWith({ includeFound: true, includeNotFound: true, includeError: true, includeUnmapped: false });
    fireEvent.click(screen.getByLabelText('xroadLogs.status.error'));
    expect(onChange).toHaveBeenLastCalledWith({ includeFound: true, includeNotFound: true, includeError: false, includeUnmapped: true });
  });
});
