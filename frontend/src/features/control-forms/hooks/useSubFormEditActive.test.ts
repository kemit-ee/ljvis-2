// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addTab,
  canConfirmActiveSubForm,
  canPublishActiveSubForm,
  cancelAllEdits,
  isAdminUser,
  isAnySubFormSaved,
  makeCheckAndAutoConfirm,
  makeCheckAndAutoPublish,
  subFormsAllConfirmedOrPublished,
  useDeleteAllSubForms,
  useRemoveSubFormTab,
  useSubFormEditActive,
  useSubFormPermissions,
} from './useSubFormEditActive';
import * as api from '../api';

const navigate = vi.fn();
const permState = { perms: new Set<string>() };
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => permState.perms.has(p) }),
}));
vi.mock('../api', () => ({
  deleteDriveRestForm: vi.fn().mockResolvedValue(undefined),
  deleteTechnicalCheckForm: vi.fn().mockResolvedValue(undefined),
  deleteAdrForm: vi.fn().mockResolvedValue(undefined),
  deleteTransportInterruptionForm: vi.fn().mockResolvedValue(undefined),
  deleteCompoundForm: vi.fn().mockResolvedValue(undefined),
}));

const has = (...p: string[]) => (perm: string) => p.includes(perm);
const sf = (form: Record<string, unknown> | null) => ({ form, setEditActive: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  permState.perms = new Set();
});

describe('isAdminUser / isAnySubFormSaved', () => {
  it('admin vajab kolme õigust', () => {
    expect(isAdminUser(has('control_form.view_unpublished', 'control_form.edit_locked', 'control_form.delete'))).toBe(true);
    expect(isAdminUser(has('control_form.view_unpublished'))).toBe(false);
  });
  it('tuvastab salvestatud alamvormi', () => {
    const s = { status: 'saved' };
    const c = { status: 'confirmed' };
    expect(isAnySubFormSaved(null, null, null, c)).toBe(false);
    expect(isAnySubFormSaved(s, null, null, c)).toBe(true);
    expect(isAnySubFormSaved(null, s, null, c)).toBe(true);
    expect(isAnySubFormSaved(null, null, s, c)).toBe(true);
    expect(isAnySubFormSaved(null, null, null, [c, s])).toBe(true);
    expect(isAnySubFormSaved(null, null, null, c, s)).toBe(true);
    expect(isAnySubFormSaved(null, null, null, c, c, s)).toBe(true);
  });
});

