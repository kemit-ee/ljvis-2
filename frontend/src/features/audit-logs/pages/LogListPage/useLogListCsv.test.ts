// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLogListCsv } from './useLogListCsv';
import { exportLogs } from '../../api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../api', () => ({ exportLogs: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe('useLogListCsv', () => {
  it('koostab CSV, escape\'ib erimärgid ja BOM-iga blob', async () => {
    vi.mocked(exportLogs).mockResolvedValue({
      content: [
        {
          eventId: '1',
          eventType: 'T',
          eventCategory: 'C',
          description: 'a;b &quot;q&quot;',
          logContent: 'line1\nline2',
        },
        { eventId: '2', eventType: '', eventCategory: '', description: '', actorName: 'A', createdAt: '2026-01-01T00:00:00' },
      ],
      total: 2,
    });
    let blob: Blob | undefined;
    Object.assign(URL, {
      createObjectURL: (b: Blob) => {
        blob = b;
        return 'blob:x';
      },
      revokeObjectURL: vi.fn(),
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { result } = renderHook(() => useLogListCsv());
    await act(() => result.current.exportCsv({ search: '' }));
    expect(click).toHaveBeenCalled();
    const text = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsText(blob!);
    });
    expect(text).toContain('logs.date;logs.person');
    expect(text).toContain('"a;b ""q"""');
    expect(text).toContain('"line1\nline2"');
  });

  it('viga eksportimisel logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(exportLogs).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useLogListCsv());
    await act(() => result.current.exportCsv({}));
    await waitFor(() => expect(err).toHaveBeenCalled());
  });
});
