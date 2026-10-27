// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormVersionsTable } from './FormVersionsTable';
import { getFormSnapshots, getTramFormSnapshots } from '../../api';
import { FORM_VERSION_SAVED_EVENT } from '../AdministrativeProcedureCard/AdministrativeProcedureCard';

vi.mock('../../api', () => ({ getFormSnapshots: vi.fn(), getTramFormSnapshots: vi.fn() }));
vi.mock('../../../../shared/components/VersionsTable', () => ({
  VersionsTable: (p: {
    snapshots: { snapshotId: string; status: string }[];
    getSnapshotLink: (s: never) => string;
    getStatusLabel: (s: string) => string;
  }) => (
    <ul>
      {p.snapshots.map((s) => (
        <li key={s.snapshotId}>
          {p.getSnapshotLink(s as never)}|{p.getStatusLabel(s.status)}
        </li>
      ))}
    </ul>
  ),
}));

const snap = [
  { snapshotId: 's1', status: 'saved' },
  { snapshotId: 's2', status: 'weird' },
];

describe('FormVersionsTable', () => {
  beforeEach(() => {
    vi.mocked(getFormSnapshots).mockReset().mockResolvedValue(snap as never);
    vi.mocked(getTramFormSnapshots).mockReset().mockResolvedValue(snap as never);
  });
  afterEach(cleanup);

  it('laeb üldised versioonid ja ehitab lingid', async () => {
    render(<FormVersionsTable formId="7" formType="compound-form" />);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(getFormSnapshots).toHaveBeenCalledWith('7', 'compound-form');
    expect(screen.getAllByRole('listitem')[0].textContent).toMatch(/^\/control-forms\/.+\/7\/s1\|/);
    expect(screen.getAllByRole('listitem')[1].textContent).toMatch(/\|weird$/);
  });

  it('TRAM kaart kasutab eraldi lõpp-punkti', async () => {
    render(<FormVersionsTable formId="7" formType="tram-card" />);
    await waitFor(() => expect(getTramFormSnapshots).toHaveBeenCalledWith('7'));
    expect(getFormSnapshots).not.toHaveBeenCalled();
  });

  it('mittemassiivi vastus annab tühja tabeli ja viga logitakse', async () => {
    vi.mocked(getFormSnapshots).mockResolvedValueOnce({} as never);
    const { unmount } = render(<FormVersionsTable formId="7" formType="x-form" />);
    await waitFor(() => expect(getFormSnapshots).toHaveBeenCalled());
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    unmount();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getFormSnapshots).mockRejectedValueOnce(new Error('x'));
    render(<FormVersionsTable formId="7" formType="x-form" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('värskendab haldusmenetluse salvestuse sündmusel ainult oma vormi jaoks', async () => {
    render(<FormVersionsTable formId="7" formType="compound-form" />);
    await waitFor(() => expect(getFormSnapshots).toHaveBeenCalledTimes(1));
    act(() => {
      window.dispatchEvent(new CustomEvent(FORM_VERSION_SAVED_EVENT, { detail: { formKey: '99' } }));
      window.dispatchEvent(new CustomEvent(FORM_VERSION_SAVED_EVENT));
    });
    expect(getFormSnapshots).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new CustomEvent(FORM_VERSION_SAVED_EVENT, { detail: { formKey: '7' } }));
    });
    await waitFor(() => expect(getFormSnapshots).toHaveBeenCalledTimes(2));
  });
});