describe('useSubFormEditActive', () => {
  const args = (over: Record<string, unknown> = {}) => ({
    openTabs: ['tab-trailer-technical-check-0'],
    driver: sf({ status: 'saved' }),
    teammate: sf({ status: 'saved' }),
    vehicle: sf({ status: 'saved' }),
    trailers: [sf({ status: 'saved' }), sf({ status: 'saved' })],
    adr: sf({ status: 'saved' }),
    transportInterruption: sf({ status: 'saved' }),
    hasPermission: has('sp_driver_form.write', 'sp_teammate_form.read', 'trailer_technical_form.write'),
    ...over,
  });

  it('kui midagi on salvestatud, arvestab õigusi', () => {
    const a = args();
    renderHook(() => useSubFormEditActive(a as never));
    expect(a.driver.setEditActive).toHaveBeenLastCalledWith(true);
    expect(a.teammate.setEditActive).toHaveBeenLastCalledWith(false);
    expect(a.vehicle.setEditActive).toHaveBeenLastCalledWith(true);
    expect(a.trailers[0].setEditActive).toHaveBeenLastCalledWith(true);
    expect(a.trailers[1].setEditActive).not.toHaveBeenCalled();
    expect(a.adr.setEditActive).toHaveBeenLastCalledWith(true);
    expect(a.transportInterruption.setEditActive).toHaveBeenLastCalledWith(true);
  });

  it('kui midagi pole salvestatud, järgib olekut', () => {
    const a = args({
      driver: sf({ status: 'confirmed' }),
      teammate: sf({ status: 'confirmed' }),
      vehicle: sf({ status: 'confirmed' }),
      trailers: [sf({ status: 'confirmed' })],
      adr: sf({ status: 'confirmed' }),
      transportInterruption: sf({ status: 'confirmed' }),
    });
    renderHook(() => useSubFormEditActive(a as never));
    expect(a.driver.setEditActive).toHaveBeenLastCalledWith(false);
    expect(a.trailers[0].setEditActive).toHaveBeenLastCalledWith(false);
    expect(a.adr.setEditActive).toHaveBeenLastCalledWith(false);
    expect(a.transportInterruption.setEditActive).toHaveBeenLastCalledWith(false);
  });

  it('vormideta alamvorme ei puutu ja töötab valikuliste väljadeta', () => {
    const a = args({
      driver: sf(null),
      teammate: sf(null),
      vehicle: sf(null),
      trailers: [],
      adr: undefined,
      transportInterruption: undefined,
    });
    const { result } = renderHook(() => useSubFormEditActive(a as never));
    result.current();
    expect(a.driver.setEditActive).not.toHaveBeenCalled();
  });

  it('salvestatud olekus vormideta alamvormid jäävad puutumata', () => {
    const a = args({ driver: sf({ status: 'saved' }), teammate: sf(null), vehicle: sf(null), trailers: [sf(null)], adr: undefined, transportInterruption: undefined });
    renderHook(() => useSubFormEditActive(a as never));
    expect(a.teammate.setEditActive).not.toHaveBeenCalled();
    expect(a.trailers[0].setEditActive).not.toHaveBeenCalled();
  });
});

describe('subFormsAllConfirmedOrPublished', () => {
  const f = (status: string) => ({ form: { status } });
  const none = { form: null };
  it('uus salvestamata alamvorm', () => {
    const r = subFormsAllConfirmedOrPublished({
      openTabs: ['tab-driver', 'tab-trailer-technical-check-1'],
      driver: none, teammate: none, vehicle: none, trailers: [f('confirmed')],
    });
    expect(r.hasNewUnsavedSubForm).toBe(true);
    expect(r.subFormsAllConfirmedOrPublished).toBe(false);
    expect(r.subFormsAllPublished).toBe(false);
  });
  it('kõik kinnitatud', () => {
    const r = subFormsAllConfirmedOrPublished({
      openTabs: ['tab-driver', 'tab-teammate', 'tab-vehicle-technical-check', 'tab-trailer-technical-check-0', 'tab-adr', 'tab-transport-interruption'],
      driver: f('confirmed'), teammate: f('published'), vehicle: f('confirmed'), trailers: [f('confirmed')],
      adr: f('confirmed'), transportInterruption: f('published'),
    });
    expect(r.hasNewUnsavedSubForm).toBe(false);
    expect(r.subFormsAllConfirmedOrPublished).toBe(true);
    expect(r.subFormsAllPublished).toBe(false);
  });
  it('kõik avaldatud', () => {
    const r = subFormsAllConfirmedOrPublished({
      openTabs: ['tab-driver'], driver: f('published'), teammate: none, vehicle: none, trailers: [],
    });
    expect(r.subFormsAllPublished).toBe(true);
  });
  it('puuduvad adr/ti ning avatud sakid', () => {
    const r = subFormsAllConfirmedOrPublished({
      openTabs: ['tab-adr', 'tab-transport-interruption'], driver: none, teammate: none, vehicle: none, trailers: [],
    });
    expect(r.hasNewUnsavedSubForm).toBe(true);
    const e = subFormsAllConfirmedOrPublished({ openTabs: [], driver: none, teammate: none, vehicle: none, trailers: [] });
    expect(e.subFormsAllPublished).toBe(false);
  });
});

