// @vitest-environment jsdom
import { createRef } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TransportInterruptionFormCreatePage,
  type TransportInterruptionFormCreatePageRef,
} from './TransportInterruptionFormCreatePage';
import { useTransportInterruptionForm } from './useTransportInterruptionForm';

const hookState = vi.hoisted(() => ({
  onSavedArg: undefined as undefined | ((id?: string, confirmed?: boolean) => void),
}));

vi.mock('./TransportInterruptionFormFields', () => ({
  TransportInterruptionFormFields: () => <div data-testid="fields" />,
}));
vi.mock('./useTransportInterruptionForm', () => ({
  useTransportInterruptionForm: vi.fn(),
}));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  ClassifierScopeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const makeFormik = () => {
  const values = { a: 1, b: 2 };
  return {
    values,
    errors: {} as Record<string, string>,
    dirty: true,
    handleSubmit: vi.fn((e?: { preventDefault?: () => void }) => e?.preventDefault?.()),
    setFieldValue: vi.fn(),
    validateForm: vi.fn().mockResolvedValue({}),
    setTouched: vi.fn(),
  };
};

describe('TransportInterruptionFormCreatePage', () => {
  let formik: ReturnType<typeof makeFormik>;
  let pending: { current: number | undefined };
  const triggerConfirm = vi.fn();

  beforeEach(() => {
    formik = makeFormik();
    pending = { current: undefined };
    triggerConfirm.mockReset().mockResolvedValue(undefined);
    vi.mocked(useTransportInterruptionForm).mockImplementation(((_f: unknown, onSaved: (id?: string, confirmed?: boolean) => void) => {
      hookState.onSavedArg = onSaved;
      return {
        formik,
        pendingCompoundFormKey: pending,
        counties: [],
        addressValue: {},
        setAddressValue: vi.fn(),
        toggleLegalBasis: vi.fn(),
        triggerConfirm,
        formError: null,
      };
    }) as never);
  });
  afterEach(cleanup);

  it('exposes imperative handlers', async () => {
    const ref = createRef<TransportInterruptionFormCreatePageRef>();
    const onSaved = vi.fn();
    render(<TransportInterruptionFormCreatePage ref={ref} onSaved={onSaved} />);
    const api = ref.current!;

    api.handleSubmit(55);
    expect(pending.current).toBe(55);
    expect(formik.handleSubmit).toHaveBeenCalled();
    api.handleSubmit();

    expect(api.getFormData()).toBe(formik.values);
    api.setFormData({ interruptionReason: 'x' } as never);
    expect(formik.setFieldValue).toHaveBeenCalledWith('interruptionReason', 'x');
    expect(api.hasErrors()).toBe(false);
    formik.errors.x = 'bad';
    expect(api.hasErrors()).toBe(true);
    expect(api.isDirty()).toBe(true);

    api.confirm!();
    expect(triggerConfirm).toHaveBeenCalled();

    api.validateForm();
    await waitFor(() => expect(formik.setTouched).toHaveBeenCalledWith({ a: true, b: true }));

    hookState.onSavedArg?.('1', true);
    expect(onSaved).toHaveBeenCalledWith('1', true);
  });

  it('validates on mount when requested and reports value changes after mount', async () => {
    const onValuesChange = vi.fn();
    const { rerender } = render(
      <TransportInterruptionFormCreatePage initialValidate onValuesChange={onValuesChange} />,
    );
    await waitFor(() => expect(formik.setTouched).toHaveBeenCalledWith({ a: true, b: true }));
    expect(onValuesChange).not.toHaveBeenCalled();
    formik.values = { a: 3, b: 2 };
    await act(async () => {
      rerender(<TransportInterruptionFormCreatePage initialValidate onValuesChange={onValuesChange} />);
    });
    expect(onValuesChange).toHaveBeenCalledWith({ a: 3, b: 2 });
  });

  it('works without optional callbacks', () => {
    render(<TransportInterruptionFormCreatePage />);
    hookState.onSavedArg?.('2', false);
  });
});
