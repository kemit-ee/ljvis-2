import * as yup from 'yup';
import { describe, expect, it, vi } from 'vitest';
import { createSaveAllHandler } from './createSaveAllHandler';

type Ref = { save: () => void; validateForm?: () => void };

const makeSub = (over: Record<string, unknown> = {}) => ({
  form: { a: 1 },
  editActive: true,
  draftRef: { current: { name: 'x' } as unknown },
  editCardRef: { current: { save: vi.fn(), validateForm: vi.fn() } as Ref | null },
  ...over,
});

const setup = (over: Record<string, unknown> = {}) => {
  const setTabErrors = vi.fn();
  const setValidatedTabs = vi.fn();
  const onCompoundSave = vi.fn();
  const onCompoundValidate = vi.fn().mockResolvedValue(true);
  return { setTabErrors, setValidatedTabs, onCompoundSave, onCompoundValidate, ...over };
};

describe('createSaveAllHandler', () => {
  it('valideerib, salvestab komposiitvormi ja alamvormi kaardi', async () => {
    const sub = makeSub();
    const o = setup();
    await createSaveAllHandler({
      subForms: [{ tabId: 'tab-driver', subForm: sub as never }],
      activeTab: 'tab-driver',
      compoundEditActive: true,
      ...o,
    })();
    expect(o.setTabErrors).toHaveBeenCalledWith({ 'tab-driver': false });
    const updater = o.setValidatedTabs.mock.calls[0][0] as (s: Set<string>) => Set<string>;
    expect([...updater(new Set(['z']))]).toEqual(['z', 'tab-driver']);
    expect(sub.editCardRef.current?.validateForm).toHaveBeenCalled();
    expect(o.onCompoundSave).toHaveBeenCalled();
    expect(sub.editCardRef.current?.save).toHaveBeenCalled();
  });

  it('jätab muutmisvälja mitteaktiivsed alamvormid vahele', async () => {
    const sub = makeSub({ editActive: false });
    const o = setup();
    await createSaveAllHandler({
      subForms: [{ tabId: 't', subForm: sub as never }],
      activeTab: 'other',
      ...o,
    })();
    expect(o.setTabErrors).toHaveBeenCalledWith({});
    expect(sub.editCardRef.current?.save).not.toHaveBeenCalled();
  });

  it('draft null → viga puudub, salvestatakse kaardi kaudu', async () => {
    const sub = makeSub({ draftRef: { current: null } });
    const o = setup();
    await createSaveAllHandler({ subForms: [{ tabId: 't', subForm: sub as never }], activeTab: 'x', ...o })();
    expect(o.setTabErrors).toHaveBeenCalledWith({ t: false });
    expect(sub.editCardRef.current?.save).toHaveBeenCalled();
  });

  it('skeemi viga peatab salvestamise', async () => {
    const sub = makeSub({ draftRef: { current: {} } });
    const schema = yup.object({ name: yup.string().required() });
    const o = setup();
    await createSaveAllHandler({
      subForms: [{ tabId: 't', subForm: sub as never, schema: schema as never }],
      activeTab: 'x',
      compoundEditActive: true,
      ...o,
    })();
    expect(o.setTabErrors).toHaveBeenCalledWith({ t: true });
    expect(o.onCompoundSave).not.toHaveBeenCalled();
    expect(sub.editCardRef.current?.save).not.toHaveBeenCalled();
  });

  it('kehtiv skeem lubab salvestamise', async () => {
    const sub = makeSub();
    const schema = yup.object({ name: yup.string().required() });
    const o = setup();
    await createSaveAllHandler({
      subForms: [{ tabId: 't', subForm: sub as never, schema: schema as never }],
      activeTab: 'x',
      ...o,
    })();
    expect(o.setTabErrors).toHaveBeenCalledWith({ t: false });
    expect(sub.editCardRef.current?.save).toHaveBeenCalled();
  });

  it('komposiitvormi valideerimise ebaõnnestumine peatab salvestamise', async () => {
    const sub = makeSub();
    const o = setup({ onCompoundValidate: vi.fn().mockResolvedValue(false) });
    await createSaveAllHandler({
      subForms: [{ tabId: 't', subForm: sub as never }],
      activeTab: 'x',
      compoundEditActive: true,
      ...o,
    })();
    expect(o.onCompoundSave).not.toHaveBeenCalled();
    expect(sub.editCardRef.current?.save).not.toHaveBeenCalled();
  });

  it('kasutab fallbackSave-i drafti või vormiga', async () => {
    const fallbackSave = vi.fn();
    const withDraft = makeSub();
    const noDraft = makeSub({ draftRef: { current: null } });
    const empty = makeSub({ draftRef: { current: null }, form: null });
    const o = setup();
    await createSaveAllHandler({
      subForms: [
        { tabId: 'a', subForm: withDraft as never, fallbackSave },
        { tabId: 'b', subForm: noDraft as never, fallbackSave },
        { tabId: 'c', subForm: empty as never, fallbackSave },
      ],
      activeTab: 'x',
      ...o,
    })();
    expect(fallbackSave).toHaveBeenCalledTimes(2);
    expect(fallbackSave).toHaveBeenNthCalledWith(1, { name: 'x' }, { a: 1 });
    expect(fallbackSave).toHaveBeenNthCalledWith(2, { a: 1 }, { a: 1 });
  });

  it('ei vaja kaardi viidet ega komposiitvormi tagasikutseid', async () => {
    const sub = makeSub({ editCardRef: { current: null } });
    const o = setup();
    await createSaveAllHandler({
      subForms: [{ tabId: 't', subForm: sub as never }],
      activeTab: 't',
      compoundEditActive: true,
      setTabErrors: o.setTabErrors,
      setValidatedTabs: o.setValidatedTabs,
    })();
    expect(o.setTabErrors).toHaveBeenCalled();
  });
});