describe('addTab', () => {
  const h = () => ({ setLoaded: vi.fn(), setEditActive: vi.fn() });
  const mk = () => ({
    driver: h(), teammate: h(), vehicle: h(), trailers: [h()], adr: h(), transportInterruption: h(),
    setOpenTabs: vi.fn(), setActiveTab: vi.fn(),
  });
  it.each([
    ['tab-driver', 'driver'], ['tab-teammate', 'teammate'], ['tab-vehicle-technical-check', 'vehicle'],
    ['tab-adr', 'adr'], ['tab-transport-interruption', 'transportInterruption'],
  ] as const)('%s', (tab, key) => {
    const o = mk();
    addTab(tab, o as never);
    expect(o[key].setLoaded).toHaveBeenCalledWith(true);
    expect(o[key].setEditActive).toHaveBeenCalledWith(true);
    expect(o.setActiveTab).toHaveBeenCalledWith(tab);
    const upd = o.setOpenTabs.mock.calls[0][0] as (p: string[]) => string[];
    expect(upd([])).toEqual([tab]);
    expect(upd([tab])).toEqual([tab]);
  });
  it('haagis ja activate=false', () => {
    const o = mk();
    addTab('tab-trailer-technical-check-0', { ...o, activate: false } as never);
    expect(o.trailers[0].setLoaded).toHaveBeenCalledWith(true);
    expect(o.setActiveTab).not.toHaveBeenCalled();
    addTab('tab-trailer-technical-check-5', o as never);
  });
  it('valikulised alamvormid puuduvad', () => {
    const o = { ...mk(), adr: undefined, transportInterruption: undefined };
    addTab('tab-adr', o as never);
    addTab('tab-transport-interruption', o as never);
    expect(o.setActiveTab).toHaveBeenCalledTimes(2);
  });
});

describe('canConfirm / canPublish', () => {
  const base = (status: string, over: Record<string, unknown> = {}) => ({ form: { id: 1, status, ...over } });
  const none = { form: null };
  const mk = (activeTab: string, st: string, over: Record<string, unknown> = {}) => ({
    activeTab, driver: none, teammate: none, vehicle: none, trailers: [] as never[],
    adr: none, transportInterruption: none,
    [activeTab === 'tab-driver' ? 'driver' : 'vehicle']: base(st, over),
  });
  it('confirm', () => {
    expect(canConfirmActiveSubForm({ ...mk('tab-driver', 'saved'), hasPermission: has('sp_driver_form.write') } as never)).toBe(true);
    expect(canConfirmActiveSubForm({ ...mk('tab-driver', 'saved'), hasPermission: has() } as never)).toBe(false);
    expect(canConfirmActiveSubForm({ ...mk('tab-driver', 'saved'), hasPermission: has('control_form.view_unpublished', 'control_form.edit_locked', 'control_form.delete') } as never)).toBe(true);
    expect(canConfirmActiveSubForm({ ...mk('tab-driver', 'confirmed'), hasPermission: has('sp_driver_form.write') } as never)).toBe(false);
    expect(canConfirmActiveSubForm({ ...mk('tab-unknown', 'saved'), hasPermission: has() } as never)).toBe(false);
  });
  it('trailer tab', () => {
    const o = { activeTab: 'tab-trailer-technical-check-0', driver: none, teammate: none, vehicle: none, trailers: [base('saved')] };
    expect(canConfirmActiveSubForm({ ...o, hasPermission: has('trailer_technical_form.write') } as never)).toBe(true);
  });
  it('publish', () => {
    expect(canPublishActiveSubForm({ ...mk('tab-driver', 'confirmed'), hasPermission: has('sp_driver_form.write') } as never)).toBe(true);
    expect(canPublishActiveSubForm({ ...mk('tab-driver', 'saved'), hasPermission: has('sp_driver_form.write') } as never)).toBe(false);
    expect(canPublishActiveSubForm({ ...mk('tab-driver', 'confirmed'), hasPermission: has() } as never)).toBe(false);
    expect(canPublishActiveSubForm({ ...mk('tab-x', 'confirmed'), hasPermission: has() } as never)).toBe(false);
  });
  it('menetlusega vorm vajab karistusregistri õigust', () => {
    const f = mk('tab-driver', 'confirmed', { proceedingType: 'misdemeanor' });
    expect(canPublishActiveSubForm({ ...f, hasPermission: has('sp_driver_form.write') } as never)).toBe(false);
    expect(canPublishActiveSubForm({ ...f, hasPermission: has('sp_driver_form.write', 'control_form.punishment_register') } as never)).toBe(true);
  });
  it('useSubFormPermissions', () => {
    permState.perms = new Set(['sp_driver_form.write']);
    const o = mk('tab-driver', 'saved');
    const { result } = renderHook(() => useSubFormPermissions(o as never));
    expect(result.current.canConfirm()).toBe(true);
    expect(result.current.canPublish()).toBe(false);
  });
});

