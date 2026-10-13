// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoadOtherFields, ROAD_LOOKUP_DEBOUNCE_MS } from './RoadOtherFields';
import { findOtherRoadName } from './roadOtherLookup';

vi.mock('./roadOtherLookup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./roadOtherLookup')>()),
  findOtherRoadName: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const typeNumber = (container: HTMLElement, value: string) => {
  const input = container.querySelector('#roadOtherNumber') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
};

const flushDebounce = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ROAD_LOOKUP_DEBOUNCE_MS);
  });
};

describe('RoadOtherFields', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(findOtherRoadName).mockReset();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fills the road name from the lookup after typing stops', async () => {
    vi.mocked(findOtherRoadName).mockResolvedValue('Posti tee');
    const onChange = vi.fn();
    const { container } = render(<RoadOtherFields value="" onChange={onChange} />);

    typeNumber(container, '11');
    typeNumber(container, '11-94');
    await flushDebounce();

    expect(findOtherRoadName).toHaveBeenCalledTimes(1);
    expect(findOtherRoadName).toHaveBeenCalledWith('1194');
    expect(onChange).toHaveBeenCalledWith('Posti tee');
    expect(screen.queryByText('forms.compound.road_other_number_not_found')).toBeNull();
  });

  it('shows a non-blocking hint and keeps manual entry when there is no match', async () => {
    vi.mocked(findOtherRoadName).mockResolvedValue(undefined);
    const onChange = vi.fn();
    const { container } = render(<RoadOtherFields value="" onChange={onChange} />);

    typeNumber(container, '99999');
    await flushDebounce();

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('forms.compound.road_other_number_not_found')).toBeTruthy();
    const nameInput = container.querySelector('#roadOther') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Käsitsi tee' } });
    expect(onChange).toHaveBeenCalledWith('Käsitsi tee');
  });

  it('ignores a lookup that resolves after the number was cleared', async () => {
    let resolve: (name: string) => void = () => {};
    vi.mocked(findOtherRoadName).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const onChange = vi.fn();
    const { container } = render(<RoadOtherFields value="" onChange={onChange} />);

    typeNumber(container, '1194');
    await flushDebounce();
    typeNumber(container, '');
    await act(async () => {
      resolve('Posti tee');
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
