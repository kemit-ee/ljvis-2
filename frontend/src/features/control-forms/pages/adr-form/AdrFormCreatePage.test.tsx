// @vitest-environment jsdom
import { createRef } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdrFormCreatePage, type AdrFormCreatePageRef } from './AdrFormCreatePage';
import { useAdrForm } from './useAdrForm';
import { usePersonSearch } from '../../../xroad/hooks/usePersonSearch';

const state = vi.hoisted(() => ({
  onSaved: undefined as undefined | ((id?: string, confirmed?: boolean) => void),
  onPersonFound: undefined as undefined | ((p: Record<string, string>) => void),
}));

vi.mock('./AdrFormFields', () => ({
  AdrFormFields: (p: { onSearchErrorClose: () => void; onSearchNotFoundClose: () => void; onSearch: (c: string) => void }) => (
    <div data-testid="fields">
      <button type="button" onClick={p.onSearchErrorClose}>close-error</button>
      <button type="button" onClick={p.onSearchNotFoundClose}>close-notfound</button>
      <button type="button" onClick={() => p.onSearch('39001010000')}>search</button>
    </div>
  ),
}));
vi.mock('./useAdrForm', () => ({ useAdrForm: vi.fn() }));
vi.mock('../../../xroad/hooks/usePersonSearch', () => ({ usePersonSearch: vi.fn() }));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  ClassifierScopeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const makeFormik = () => ({
  values: { a: 1, driverAssistant: { middleName: 'M' } } as Record<string, unknown>,
  errors: {} as Record<string, string>,
  dirty: true,
  handleSubmit: vi.fn((e?: { preventDefault?: () => void }) => e?.preventDefault?.()),
  setFieldValue: vi.fn(),
  validateForm: vi.fn().mockResolvedValue({}),
  setTouched: vi.fn(),
});

describe('AdrFormCreatePage', () => {
  let formik: ReturnType<typeof makeFormik>;
  let pending: { current: number | undefined };
  const triggerConfirm = vi.fn();
  const setDriverAssistant = vi.fn();
  const searchByPersonalCode = vi.fn();
  const setError = vi.fn();
  const setNotFound = vi.fn();

  beforeEach(() => {
    formik = makeFormik();
    pending = { current: undefined };
    triggerConfirm.mockReset().mockResolvedValue(undefined);
    setDriverAssistant.mockReset();
    searchByPersonalCode.mockReset();
    setError.mockReset();
    setNotFound.mockReset();
    vi.mocked(useAdrForm).mockImplementation(((_f: unknown, onSaved: (id?: string, confirmed?: boolean) => void) => {
      state.onSaved = onSaved;
      return {
        formik,
        pendingCompoundFormKey: pending,
        triggerConfirm,
        formError: null,
        counties: [],
        setDriverAssistant,
        setLastLoadAddress: vi.fn(),
        setNextLoadAddress: vi.fn(),
        addDangerousGood: vi.fn(),
        updateDangerousGood: vi.fn(),
        removeDangerousGood: vi.fn(),
        toggleCorrectiveMeasure: vi.fn(),
        toggleContainerType: vi.fn(),
        getCheckpoint: vi.fn(),
        setCheckpoint: vi.fn(),
        addRecord: vi.fn(),
        updateRecord: vi.fn(),
        removeRecord: vi.fn(),
        addOtherInfringement: vi.fn(),
        updateOtherInfringement: vi.fn(),
        removeOtherInfringement: vi.fn(),
        addOtherRecord: vi.fn(),
        updateOtherRecord: vi.fn(),
        removeOtherRecord: vi.fn(),
      };
    }) as never);
    vi.mocked(usePersonSearch).mockImplementation(((opts: { onPersonFound: (p: Record<string, string>) => void }) => {
      state.onPersonFound = opts.onPersonFound;
      return { searchByPersonalCode, loading: false, error: false, setError, notFound: false, setNotFound };
    }) as never);
  });
  afterEach(cleanup);

  it('exposes imperative handlers', async () => {
    const ref = createRef<AdrFormCreatePageRef>();
    const onSaved = vi.fn();
    render(<AdrFormCreatePage ref={ref} onSaved={onSaved} />);
    const api = ref.current!;
    api.handleSubmit(5);
    expect(pending.current).toBe(5);
    api.handleSubmit();
    expect(formik.handleSubmit).toHaveBeenCalledTimes(2);
    expect(api.getFormData()).toBe(formik.values);
    api.setFormData({ notes: 'x' } as never);
    expect(formik.setFieldValue).toHaveBeenCalledWith('notes', 'x');
    expect(api.hasErrors()).toBe(false);
    formik.errors.x = 'bad';
    expect(api.hasErrors()).toBe(true);
    expect(api.isDirty()).toBe(true);
    api.confirm!();
    expect(triggerConfirm).toHaveBeenCalled();
    api.validateForm();
    await waitFor(() => expect(formik.setTouched).toHaveBeenCalledWith({ a: true, driverAssistant: true }));
    state.onSaved?.('1', true);
    expect(onSaved).toHaveBeenCalledWith('1', true);
  });

  it('fills the driver assistant from the person search', () => {
    render(<AdrFormCreatePage />);
    state.onPersonFound?.({ personalCode: '3900', firstName: 'A', lastName: 'B', citizenshipCode: 'EE', dateOfBirth: '1990-01-01' });
    expect(setDriverAssistant).toHaveBeenCalledWith({
      middleName: 'M',
      personalCodeEe: '3900',
      firstName: 'A',
      lastName: 'B',
      citizenshipCode: 'EE',
      birthDate: '1990-01-01',
    });
    screen.getByText('search').click();
    expect(searchByPersonalCode).toHaveBeenCalledWith('39001010000');
    screen.getByText('close-error').click();
    screen.getByText('close-notfound').click();
    expect(setError).toHaveBeenCalledWith(false);
    expect(setNotFound).toHaveBeenCalledWith(false);
    state.onSaved?.('2');
  });

  it('validates on mount and reports changes after mount', async () => {
    const onValuesChange = vi.fn();
    const { rerender } = render(<AdrFormCreatePage initialValidate onValuesChange={onValuesChange} />);
    await waitFor(() => expect(formik.setTouched).toHaveBeenCalled());
    expect(onValuesChange).not.toHaveBeenCalled();
    formik.values = { a: 3 };
    await act(async () => {
      rerender(<AdrFormCreatePage initialValidate onValuesChange={onValuesChange} />);
    });
    expect(onValuesChange).toHaveBeenCalledWith({ a: 3 });
  });
});