describe('useDeleteAllSubForms', () => {
  const del = (id: number, status = 'saved') => ({ form: { id, status, subFormNumber: `N${id}` } });
  it('kustutab kõik ja navigeerib', async () => {
    const { result } = renderHook(() =>
      useDeleteAllSubForms({
        driver: del(1), teammate: del(2), vehicle: del(3), trailers: [del(4), { form: null }],
        adr: del(5), transportInterruption: del(6),
        compoundForm: { id: 9, formNumber: 'K9', status: 'saved' } as never,
      }),
    );
    await act(() => result.current());
    expect(api.deleteDriveRestForm).toHaveBeenCalledTimes(2);
    expect(api.deleteTechnicalCheckForm).toHaveBeenCalledTimes(2);
    expect(api.deleteAdrForm).toHaveBeenCalledWith('5', 'saved');
    expect(api.deleteTransportInterruptionForm).toHaveBeenCalledWith('6', 'saved');
    expect(api.deleteCompoundForm).toHaveBeenCalledWith('9', 'saved');
    expect(navigate).toHaveBeenCalledWith('/');
  });
  it('tühjade vormidega ei kutsu API-t', async () => {
    const e = { form: null };
    const { result } = renderHook(() =>
      useDeleteAllSubForms({ driver: e, teammate: e, vehicle: e, trailers: [], compoundForm: null }),
    );
    await act(() => result.current());
    expect(api.deleteCompoundForm).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });
  it('puuduva staatusega kasutab tühja stringi', async () => {
    const nos = (id: number) => ({ form: { id, subFormNumber: 'N' } });
    const { result } = renderHook(() =>
      useDeleteAllSubForms({
        driver: nos(1), teammate: nos(2), vehicle: nos(3), trailers: [nos(4)], adr: nos(5),
        transportInterruption: { form: { id: 6 } },
        compoundForm: { id: 9, formNumber: 'K9' } as never,
      }),
    );
    await act(() => result.current());
    expect(api.deleteDriveRestForm).toHaveBeenCalledWith('driver', '1', 'N', '');
    expect(api.deleteCompoundForm).toHaveBeenCalledWith('9', '');
  });
});

