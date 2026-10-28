// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdministrativeProcedureCard, FORM_VERSION_SAVED_EVENT } from './AdministrativeProcedureCard';
import { getAdministrativeProcedure, saveAdministrativeProcedure } from '../../api';

const state = { allowed: true };
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: { version?: number }) => (o?.version ? `${k}:${o.version}` : k) }) }));
vi.mock('../../../../hooks/useCanUseAdministrativeProcedure', () => ({ useCanUseAdministrativeProcedure: () => state.allowed }));
vi.mock('../shared/MaskedDateField', async () => ({ MaskedDateField: (await import('../../testSupport/tediMock')).tediMock.DateField }));
vi.mock('../../api', () => ({ getAdministrativeProcedure: vi.fn(), saveAdministrativeProcedure: vi.fn() }));

describe('AdministrativeProcedureCard', () => {
  beforeEach(() => {
    state.allowed = true;
    vi.mocked(getAdministrativeProcedure).mockReset().mockResolvedValue({
      klimClarificationDate: '2026-01-02',
      adminProcedureDecision: 'otsus',
      penaltyExpiredOrProcessed: true,
    } as never);
    vi.mocked(saveAdministrativeProcedure).mockReset().mockResolvedValue([{ version: 3 }] as never);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('peidub ilma õiguse või vormivõtmeta', () => {
    state.allowed = false;
    const { container, rerender } = render(<AdministrativeProcedureCard formType={'ncr' as never} formKey={1} />);
    expect(container.innerHTML).toBe('');
    state.allowed = true;
    rerender(<AdministrativeProcedureCard formType={'ncr' as never} formKey={null} />);
    expect(container.innerHTML).toBe('');
    expect(getAdministrativeProcedure).not.toHaveBeenCalled();
  });

  it('laeb väärtused, muudab välju ja salvestab sündmusega', async () => {
    const onSaved = vi.fn();
    window.addEventListener(FORM_VERSION_SAVED_EVENT, onSaved);
    render(<AdministrativeProcedureCard formType={'ncr' as never} formKey={7} />);
    await waitFor(() => expect((document.getElementById('adminProcedureDecision') as HTMLTextAreaElement).value).toBe('otsus'));
    fireEvent.change(document.getElementById('adminProcedureDecision')!, { target: { value: 'uus' } });
    fireEvent.change(document.getElementById('penaltyValidUntil')!, { target: { value: '2026-05-06' } });
    fireEvent.click(document.getElementById('penaltyExpiredOrProcessed')!);
    fireEvent.click(screen.getByText('forms.shared.administrativeProcedure.save'));
    await waitFor(() => expect(screen.getByText('forms.shared.administrativeProcedure.savedVersion:3')).toBeTruthy());
    expect(saveAdministrativeProcedure).toHaveBeenCalledWith(
      'ncr',
      7,
      expect.objectContaining({ adminProcedureDecision: 'uus', penaltyExpiredOrProcessed: false }),
    );
    expect(onSaved).toHaveBeenCalled();
    window.removeEventListener(FORM_VERSION_SAVED_EVENT, onSaved);
    fireEvent.click(document.getElementById('penaltyExpiredOrProcessed')!);
  });

  it('laadimise tühi vastus ja viga', async () => {
    vi.mocked(getAdministrativeProcedure).mockResolvedValueOnce(null as never);
    const { unmount } = render(<AdministrativeProcedureCard formType={'ncr' as never} formKey={7} />);
    await waitFor(() => expect(getAdministrativeProcedure).toHaveBeenCalled());
    unmount();
    vi.mocked(getAdministrativeProcedure).mockRejectedValueOnce(new Error('x'));
    render(<AdministrativeProcedureCard formType={'ncr' as never} formKey={7} />);
    await waitFor(() => expect(screen.getByText('forms.shared.administrativeProcedure.loadFailed')).toBeTruthy());
  });

  it('salvestusviga; tühi versioonitulemus; reloadAfterSave', async () => {
    vi.mocked(saveAdministrativeProcedure).mockRejectedValueOnce(new Error('x'));
    render(<AdministrativeProcedureCard formType={'ncr' as never} formKey={7} />);
    await waitFor(() => expect(getAdministrativeProcedure).toHaveBeenCalled());
    fireEvent.click(screen.getByText('forms.shared.administrativeProcedure.save'));
    await waitFor(() => expect(screen.getByText('forms.shared.administrativeProcedure.saveFailed')).toBeTruthy());
    cleanup();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    vi.mocked(saveAdministrativeProcedure).mockResolvedValueOnce([] as never);
    render(<AdministrativeProcedureCard formType={'ncr' as never} formKey={7} reloadAfterSave />);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByText('forms.shared.administrativeProcedure.save'));
    await waitFor(() => expect(screen.getByText('forms.shared.administrativeProcedure.saved')).toBeTruthy());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(reload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
