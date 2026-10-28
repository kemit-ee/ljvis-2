// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdrFormPage } from './AdrFormPage';
import { api, applyApiData, clickableButtons, h, resetHarness } from '../pageTestHarness';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: { number?: number }) => (o?.number ? `${key}#${o.number}` : key) }),
}));
vi.mock('react-router-dom', async () => (await import('../pageTestHarness')).routerMock());
vi.mock('../../../auth/AuthContext', async () => (await import('../pageTestHarness')).authMock());
vi.mock('../../../../hooks/useIsAdmin', async () => (await import('../pageTestHarness')).isAdminMock());
vi.mock('../../../../hooks/useMediaQuery', async () => (await import('../pageTestHarness')).mediaQueryMock());
vi.mock('../../../../hooks/useContainerWidth', async () => (await import('../pageTestHarness')).containerWidthMock());
vi.mock('../../api', async () => (await import('../pageTestHarness')).apiMock());
vi.mock('../compound-form/useCompoundForm', async () => (await import('../pageTestHarness')).compoundFormMock());
vi.mock('../compound-form/useCompoundFormDetail', async () => (await import('../pageTestHarness')).compoundDetailMock());
vi.mock('../../hooks/createSaveAllHandler', async () => (await import('../pageTestHarness')).saveAllMock());
vi.mock('../../hooks/useSubFormEditActive', async () => (await import('../pageTestHarness')).editActiveMock());
vi.mock('../../../classifiers/ClassifierProvider', async () => (await import('../pageTestHarness')).classifierScopeMock());
vi.mock('../drive-rest-form/useDriveRestForm', async () => (await import('../pageTestHarness')).schemaMocks.driveRest());
vi.mock('../technical-check-form/useTechnicalCheckForm', async () => (await import('../pageTestHarness')).schemaMocks.technical());
vi.mock('../adr-form/useAdrForm', async () => (await import('../pageTestHarness')).schemaMocks.adr());
vi.mock('../../../../shared/components/FormNotFoundView', async () => (await import('../pageTestHarness')).formNotFoundMock());
vi.mock('../../../../shared/components/FormLoadError', async () => (await import('../pageTestHarness')).formLoadErrorMock());
vi.mock('../../../../shared/components/DeleteConfirmModal', async () => (await import('../pageTestHarness')).modalStub());
vi.mock('@tedi-design-system/react/tedi', async (orig) => ({
  ...(await orig<object>()),
  ...(await import('../pageTestHarness')).tediOverrides(),
}));
vi.mock('../../components/EtoimikQueryCard/CompoundEtoimikQueryCard', async () => (await import('../pageTestHarness')).etoimikStub());
vi.mock('../../components/CompoundForm/CompoundFormViewCard', async () => ({
  CompoundFormViewCard: (await import('../pageTestHarness')).cardStub('CompoundFormViewCard'),
}));
vi.mock('../../components/CompoundForm/CompoundFormEditCard', async () => ({
  CompoundFormEditCard: (await import('../pageTestHarness')).cardStub('CompoundFormEditCard'),
}));
vi.mock('../../components/DriveRestForm/DriveRestFormViewCard', async () => ({
  DriveRestFormViewCard: (await import('../pageTestHarness')).cardStub('DriveRestFormViewCard'),
}));
vi.mock('../../components/DriveRestForm/DriveRestFormEditCard', async () => ({
  DriveRestFormEditCard: (await import('../pageTestHarness')).cardStub('DriveRestFormEditCard'),
}));
vi.mock('../../components/TechnicalCheckForm/TechnicalCheckFormViewCard', async () => ({
  TechnicalCheckFormViewCard: (await import('../pageTestHarness')).cardStub('TechnicalCheckFormViewCard'),
}));
vi.mock('../../components/TechnicalCheckForm/TechnicalCheckFormEditCard', async () => ({
  TechnicalCheckFormEditCard: (await import('../pageTestHarness')).cardStub('TechnicalCheckFormEditCard'),
}));
vi.mock('../../components/AdrForm/AdrFormViewCard', async () => ({
  AdrFormViewCard: (await import('../pageTestHarness')).cardStub('AdrFormViewCard'),
}));
vi.mock('../../components/AdrForm/AdrFormEditCard', async () => ({
  AdrFormEditCard: (await import('../pageTestHarness')).cardStub('AdrFormEditCard'),
}));
vi.mock('../../components/TransportInterruptionForm/TransportInterruptionFormViewCard', async () => ({
  TransportInterruptionFormViewCard: (await import('../pageTestHarness')).cardStub('TransportInterruptionFormViewCard'),
}));
vi.mock('../../components/TransportInterruptionForm/TransportInterruptionFormEditCard', async () => ({
  TransportInterruptionFormEditCard: (await import('../pageTestHarness')).cardStub('TransportInterruptionFormEditCard'),
}));

