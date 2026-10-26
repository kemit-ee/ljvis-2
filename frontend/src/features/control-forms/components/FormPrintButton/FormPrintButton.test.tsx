// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormPrintButton } from './FormPrintButton';
import { printControlForm } from '../../api';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../api', () => ({ printControlForm: vi.fn() }));

describe('FormPrintButton', () => {
  beforeEach(() => {
    vi.mocked(printControlForm).mockReset();
    vi.mocked(printControlForm).mockResolvedValue({ base64: btoa('pdf'), contentType: 'application/pdf', filename: 'f.pdf' } as never);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('ilma id-ta pakub ainult tühja vormi', async () => {
    render(<FormPrintButton endpoint="/e" />);
    fireEvent.click(screen.getByText('common.printBlank'));
    await waitFor(() => expect(printControlForm).toHaveBeenCalledWith('/e', undefined, true, undefined));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });

  it('id-ga pakub täidetud ja tühja vormi', async () => {
    render(<FormPrintButton endpoint="/e" id={5} snapshotId="s1" />);
    fireEvent.click(screen.getByText('common.printFilled'));
    await waitFor(() => expect(printControlForm).toHaveBeenCalledWith('/e', 5, false, 's1'));
    fireEvent.click(screen.getByText('common.printBlank'));
    await waitFor(() => expect(printControlForm).toHaveBeenCalledWith('/e', 5, true, 's1'));
  });

  it('vea korral vabastab nupu', async () => {
    vi.mocked(printControlForm).mockRejectedValue(new Error('x'));
    const proc = (globalThis as unknown as { process: { on(e: string, f: () => void): void; off(e: string, f: () => void): void } }).process;
    const unhandled = vi.fn();
    proc.on('unhandledRejection', unhandled);
    render(<FormPrintButton endpoint="/e" />);
    fireEvent.click(screen.getByText('common.printBlank'));
    await waitFor(() => expect(printControlForm).toHaveBeenCalled());
    await waitFor(() => expect((screen.getByText('common.printBlank') as HTMLButtonElement).disabled).toBe(false));
    proc.off('unhandledRejection', unhandled);
  });
});
