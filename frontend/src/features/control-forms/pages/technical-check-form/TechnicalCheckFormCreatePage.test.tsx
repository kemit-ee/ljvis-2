// @vitest-environment jsdom
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TechnicalCheckFormCreatePage, type TechnicalCheckFormCreatePageRef } from './TechnicalCheckFormCreatePage';
import { useTechnicalCheckForm } from './useTechnicalCheckForm';

const hookState = vi.hoisted(() => ({
  onSaved: undefined as undefined | ((id?: string, confirmed?: boolean) => void),
  scope: undefined as unknown,
}));

vi.mock('./TechnicalCheckFormFields', () => ({
  TechnicalCheckFormFields: (p: { variant: string; validationTriggered: boolean; checkError: string | null; onCheckErrorClose: () => void }) => (
    <div data-testid="fields" data-variant={p.variant} data-validation={String(p.validationTriggered)} data-error={p.checkError ?? ''}>
      <button type="button" onClick={p.onCheckErrorClose}>close-error</button>
    </div>
  ),
}));
vi.mock('./useTechnicalCheckForm', () => ({ useTechnicalCheckForm: vi.fn() }));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  ClassifierScopeProvider: ({ children, formType }: { children: React.ReactNode; formType: unknown }) => {
    hookState.scope = formType;
    return <>{children}</>;
  },
}));

const makeFormik = () => ({
  values: { a: 1, trailerRegNr: '' } as Record<string, unknown>,
  errors: {} as Record<string, string>,
  dirty: true,
  handleSubmit: vi.fn((e?: { preventDefault?: () => void }) => e?.preventDefault?.()),
  setFieldValue: vi.fn(),
  validateForm: vi.fn().mockResolvedValue({}),
  setTouched: vi.fn(),
});

describe('TechnicalCheckFormCreatePage', () => {
  let formik: ReturnType<typeof makeFormik>;
  let override: { current: number | undefined };
  const triggerConfirm = vi.fn();
  const setFormError = vi.fn();
  let formError: string | null;

  beforeEach(() => {
    formik = makeFormik();
    override = { current: undefined };
    formError = null;
    triggerConfirm.mockReset().mockResolvedValue(undefined);
    setFormError.mockReset();
    vi.mocked(useTechnicalCheckForm).mockImplementation(((_t: unknown, _f: unknown, onSaved: (id?: string, confirmed?: boolean) => void) => {
      hookState.onSaved = onSaved;
      return {
        formik,
        parts: [],
        defectsByPartKey: new Map(),
        euViolations: [],
        applyPartDefects: vi.fn(),
        setPartChecked: vi.fn(),
        removeDefect: vi.fn(),
        setResultType: vi.fn(),
        toggleViolation: vi.fn(),
        triggerConfirm,
        compoundFormKeyOverride: override,
        formError,
        setFormError,
      };
    }) as never);
  });
  afterEach(cleanup);

  it('exposes imperative handlers and flags validation', async () => {
    const ref = createRef<TechnicalCheckFormCreatePageRef>();
    const onSaved = vi.fn();
    render(<TechnicalCheckFormCreatePage ref={ref} type="vehicle" onSaved={onSaved} />);
    const api = ref.current!;

    await act(async () => api.handleSubmit(8));
    expect(override.current).toBe(8);
    expect(formik.handleSubmit).toHaveBeenCalled();
    expect(screen.getByTestId('fields').getAttribute('data-validation')).toBe('true');
    await act(async () => api.handleSubmit());

    expect(api.getFormData()).toBe(formik.values);
    api.setFormData({ notes: 'x' } as never);
    expect(formik.setFieldValue).toHaveBeenCalledWith('notes', 'x');
    expect(api.hasErrors()).toBe(false);
    formik.errors.x = 'bad';
    expect(api.hasErrors()).toBe(true);
    expect(api.isDirty()).toBe(true);
    api.confirm!(true);
    expect(triggerConfirm).toHaveBeenCalledWith(true);

    await act(async () => api.validateForm());
    await waitFor(() => expect(formik.setTouched).toHaveBeenCalledWith({ a: true, trailerRegNr: true }));

    hookState.onSaved?.('1', true);
    expect(onSaved).toHaveBeenCalledWith('1', true);
    expect(hookState.scope).toBeDefined();
  });

  it('dismisses the check error', () => {
    formError = 'viga';
    render(<TechnicalCheckFormCreatePage type="trailer" />);
    fireEvent.click(screen.getByText('close-error'));
    expect(setFormError).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('fields').getAttribute('data-variant')).toBe('trailer');
    hookState.onSaved?.('2');
  });

  it('validates on mount, reports value changes and copies the trailer registration number', async () => {
    const onValuesChange = vi.fn();
    const trailers = [{ regNr: 'ABC123' }] as never;
    const { rerender } = render(
      <TechnicalCheckFormCreatePage type="trailer" initialValidate onValuesChange={onValuesChange} trailerIndex={0} compoundTrailers={trailers} />,
    );
    await waitFor(() => expect(formik.setTouched).toHaveBeenCalled());
    expect(formik.setFieldValue).toHaveBeenCalledWith('trailerRegNr', 'ABC123');
    expect(onValuesChange).not.toHaveBeenCalled();
    formik.values = { a: 2, trailerRegNr: 'ABC123' };
    await act(async () => {
      rerender(
        <TechnicalCheckFormCreatePage type="trailer" initialValidate onValuesChange={onValuesChange} trailerIndex={0} compoundTrailers={trailers} />,
      );
    });
    expect(onValuesChange).toHaveBeenCalledWith({ a: 2, trailerRegNr: 'ABC123' });
  });

  it('does not overwrite an existing trailer registration number', () => {
    formik.values = { trailerRegNr: 'KEEP' };
    render(<TechnicalCheckFormCreatePage type="trailer" trailerIndex={0} compoundTrailers={[{ regNr: 'NEW' }] as never} />);
    expect(formik.setFieldValue).not.toHaveBeenCalledWith('trailerRegNr', 'NEW');
  });
});