const form = (id: string, status: string, extra: Record<string, unknown> = {}) => ({ id, status, ...extra });
const allForms = (status: string) => ({
  vehicle: form('v1', status, { trailerRegNr: 'VEH' }),
  trailers: [form('t0', status, { trailerRegNr: 'TR0' }), form('t1', status, { trailerRegNr: 'TR1' })],
  driver: form('d1', status),
  teammate: form('m1', status),
  adr: form('a1', status, { compoundFormKey: 5 }),
  ti: form('i1', status, { compoundFormKey: 5 }),
});

const settle = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

const clickAll = async (...prefixes: string[]) => {
  for (const b of clickableButtons(document.body, prefixes)) {
    if (!b.isConnected) continue;
    fireEvent.click(b);
    await settle();
  }
};

const renderPage = async () => {
  render(<AdrFormPage />);
  await settle();
  await settle();
};

describe('AdrFormPage', () => {
  beforeEach(() => {
    resetHarness();
    h.params = { id: 'a1' };
    h.perms = new Set(['adr_form.read']);
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.scrollTo = vi.fn() as never;
    applyApiData(allForms('confirmed'));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('snapshot', () => {
    beforeEach(() => {
      h.params = { id: 'a1', snapshotId: 's1' };
    });

    it('shows the snapshot view card', async () => {
      api.getAdrFormSnapshot.mockResolvedValue([{ id: 'a1' }]);
      await renderPage();
      expect(screen.getByTestId('AdrFormViewCard')).toBeTruthy();
      expect(api.getAdrFormSnapshot).toHaveBeenCalledWith('s1', 'a1');
    });

    it('shows a loading text while the snapshot loads', () => {
      api.getAdrFormSnapshot.mockReturnValue(new Promise(() => {}));
      render(<AdrFormPage />);
      expect(screen.getByText('common.loading')).toBeTruthy();
    });

    it('shows forbidden without read rights', async () => {
      h.perms = new Set();
      api.getAdrFormSnapshot.mockResolvedValue({ id: 'a1' });
      await renderPage();
      expect(screen.getByText('common.forbidden')).toBeTruthy();
    });

    it('shows not-found when the snapshot is missing or fails', async () => {
      api.getAdrFormSnapshot.mockResolvedValue(null);
      await renderPage();
      expect(screen.getByText('not-found:forms.adr.title')).toBeTruthy();
      cleanup();
      api.getAdrFormSnapshot.mockRejectedValue(new Error('x'));
      await renderPage();
      expect(screen.getByText('not-found:forms.adr.title')).toBeTruthy();
    });
  });

  describe('loading the page', () => {
    it('shows loading, then the load error for an unknown form', async () => {
      applyApiData({});
      render(<AdrFormPage />);
      expect(screen.getByText('common.loading')).toBeTruthy();
      await settle();
      expect(screen.getByText('load-error')).toBeTruthy();
    });

    it('shows a load error for deleted forms and failures', async () => {
      api.getAdrForm.mockResolvedValue({ id: 'a1', compoundFormKey: 5, status: 'deleted' });
      await renderPage();
      expect(screen.getByText('load-error')).toBeTruthy();
      cleanup();
      api.getAdrForm.mockRejectedValue(new Error('x'));
      await renderPage();
      expect(screen.getByText('load-error')).toBeTruthy();
    });

    it('shows forbidden when the user has no rights', async () => {
      h.perms = new Set();
      await renderPage();
      expect(screen.getByText('common.forbidden')).toBeTruthy();
    });

    it('does nothing without an id', async () => {
      h.params = {};
      render(<AdrFormPage />);
      await settle();
      expect(api.getAdrForm).not.toHaveBeenCalled();
    });
  });

  describe('view mode', () => {
    beforeEach(() => {
      h.edit.allConfirmedOrPublished = true;
      h.compoundDetail.form = { id: 5, status: 'published', trailers: [{ regNr: 'AAA111' }] };
    });

    it('renders every loaded sub-form and tab as a read-only card', async () => {
      await renderPage();
      expect(screen.getByTestId('CompoundFormViewCard')).toBeTruthy();
      expect(screen.getAllByTestId('TechnicalCheckFormViewCard')).toHaveLength(3);
      expect(screen.getAllByTestId('DriveRestFormViewCard')).toHaveLength(2);
      expect(screen.getByTestId('AdrFormViewCard')).toBeTruthy();
      expect(screen.getByTestId('TransportInterruptionFormViewCard')).toBeTruthy();
      expect(screen.getByText('AAA111', { exact: false })).toBeTruthy();
      expect(screen.getByText('TR1', { exact: false })).toBeTruthy();
    });

    it('publishes each sub-form and refetches', async () => {
      await renderPage();
      await clickAll(
        'DriveRestFormViewCard.onPublish',
        'TechnicalCheckFormViewCard.onPublish',
        'AdrFormViewCard.onPublish',
        'TransportInterruptionFormViewCard.onPublish',
      );
      expect(api.publishDriveRestForm).toHaveBeenCalledTimes(2);
      expect(api.publishTechnicalCheckForm).toHaveBeenCalledTimes(3);
      expect(api.publishAdrForm).toHaveBeenCalledWith('a1');
      expect(api.publishTransportInterruptionForm).toHaveBeenCalledWith('i1');
      expect(screen.getByText('forms.publishedNote')).toBeTruthy();
      expect(h.edit.checkAndAutoConfirm).toHaveBeenCalled();
      fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);
    });

    it('starts editing everything from the edit button and cancels again', async () => {
      h.isAdmin = true;
      await renderPage();
      fireEvent.click(screen.getByText('common.edit'));
      await settle();
      expect(screen.getByText('common.save')).toBeTruthy();
      fireEvent.click(screen.getByText('common.save'));
      expect(h.handleSaveAll).toHaveBeenCalled();
      fireEvent.click(screen.getByText('common.cancel'));
      expect(h.formik.resetForm).toHaveBeenCalled();
      expect(h.edit.cancelAllEdits).toHaveBeenCalled();
    });

    it('opens the compound edit card from the view card and handles edit-mode callbacks', async () => {
      h.isAdmin = true;
      await renderPage();
      fireEvent.click(screen.getByText('CompoundFormViewCard.onEdit'));
      await settle();
      expect(screen.getByTestId('CompoundFormEditCard')).toBeTruthy();
      fireEvent.click(screen.getByText('CompoundFormEditCard.onCancel'));
      await settle();
      expect(screen.getByTestId('CompoundFormViewCard')).toBeTruthy();
    });

    it('hides the edit button for a deleted compound form', async () => {
      h.isAdmin = true;
      h.compoundDetail.form = { id: 5, status: 'deleted', trailers: [] };
      await renderPage();
      expect(screen.queryByText('common.edit')).toBeNull();
    });

    it('lets the compound view card edit only saved or published forms', async () => {
      h.isAdmin = true;
      h.compoundDetail.form = { id: 5, status: 'confirmed', trailers: '[]' };
      await renderPage();
      expect(screen.getByTestId('CompoundFormViewCard')).toBeTruthy();
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      h.isAdmin = true;
      h.perms = new Set(['compound_form.write', 'control_form.view_unpublished']);
      h.compoundDetail.form = { id: 5, status: 'saved', trailers: '[{"regNr":"AAA111"}]' };
      h.formik.values = { trailers: [{ regNr: 'ZZZ999' }] };
      applyApiData(allForms('saved'));
    });

    it('renders all edit cards and fires their callbacks', async () => {
      await renderPage();
      expect(screen.getByTestId('CompoundFormEditCard')).toBeTruthy();
      expect(screen.getAllByTestId('TechnicalCheckFormEditCard')).toHaveLength(3);
      await clickAll(
        'CompoundFormEditCard.',
        'DriveRestFormEditCard.',
        'TechnicalCheckFormEditCard.',
        'AdrFormEditCard.',
        'TransportInterruptionFormEditCard.',
      );
      expect(screen.getByText('forms.savedNote')).toBeTruthy();
      expect(h.edit.addTab).toHaveBeenCalled();
      expect(h.edit.handleRemoveTrailerFromCompound).toHaveBeenCalled();
      expect(h.formik.resetForm).toHaveBeenCalled();
    });

    it('closes alerts and shows the confirmed alert', async () => {
      await renderPage();
      await act(async () => {
        h.compoundArgs[2]();
      });
      expect(screen.getByText('forms.confirmedNote')).toBeTruthy();
      expect(h.compoundDetail.refetch).toHaveBeenCalled();
      for (const btn of screen.getAllByRole('button', { name: /close/i })) fireEvent.click(btn);
      expect(screen.queryByText('forms.confirmedNote')).toBeNull();
    });

    it('reacts to compound saved / published callbacks', async () => {
      await renderPage();
      await act(async () => {
        h.compoundArgs[1]();
      });
      expect(screen.getByText('forms.savedNote')).toBeTruthy();
      await act(async () => {
        h.compoundArgs[5]();
      });
      expect(screen.getByText('forms.publishedNote')).toBeTruthy();
      await act(async () => {
        h.compoundArgs[4]();
      });
      expect(h.compoundDetail.refetch).toHaveBeenCalled();
    });

    it('offers the missing sub-forms in the add-form dropdown and opens them as empty edit cards', async () => {
      applyApiData({ adr: form('a1', 'saved', { compoundFormKey: 5 }) });
      await renderPage();
      fireEvent.click(screen.getByText('forms.driver_drive_rest_form'));
      await settle();
      expect(h.edit.addTab).toHaveBeenCalledWith('tab-driver', expect.anything());
      fireEvent.click(screen.getByText('forms.teammate_drive_rest_form'));
      await settle();
      expect(screen.getAllByTestId('DriveRestFormEditCard')).toHaveLength(2);
      // tühja alamvormi salvestus peaks koondvormi „salvestatud" seisu tagasi seadma
      h.compoundDetail.form = { id: 5, status: 'confirmed', trailers: [] };
      cleanup();
      applyApiData({ adr: form('a1', 'saved', { compoundFormKey: 5 }) });
      await renderPage();
      expect(screen.queryByTestId('CompoundFormEditCard')).toBeNull();
    });

    it('resets the compound form to saved when the first sub-form is saved', async () => {
      h.compoundDetail.form = { id: 5, status: 'confirmed', trailers: [] };
      applyApiData({ adr: form('a1', 'saved', { compoundFormKey: 5 }) });
      await renderPage();
      fireEvent.click(screen.getByText('forms.driver_drive_rest_form'));
      fireEvent.click(screen.getByText('forms.teammate_drive_rest_form'));
      await settle();
      await clickAll('DriveRestFormEditCard.onSaved');
      expect(h.compoundHook.triggerSaveAsSaved).toHaveBeenCalled();
    });

    it('wires the tab strip: switching tabs, removing a tab and the remove callbacks', async () => {
      await renderPage();
      fireEvent.click(document.querySelector('[data-tab="tab-transport-interruption"]')!);
      await settle();
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('forms.transport_interruption.title');
      const closers = document.querySelectorAll('[role="tab"] button');
      expect(closers.length).toBeGreaterThan(0);
      fireEvent.click(closers[0]);
      expect(h.edit.handleRemove).toHaveBeenCalled();

      h.removeArgs.onTrailerRemoved(0);
      expect(h.formik.setFieldValue).toHaveBeenCalledWith('trailers', []);
      h.removeArgs.navigateAfterRemove();
      expect(h.navigate).toHaveBeenCalledWith('/control-forms/compound/5');
    });

    it('renders the delete modal buttons and delete handler', async () => {
      h.edit.removeConfirmTab = 'tab-adr';
      h.edit.removeTrailerFromCompound = true;
      await renderPage();
      await clickAll('DeleteConfirmModal.');
      expect(h.edit.handleRemoveCancel).toHaveBeenCalled();
      expect(h.edit.handleRemoveConfirmed).toHaveBeenCalled();
      expect(h.edit.handleDelete).toHaveBeenCalled();
    });

    it('hides delete when nothing is deletable', async () => {
      applyApiData({ adr: form('a1', 'deleted', { compoundFormKey: 5 }) });
      api.getAdrForm.mockResolvedValue(form('a1', 'saved', { compoundFormKey: 5 }));
      h.compoundDetail.form = { id: 5, status: 'deleted', trailers: [] };
      await renderPage();
      expect(screen.getByText('common.save')).toBeTruthy();
    });
  });

  describe('save-all configuration', () => {
    beforeEach(() => {
      h.isAdmin = true;
      h.compoundDetail.form = { id: 5, status: 'saved', trailers: [] };
      applyApiData(allForms('saved'));
    });

    const subFormConfig = (tabId: string) => h.saveCfg.subForms.find((s: { tabId: string }) => s.tabId === tabId);

    it('saves each sub-form through its fallback save', async () => {
      await renderPage();
      const draft = { id: 'x', legalBases: ['a'] };
      for (const tabId of [
        'tab-vehicle-technical-check',
        'tab-trailer-technical-check-0',
        'tab-driver',
        'tab-teammate',
        'tab-adr',
        'tab-transport-interruption',
      ]) {
        await act(async () => {
          subFormConfig(tabId).fallbackSave(draft);
        });
        await settle();
      }
      await act(async () => {
        subFormConfig('tab-trailer-technical-check-1').fallbackSave({});
        subFormConfig('tab-vehicle-technical-check').fallbackSave({});
      });
      await settle();
      expect(api.saveTechnicalCheckForm).toHaveBeenCalledWith('vehicle', expect.objectContaining({ partsSummary: '[]' }));
      expect(api.saveTechnicalCheckForm).toHaveBeenCalledWith('trailer', expect.anything());
      expect(api.saveDriveRestForm).toHaveBeenCalledWith('driver', expect.objectContaining({ status: 'saved' }));
      expect(api.saveDriveRestForm).toHaveBeenCalledWith('teammate', expect.anything());
      expect(api.saveAdrForm).toHaveBeenCalled();
      expect(api.saveTransportInterruptionForm).toHaveBeenCalledWith(expect.objectContaining({ legalBases: '["a"]' }));
      expect(h.edit.handleSubformEditActive).toHaveBeenCalled();
    });

    it('keeps confirmed drive-rest forms confirmed and swallows save errors', async () => {
      applyApiData({ ...allForms('confirmed') });
      await renderPage();
      await act(async () => {
        subFormConfig('tab-driver').fallbackSave({});
      });
      await settle();
      expect(api.saveDriveRestForm).toHaveBeenCalledWith('driver', expect.objectContaining({ status: 'confirmed' }));
      for (const n of ['saveTechnicalCheckForm', 'saveDriveRestForm', 'saveAdrForm', 'saveTransportInterruptionForm'] as const) {
        api[n].mockRejectedValue(new Error('x'));
      }
      for (const tabId of ['tab-vehicle-technical-check', 'tab-trailer-technical-check-0', 'tab-driver', 'tab-teammate', 'tab-adr', 'tab-transport-interruption']) {
        await act(async () => {
          subFormConfig(tabId).fallbackSave({});
        });
      }
      await settle();
      expect(console.error).toHaveBeenCalled();
    });

    it('validates the compound form', async () => {
      await renderPage();
      expect(await h.saveCfg.onCompoundValidate()).toBe(true);
      h.formik.validateForm.mockResolvedValueOnce({ company: 'required' });
      h.formik.values = { name: 'a', list: [{ x: 1 }, 2], nested: { y: null } };
      expect(await h.saveCfg.onCompoundValidate()).toBe(false);
      expect(h.formik.setTouched).toHaveBeenCalledWith({
        name: true,
        list: [{ x: true }, true],
        nested: { y: true },
      });
      h.saveCfg.onCompoundSave();
      expect(h.formik.handleSubmit).toHaveBeenCalled();
    });
  });

  describe('refetches after sub-form changes', () => {
    beforeEach(() => {
      h.isAdmin = true;
      h.perms = new Set(['compound_form.write', 'control_form.view_unpublished']);
      h.compoundDetail.form = { id: 5, status: 'saved', trailers: [] };
      applyApiData(allForms('saved'));
    });

    it('covers trailer, vehicle, driver and teammate refetches', async () => {
      await renderPage();
      await clickAll('TechnicalCheckFormEditCard.onSaved', 'DriveRestFormEditCard.onSaved');
      expect(api.listTechnicalCheckFormsByCompoundFormKey).toHaveBeenCalledWith('trailer', 5);
      expect(api.listTechnicalCheckFormsByCompoundFormKey).toHaveBeenCalledWith('vehicle', 5);
      expect(h.edit.checkAndAutoPublish).toHaveBeenCalled();
    });

    it('tolerates failing list calls', async () => {
      await renderPage();
      api.listTechnicalCheckFormsByCompoundFormKey.mockRejectedValue(new Error('x'));
      api.getDriveRestFormByCompoundFormKey.mockRejectedValue(new Error('x'));
      api.listAdrFormsByCompoundFormKey.mockRejectedValue(new Error('x'));
      api.listTransportInterruptionFormsByCompoundFormKey.mockRejectedValue(new Error('x'));
      await clickAll('TechnicalCheckFormEditCard.onSaved', 'DriveRestFormEditCard.onSaved', 'AdrFormEditCard.onSaved', 'TransportInterruptionFormEditCard.onSaved');
      expect(console.error).toHaveBeenCalled();
    });

    it('handles non-array and failing detail responses while loading', async () => {
      api.listTechnicalCheckFormsByCompoundFormKey.mockResolvedValue(null);
      api.listAdrFormsByCompoundFormKey.mockResolvedValue(null);
      api.getTechnicalCheckForm.mockRejectedValue(new Error('x'));
      await renderPage();
      expect(screen.getByTestId('AdrFormEditCard')).toBeTruthy();
    });

    it('survives rejected loads of every sub-form', async () => {
      api.listTechnicalCheckFormsByCompoundFormKey.mockRejectedValue(new Error('x'));
      api.getDriveRestFormByCompoundFormKey.mockRejectedValue(new Error('x'));
      api.listAdrFormsByCompoundFormKey.mockRejectedValue(new Error('x'));
      await renderPage();
      await waitFor(() => expect(console.error).toHaveBeenCalled());
    });
  });
});
