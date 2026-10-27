// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn() }));
vi.mock('../../shared/api/client', () => client);

import {
  deleteFormAttachment,
  downloadFormAttachment,
  getFormAttachments,
  uploadFormAttachment,
} from './api/filesApi';
import { useFormFiles } from './hooks/useFormFiles';
import { FormFiles } from './components/FormFiles';
import type { FormAttachment } from './types/files';

const file = (over: Partial<FormAttachment> = {}): FormAttachment => ({
  id: 1,
  formNumber: 'F1',
  fileName: 'a.pdf',
  s3Key: 'k',
  status: 'active',
  createdAt: '2026-03-31T09:05:00Z',
  createdBy: 'x',
  ...over,
});

const pdf = (name = 'b.pdf', type = 'application/pdf', size = 10) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

beforeEach(() => {
  client.get.mockReset();
  client.post.mockReset();
  client.del.mockReset();
  client.get.mockResolvedValue([]);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('filesApi', () => {
  it('calls the control-forms endpoints', async () => {
    client.get.mockResolvedValue([]);
    await getFormAttachments('adr', 'F1');
    expect(client.get).toHaveBeenCalledWith('/v1/control-forms/adr/read/files/list', { form_number: 'F1' });
    const data = { form_number: 'F1', file_name: 'a', file_base64: 'b', mimetype: 'c' };
    await uploadFormAttachment('adr', data);
    expect(client.post).toHaveBeenCalledWith('/v1/control-forms/adr/edit/upload', data);
    await deleteFormAttachment('adr', 5);
    expect(client.del).toHaveBeenCalledWith('/v1/control-forms/adr/edit/delete', { q: '5' });
    await downloadFormAttachment('adr', 5);
    expect(client.get).toHaveBeenLastCalledWith('/v1/control-forms/adr/read/files/download', { q: '5' });
  });
});

describe('useFormFiles', () => {
  it('loads files, ignoring non-array results and failures', async () => {
    client.get.mockResolvedValueOnce([file()]);
    const { result } = renderHook(() => useFormFiles('adr', 'F1', true));
    await waitFor(() => expect(result.current.files).toHaveLength(1));

    client.get.mockResolvedValueOnce({ not: 'array' });
    const r2 = renderHook(() => useFormFiles('adr', 'F2', true));
    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(r2.result.current.isLoading).toBe(false));
    expect(r2.result.current.files).toEqual([]);

    client.get.mockRejectedValueOnce(new Error('x'));
    const r3 = renderHook(() => useFormFiles('adr', 'F3', true));
    await waitFor(() => expect(r3.result.current.isLoading).toBe(false));
    expect(r3.result.current.files).toEqual([]);
  });

  it('does not load without a form number', () => {
    renderHook(() => useFormFiles('adr', '', true));
    expect(client.get).not.toHaveBeenCalled();
  });

  function change(result: { current: ReturnType<typeof useFormFiles> }, files: File[] | null) {
    const target = { files, value: 'x' };
    act(() => result.current.handleFileChange({ target } as never));
    return target;
  }

  it('validates the selected file', async () => {
    client.get.mockResolvedValue([file({ fileName: 'dup.pdf' })]);
    const { result } = renderHook(() => useFormFiles('adr', 'F1', true));
    await waitFor(() => expect(result.current.files).toHaveLength(1));

    change(result, null);
    expect(result.current.fileToUpload).toBeNull();
    change(result, []);

    const tooBig = change(result, [pdf('big.pdf', 'application/pdf', 21 * 1024 * 1024)]);
    expect(result.current.fileError).toBe('form.files.error.tooLarge');
    expect(tooBig.value).toBe('');

    const bad = change(result, [pdf('x.exe', 'application/x-msdownload')]);
    expect(result.current.fileError).toBe('form.files.error.invalidType');
    expect(bad.value).toBe('');

    change(result, [pdf('dup.pdf')]);
    expect(result.current.duplicateWarning).toBe('form.files.error.duplicate');
    expect(result.current.fileToUpload?.name).toBe('dup.pdf');

    change(result, [pdf('ok.PNG', '')]);
    expect(result.current.duplicateWarning).toBeNull();
    expect(result.current.fileError).toBeNull();
  });

  it('uploads and refreshes; clears state on modal close', async () => {
    client.post.mockResolvedValue({});
    const { result } = renderHook(() => useFormFiles('adr', 'F1', true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.handleUpload());
    expect(client.post).not.toHaveBeenCalled();

    act(() => result.current.handleUploadModalToggle(true));
    expect(result.current.uploadModalOpen).toBe(true);
    change(result, [pdf()]);
    await act(async () => {
      await result.current.handleUpload();
    });
    await waitFor(() => expect(client.post).toHaveBeenCalled());
    expect(client.post.mock.calls[0][1]).toMatchObject({
      form_number: 'F1',
      file_name: 'b.pdf',
      mimetype: 'application/pdf',
    });
    await waitFor(() => expect(result.current.uploadModalOpen).toBe(false));

    change(result, [pdf()]);
    act(() => result.current.handleUploadModalToggle(false));
    expect(result.current.fileToUpload).toBeNull();
  });

  it('survives upload, delete and download failures', async () => {
    client.post.mockRejectedValue(new Error('x'));
    client.del.mockRejectedValue(new Error('x'));
    client.get.mockResolvedValue([]);
    const { result } = renderHook(() => useFormFiles('adr', 'F1', true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    change(result, [pdf('c.pdf', '')]);
    await act(async () => {
      await result.current.handleUpload();
    });
    await waitFor(() => expect(result.current.isUploading).toBe(false));
    expect(result.current.uploadModalOpen).toBe(false);

    await act(() => result.current.handleDelete(1));
    expect(result.current.isDeleting).toBeNull();

    client.get.mockRejectedValueOnce(new Error('x'));
    await act(() => result.current.handleDownload(file()));
  });

  it('deletes and downloads via a temporary link', async () => {
    client.del.mockResolvedValue({});
    const { result } = renderHook(() => useFormFiles('adr', 'F1', true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.handleDelete(1));
    expect(client.del).toHaveBeenCalled();

    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    client.get.mockResolvedValueOnce({ url: 'http://s3/x', filename: '' });
    await act(() => result.current.handleDownload(file()));
    expect(click).toHaveBeenCalled();
  });
});

describe('FormFiles', () => {
  it('renders nothing without a form number', () => {
    const { container } = render(<FormFiles formType="adr" formNumber="" canEdit />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the empty state and hides edit controls when read-only', async () => {
    render(<FormFiles formType="adr" formNumber="F1" canEdit={false} />);
    await waitFor(() => expect(screen.getByText('form.files.empty')).toBeTruthy());
    expect(screen.queryByText('form.files.addBtn')).toBeNull();
  });

  it('lists files, downloads and deletes after confirmation', async () => {
    client.get.mockResolvedValue([file(), file({ id: 2, fileName: 'gone.pdf', status: 'deleted' })]);
    client.del.mockResolvedValue({});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<FormFiles formType="adr" formNumber="F1" canEdit />);
    await waitFor(() => expect(screen.getByText('a.pdf')).toBeTruthy());
    expect(screen.getByText('form.files.status.active')).toBeTruthy();
    expect(screen.getByText('form.files.status.deleted')).toBeTruthy();

    client.get.mockResolvedValueOnce({ url: 'u', filename: 'f' });
    fireEvent.click(screen.getAllByText('common.download')[0]);

    fireEvent.click(screen.getAllByText('common.remove')[0]);
    expect(screen.getByText('form.files.confirmDeleteTitle')).toBeTruthy();
    fireEvent.click(screen.getByText('common.yes'));
    await waitFor(() => expect(client.del).toHaveBeenCalled());
  });

  it('opens the upload modal and shows validation messages', async () => {
    const { baseElement } = render(<FormFiles formType="adr" formNumber="F1" canEdit />);
    await waitFor(() => expect(screen.getByText('form.files.empty')).toBeTruthy());
    fireEvent.click(screen.getByText('form.files.addBtn'));
    const input = baseElement.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { files: [pdf('x.exe', 'application/x-msdownload')] } });
    await waitFor(() => expect(screen.getByText('form.files.error.invalidType')).toBeTruthy());
    fireEvent.change(input, { target: { files: [pdf('ok.pdf')] } });
    await waitFor(() => expect(screen.queryByText('form.files.error.invalidType')).toBeNull());
  });
});
