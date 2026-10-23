// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileUploadBlock } from './FileUploadBlock';
import { deleteFormFile, downloadFormFile, listFormFiles, uploadFormFile } from '../../api';

vi.mock('@tedi-design-system/react/tedi', async () => ({
  ...(await import('../../testSupport/tediMock')).tediMock,
  FileUpload: (p: {
    files: { id: string; name: string }[];
    disabled?: boolean;
    onChange: (f: unknown[]) => void;
    onDelete: (f: unknown) => void;
  }) => (
    <div data-testid="upload" data-disabled={String(!!p.disabled)}>
      <button onClick={() => p.onChange([new File(['x'], 'a.pdf', { type: 'application/pdf' })])}>upload</button>
      <button onClick={() => p.onChange([{ id: '1', name: 'existing' }])}>upload-existing</button>
      <button onClick={() => p.onDelete({ id: '9', name: 'f' })}>delete</button>
      <button onClick={() => p.onDelete({ name: 'noid' })}>delete-noid</button>
    </div>
  ),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../api', () => ({
  listFormFiles: vi.fn(),
  uploadFormFile: vi.fn(),
  deleteFormFile: vi.fn(),
  downloadFormFile: vi.fn(),
}));

describe('FileUploadBlock toimingud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listFormFiles).mockResolvedValue([{ id: '1', fileName: 'kontroll.pdf' }] as never);
    vi.mocked(uploadFormFile).mockResolvedValue({ id: '2' } as never);
    vi.mocked(deleteFormFile).mockResolvedValue(undefined as never);
    vi.mocked(downloadFormFile).mockResolvedValue({ url: 'blob:x' } as never);
    vi.stubGlobal('open', vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const renderBlock = () => render(<FileUploadBlock formPath="x" formNumber="N1" label="L" />);

  it('laeb nimekirja, laadib faili alla ja kustutab', async () => {
    renderBlock();
    const link = await screen.findByText('kontroll.pdf');
    fireEvent.click(link);
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('blob:x', '_blank'));
    fireEvent.click(screen.getByText('delete'));
    await waitFor(() => expect(deleteFormFile).toHaveBeenCalledWith('x', '9'));
    fireEvent.click(screen.getByText('delete-noid'));
    expect(deleteFormFile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(listFormFiles).toHaveBeenCalledTimes(2));
  });

  it('üleslaadimine uuendab nimekirja; olemasolevaid faile ei laeta uuesti', async () => {
    renderBlock();
    await screen.findByText('kontroll.pdf');
    fireEvent.click(screen.getByText('upload-existing'));
    expect(uploadFormFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('upload'));
    await waitFor(() => expect(uploadFormFile).toHaveBeenCalled());
    await waitFor(() => expect(listFormFiles).toHaveBeenCalledTimes(2));
  });

  it('veaolukorrad näitavad veateadet; nimekirja viga tühjendab', async () => {
    vi.mocked(uploadFormFile).mockRejectedValue(new Error('x'));
    renderBlock();
    await screen.findByText('kontroll.pdf');
    fireEvent.click(screen.getByText('upload'));
    await waitFor(() => expect(screen.getByText('forms.shared.files.error')).toBeTruthy());
    cleanup();

    vi.mocked(deleteFormFile).mockRejectedValue(new Error('x'));
    renderBlock();
    await screen.findByText('kontroll.pdf');
    fireEvent.click(screen.getByText('delete'));
    await waitFor(() => expect(screen.getByText('forms.shared.files.error')).toBeTruthy());
    cleanup();

    vi.mocked(downloadFormFile).mockRejectedValue(new Error('x'));
    renderBlock();
    fireEvent.click(await screen.findByText('kontroll.pdf'));
    await waitFor(() => expect(screen.getByText('forms.shared.files.error')).toBeTruthy());
    cleanup();

    vi.mocked(listFormFiles).mockRejectedValue(new Error('x'));
    renderBlock();
    await waitFor(() => expect(listFormFiles).toHaveBeenCalled());
    expect(screen.queryByText('kontroll.pdf')).toBeNull();
  });

  it('formNumber puudub: üleslaadimist ei tehta; disabled töötab', async () => {
    render(<FileUploadBlock formPath="x" disabled />);
    fireEvent.click(screen.getByText('upload'));
    expect(uploadFormFile).not.toHaveBeenCalled();
    expect(screen.getByTestId('upload').getAttribute('data-disabled')).toBe('true');
  });
});
