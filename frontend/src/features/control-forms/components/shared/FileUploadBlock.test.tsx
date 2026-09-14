// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileUploadBlock } from './FileUploadBlock';
import { listFormFiles, uploadFormFile } from '../../api';

vi.mock('../../api', () => ({
  listFormFiles: vi.fn(),
  uploadFormFile: vi.fn(),
  deleteFormFile: vi.fn(),
  downloadFormFile: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('FileUploadBlock TEDI integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listFormFiles).mockResolvedValue([]);
    vi.mocked(uploadFormFile).mockResolvedValue({ id: '1', fileName: 'kontroll.pdf' });
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('uploads a file even when TEDI has already assigned its temporary ID', async () => {
    const { container } = render(
      <FileUploadBlock formPath="drive-rest-form/driver" formNumber="SP-2026-1" />,
    );
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(['test PDF'], 'kontroll.pdf', { type: 'application/pdf' })] },
    });

    await waitFor(() => expect(uploadFormFile).toHaveBeenCalledWith(
      'drive-rest-form/driver',
      {
        formNumber: 'SP-2026-1',
        fileName: 'kontroll.pdf',
        fileBase64: 'dGVzdCBQREY=',
        mimetype: 'application/pdf',
      },
    ));
    expect(uploadFormFile).toHaveBeenCalledTimes(1);
  });

  it('disables file selection until a form number exists', () => {
    const { container } = render(<FileUploadBlock formPath="drive-rest-form/driver" />);
    expect((container.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBe(true);
    expect(listFormFiles).not.toHaveBeenCalled();
  });
});
