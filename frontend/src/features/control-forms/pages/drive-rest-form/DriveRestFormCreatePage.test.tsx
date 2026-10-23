// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  scope: [] as unknown[],
  hookArgs: undefined as undefined | unknown[],
  triggerConfirm: vi.fn(),
  formik: {} as Record<string, unknown>,
  handleSaved: undefined as undefined | ((id?: string, c?: boolean) => void),
  pendingKey: { current: undefined as number | undefined },
  fieldsProps: undefined as undefined | Record<string, unknown>,
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  ClassifierScopeProvider: (p: { formType: unknown; active: boolean; children: React.ReactNode }) => {
    h.scope.push(p.formType);
    return <>{p.children}</>;
  },
}));
vi.mock('./useDriveRestForm', () => ({
  useDriveRestForm: (...args: unknown[]) => {
    h.hookArgs = args;
    h.handleSaved = args[1] as typeof h.handleSaved;
    return {
      formik: h.formik,
      pendingCompoundFormKey: h.pendingKey,
      cargoCabotageViolations: [],
      passengerCabotageViolations: [],
      transportClasses: [],
      docRightChecks: [],
      docRightOtherDocs: [],
      tachographTypes: [],
      drivingViolations: [],
      drivingViolationsMain: [],
      rooma1Violations: [],
      postingViolations: [],
      massDimensions: [],
      triggerConfirm: h.triggerConfirm,
    };
  },
}));
vi.mock('../../components/DriveRestForm/DriveRestFormFields', () => ({
  DriveRestFormFields: (p: Record<string, unknown>) => {
    h.fieldsProps = p;
    return <div data-testid="fields" />;
  },
}));

import { DriveRestFormCreatePage } from './DriveRestFormCreatePage';

const makeFormik = () => ({
  handleSubmit: vi.fn(),
  validateForm: vi.fn().mockResolvedValue({}),
  setTouched: vi.fn(),
  setFieldValue: vi.fn(),
  values: { a: 1, b: 2 },
  errors: {} as Record<string, string>,
  dirty: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.scope.length = 0;
  h.pendingKey.current = undefined;
  h.formik = makeFormik();
});
afterEach(cleanup);

describe('DriveRestFormCreatePage', () => {
  it('kasutab õiget klassifikaatoriskoopi', () => {
    render(<DriveRestFormCreatePage type="driver" />);
    cleanup();
    render(<DriveRestFormCreatePage type="teammate" />);
    cleanup();
    render(<DriveRestFormCreatePage type="driver" authority="TRAM" />);
    expect(new Set(h.scope).size).toBe(3);
    expect(h.fieldsProps!.hideDriveRestExtras).toBe(true);
  });

  it('valideerib mountimisel ja initialValidate märgib väljad puudutatuks', async () => {
    render(<DriveRestFormCreatePage type="driver" initialValidate />);
    await waitFor(() => expect((h.formik.setTouched as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ a: true, b: true }));
  });

  it('onValuesChange kutsutakse alles pärast esimest renderit', () => {
    const onValuesChange = vi.fn();
    const { rerender } = render(<DriveRestFormCreatePage type="driver" onValuesChange={onValuesChange} />);
    expect(onValuesChange).not.toHaveBeenCalled();
    h.formik = { ...makeFormik(), values: { a: 2 } };
    rerender(<DriveRestFormCreatePage type="driver" onValuesChange={onValuesChange} />);
    expect(onValuesChange).toHaveBeenCalledWith({ a: 2 });
  });

  it('salvestamine ilma onSaved-ita suunab avalehele; onSaved-iga kutsub seda', () => {
    render(<DriveRestFormCreatePage type="driver" />);
    h.handleSaved!('5', false);
    expect(h.navigate).toHaveBeenCalledWith('/', { state: { justCreated: true } });
    cleanup();
    const onSaved = vi.fn();
    render(<DriveRestFormCreatePage type="teammate" onSaved={onSaved} compoundFormKey={4} />);
    h.handleSaved!('6', true);
    expect(onSaved).toHaveBeenCalledWith('6', true);
    expect(h.hookArgs![2]).toBe('teammate');
    expect(h.hookArgs![3]).toBe(4);
  });

  it('ref-meetodid', async () => {
    const ref = createRef<{
      formElement: HTMLFormElement;
      handleSubmit: (k?: number) => void;
      getFormData?: () => unknown;
      setFormData?: (d: Record<string, unknown>) => void;
      hasErrors: () => boolean;
      isDirty: () => boolean;
      validateForm?: () => void;
      confirm?: (n?: boolean) => void;
    }>();
    render(<DriveRestFormCreatePage type="driver" ref={ref} />);
    const r = ref.current!;
    expect(r.formElement.tagName).toBe('FORM');
    r.handleSubmit();
    expect(h.pendingKey.current).toBeUndefined();
    r.handleSubmit(9);
    expect(h.pendingKey.current).toBe(9);
    expect((h.formik.handleSubmit as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
    expect(r.getFormData!()).toEqual({ a: 1, b: 2 });
    r.setFormData!({ x: 1, y: 2 });
    expect((h.formik.setFieldValue as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('y', 2);
    expect(r.hasErrors()).toBe(false);
    (h.formik.errors as Record<string, string>).f = 'e';
    expect(r.hasErrors()).toBe(true);
    expect(r.isDirty()).toBe(true);
    await act(async () => {
      r.validateForm!();
    });
    await waitFor(() => expect((h.formik.setTouched as ReturnType<typeof vi.fn>)).toHaveBeenCalled());
    r.confirm!(true);
    expect(h.triggerConfirm).toHaveBeenCalledWith(true);
  });
});