describe('useRemoveSubFormTab', () => {
  const sub = (form: Record<string, unknown> | null) => ({
    form, setForm: vi.fn(), setEditActive: vi.fn(), resetDraft: vi.fn(),
  });
  const setup = (over: Record<string, unknown> = {}) => {
    const o = {
      driver: sub({ id: 1, status: 'saved', subFormNumber: 'D1' }),
      teammate: sub({ id: 2, status: 'saved', subFormNumber: 'T1' }),
      vehicle: sub({ id: 3, status: 'saved', subFormNumber: 'V1' }),
      trailers: [sub({ id: 4, status: 'saved', subFormNumber: 'R1' })],
      adr: sub({ id: 5, status: 'saved', subFormNumber: 'A1' }),
      transportInterruption: sub({ id: 6, status: 'saved' }),
      setOpenTabs: vi.fn(), setActiveTab: vi.fn(), checkAndAutoConfirm: vi.fn(), navigateAfterRemove: vi.fn(),
      onEditActiveChange: vi.fn(), onTeammateRemoved: vi.fn(), onTrailerRemoved: vi.fn(),
      onTrailerRemovedSave: vi.fn(), onTrailerDeletionDeferred: vi.fn(),
      ...over,
    };
    const hook = renderHook(() => useRemoveSubFormTab(o as never));
    return { o, hook };
  };

  it('uus (staatuseta) alamvorm eemaldatakse kohe', () => {
    const { o, hook } = setup({ teammate: sub({}) });
    act(() => hook.result.current.handleRemove('tab-teammate'));
    expect(o.teammate.setForm).toHaveBeenCalledWith(null);
    expect(o.onTeammateRemoved).toHaveBeenCalled();
    const upd = o.setOpenTabs.mock.calls[0][0] as (p: string[]) => string[];
    expect(upd(['tab-teammate', 'x'])).toEqual(['x']);
    expect(o.setActiveTab).toHaveBeenCalledWith('tab-compound');
  });

  it('tabi valik harude kaupa', () => {
    const none = sub(null);
    const { o, hook } = setup({ driver: none, vehicle: none, adr: none, transportInterruption: undefined, trailers: [none] });
    act(() => hook.result.current.handleRemove('tab-vehicle-technical-check'));
    act(() => hook.result.current.handleRemove('tab-adr'));
    act(() => hook.result.current.handleRemove('tab-transport-interruption'));
    act(() => hook.result.current.handleRemove('tab-trailer-technical-check-0'));
    act(() => hook.result.current.handleRemove('tab-trailer-technical-check-7'));
    act(() => hook.result.current.handleRemove('tab-driver'));
    act(() => hook.result.current.handleRemove('tab-weird' as never));
    expect(none.setForm).toHaveBeenCalledTimes(7);
    expect(o.onTeammateRemoved).not.toHaveBeenCalled();
  });

  it('olemasolev alamvorm nõuab kinnitust, tühistamine puhastab', () => {
    const { hook } = setup();
    act(() => hook.result.current.handleRemove('tab-driver'));
    expect(hook.result.current.removeConfirmTab).toBe('tab-driver');
    act(() => hook.result.current.handleRemoveCancel());
    expect(hook.result.current.removeConfirmTab).toBeNull();
  });

  it('handleRemoveConfirmed ilma valikuta ei tee midagi', async () => {
    const { o, hook } = setup();
    await act(() => hook.result.current.handleRemoveConfirmed());
    expect(o.checkAndAutoConfirm).not.toHaveBeenCalled();
  });

  it('kinnitatud kustutus: driver ja teammate', async () => {
    const { o, hook } = setup();
    act(() => hook.result.current.handleRemove('tab-driver'));
    await act(() => hook.result.current.handleRemoveConfirmed());
    expect(api.deleteDriveRestForm).toHaveBeenCalledWith('driver', '1', 'D1', 'saved');
    expect(o.driver.setForm).toHaveBeenCalledWith(null);
    expect(o.checkAndAutoConfirm).toHaveBeenCalled();
    expect(o.onEditActiveChange).toHaveBeenCalled();
    expect(o.navigateAfterRemove).toHaveBeenCalledWith('tab-driver');
    act(() => hook.result.current.handleRemove('tab-teammate'));
    await act(() => hook.result.current.handleRemoveConfirmed());
    expect(o.onTeammateRemoved).toHaveBeenCalled();
  });

  it('kinnitatud kustutus: adr, ti, vehicle', async () => {
    const { o, hook } = setup();
    for (const t of ['tab-adr', 'tab-transport-interruption', 'tab-vehicle-technical-check'] as const) {
      act(() => hook.result.current.handleRemove(t));
      await act(() => hook.result.current.handleRemoveConfirmed());
    }
    expect(api.deleteAdrForm).toHaveBeenCalled();
    expect(api.deleteTransportInterruptionForm).toHaveBeenCalled();
    expect(api.deleteTechnicalCheckForm).toHaveBeenCalledWith('vehicle', '3', 'V1', 'saved');
    expect(o.adr.setForm).toHaveBeenCalledWith(null);
  });

  it('kustutamise viga katkestab', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const [tab, fn] of [
      ['tab-driver', api.deleteDriveRestForm],
      ['tab-adr', api.deleteAdrForm],
      ['tab-transport-interruption', api.deleteTransportInterruptionForm],
      ['tab-vehicle-technical-check', api.deleteTechnicalCheckForm],
      ['tab-trailer-technical-check-0', api.deleteTechnicalCheckForm],
    ] as const) {
      vi.mocked(fn).mockRejectedValueOnce(new Error('x'));
      const { o, hook } = setup();
      act(() => hook.result.current.handleRemove(tab));
      await act(() => hook.result.current.handleRemoveConfirmed());
      expect(o.checkAndAutoConfirm).not.toHaveBeenCalled();
    }
    err.mockRestore();
  });

  it('haagise kustutus otse', async () => {
    const { o, hook } = setup();
    act(() => hook.result.current.handleRemove('tab-trailer-technical-check-0'));
    await act(() => hook.result.current.handleRemoveConfirmed());
    expect(api.deleteTechnicalCheckForm).toHaveBeenCalledWith('trailer', '4', 'R1', 'saved');
    expect(o.trailers[0].setForm).toHaveBeenCalledWith(null);
    expect(o.navigateAfterRemove).toHaveBeenCalled();
  });

  it('haagise eemaldamine komposiitvormist lükkab kustutuse edasi', async () => {
    vi.useFakeTimers();
    const { o, hook } = setup();
    act(() => hook.result.current.handleRemoveTrailerFromCompound('tab-trailer-technical-check-0'));
    expect(hook.result.current.removeTrailerFromCompound).toBe(true);
    await act(() => hook.result.current.handleRemoveConfirmed());
    expect(o.onTrailerDeletionDeferred).toHaveBeenCalledWith(0, '4', 'R1', 'saved');
    expect(api.deleteTechnicalCheckForm).not.toHaveBeenCalled();
    expect(o.onTrailerRemoved).toHaveBeenCalledWith(0);
    expect(o.onEditActiveChange).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(o.onTrailerRemovedSave).toHaveBeenCalledWith(0);
    vi.useRealTimers();
  });

  it('komposiitvormist eemaldamine ilma edasilükkamiseta kustutab kohe', async () => {
    const { o, hook } = setup({ onTrailerDeletionDeferred: undefined, onTrailerRemovedSave: undefined, onTrailerRemoved: undefined });
    act(() => hook.result.current.handleRemoveTrailerFromCompound('tab-trailer-technical-check-0'));
    await act(() => hook.result.current.handleRemoveConfirmed());
    expect(api.deleteTechnicalCheckForm).toHaveBeenCalled();
    expect(o.onEditActiveChange).toHaveBeenCalled();
  });

  it('salvestamata haagis komposiitvormist eemaldamisel', () => {
    vi.useFakeTimers();
    const { o, hook } = setup({ trailers: [sub(null)] });
    act(() => hook.result.current.handleRemoveTrailerFromCompound('tab-trailer-technical-check-0'));
    expect(o.onTrailerRemoved).toHaveBeenCalledWith(0);
    vi.runAllTimers();
    expect(o.onTrailerRemovedSave).toHaveBeenCalledWith(0);
    act(() => hook.result.current.handleRemoveTrailerFromCompound('tab-driver'));
    vi.useRealTimers();
  });

  it('allesjäänud vormide avaldatuse lipp', async () => {
    const { o, hook } = setup({
      driver: sub({ id: 1, status: 'saved', subFormNumber: 'D1' }),
      teammate: sub({ status: 'published' }),
      vehicle: sub(null), trailers: [], adr: sub(null), transportInterruption: undefined,
    });
    act(() => hook.result.current.handleRemove('tab-driver'));
    await act(() => hook.result.current.handleRemoveConfirmed());
    expect(o.onEditActiveChange).toHaveBeenCalledWith(false, true);
  });

  it('driver ilma id/numbrita: ei kutsu API-t', async () => {
    const { o, hook } = setup({ driver: sub({ status: 'saved' }), adr: sub({ status: 'saved' }), transportInterruption: sub({ status: 'saved' }), vehicle: sub({ status: 'saved' }), trailers: [sub({ status: 'saved' })] });
    for (const t of ['tab-driver', 'tab-adr', 'tab-transport-interruption', 'tab-vehicle-technical-check', 'tab-trailer-technical-check-0'] as const) {
      act(() => hook.result.current.handleRemove(t));
      await act(() => hook.result.current.handleRemoveConfirmed());
    }
    expect(api.deleteDriveRestForm).not.toHaveBeenCalled();
    expect(o.navigateAfterRemove).toHaveBeenCalledTimes(5);
  });
});

describe('cancelAllEdits ja auto-confirm/publish', () => {
  it('cancelAllEdits', () => {
    const mk = () => ({ setEditActive: vi.fn() });
    const o = { setCompoundEditActive: vi.fn(), driver: mk(), teammate: mk(), vehicle: mk(), trailers: [mk()], adr: mk(), transportInterruption: mk() };
    cancelAllEdits(o);
    expect(o.setCompoundEditActive).toHaveBeenCalledWith(false);
    expect(o.trailers[0].setEditActive).toHaveBeenCalledWith(false);
    cancelAllEdits({ ...o, adr: undefined, transportInterruption: undefined });
  });

  const s = (status: string) => ({ status }) as never;
  it('makeCheckAndAutoConfirm', () => {
    const trigger = vi.fn();
    const fn = makeCheckAndAutoConfirm({ compoundForm: { status: 'saved' }, triggerConfirm: trigger });
    fn(null, null, null, null, null, null);
    expect(trigger).not.toHaveBeenCalled();
    fn(s('confirmed'), null, null, [s('published')], null, null);
    expect(trigger).toHaveBeenCalledTimes(1);
    fn(s('confirmed'), null, null, s('saved'), null, null);
    fn(s('published'), null, null, null, null, null);
    expect(trigger).toHaveBeenCalledTimes(1);
    makeCheckAndAutoConfirm({ compoundForm: null, triggerConfirm: trigger })(s('confirmed'), null, null, [], null, null);
    makeCheckAndAutoConfirm({ compoundForm: { status: 'confirmed' }, triggerConfirm: trigger })(s('confirmed'), null, null, [], null, null);
    makeCheckAndAutoConfirm({ compoundForm: { status: 'published' }, triggerConfirm: trigger })(s('confirmed'), null, null, [], null, null);
    expect(trigger).toHaveBeenCalledTimes(1);
  });
  it('makeCheckAndAutoPublish', () => {
    const trigger = vi.fn();
    const fn = makeCheckAndAutoPublish({ compoundForm: { status: 'confirmed' }, triggerPublish: trigger });
    fn(null, null, null, null, null, null);
    fn(s('published'), null, null, [s('published')], null, null);
    expect(trigger).toHaveBeenCalledTimes(1);
    fn(s('published'), null, null, s('confirmed'), null, null);
    expect(trigger).toHaveBeenCalledTimes(1);
    makeCheckAndAutoPublish({ compoundForm: { status: 'published' }, triggerPublish: trigger })(s('published'), null, null, [], null, null);
    makeCheckAndAutoPublish({ compoundForm: undefined, triggerPublish: trigger })(s('published'), null, null, [], null, null);
    expect(trigger).toHaveBeenCalledTimes(1);
  });
});
