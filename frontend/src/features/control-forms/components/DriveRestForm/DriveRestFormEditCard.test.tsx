// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  handleSubmit: vi.fn(),
  isDirty: vi.fn(() => true),
  validateForm: vi.fn(),
  setFormData: vi.fn(),
  confirm: vi.fn(),
  createProps: undefined as undefined | Record<string, unknown>,
  publishProps: undefined as undefined | Record<string, unknown>,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../pages/drive-rest-form/DriveRestFormCreatePage', () => {
  const C = forwardRef<unknown, Record<string, unknown>>(function C(props, ref) {
    h.createProps = props;
    useImperativeHandle(ref, () => ({
      formElement: null,
      handleSubmit: h.handleSubmit,
      isDirty: h.isDirty,
      validateForm: h.validateForm,
      setFormData: h.setFormData,
      confirm: h.confirm,
      hasErrors: () => false,
    }));
    return <button onClick={() => (props.onSaved as (id: string, c: boolean) => void)('77', true)}>create-saved</button>;
  });
  return { DriveRestFormCreatePage: C };
});
vi.mock('../FormVersionsTable/FormVersionsTable.tsx', async () => ({
  FormVersionsTable: (await import('../../testing/commonStubs')).FormVersionsTableStub,
}));
vi.mock('../SubFormEditPublishButton/SubFormEditPublishButton', () => ({
  SubFormEditPublishButton: (p: { isDirty: () => boolean }) => {
    h.publishProps = p as never;
    return <button onClick={() => p.isDirty()}>publish-button</button>;
  },
}));
vi.mock('../FormPrintButton/FormPrintButton', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));
vi.mock('../shared/NotifyCarrierCheckbox', () => ({
  NotifyCarrierCheckbox: (p: { onChange: (v: boolean) => void }) => <button onClick={() => p.onChange(true)}>notify</button>,
}));
vi.mock('../shared/RequestCarrierNotification', () => ({
  RequestCarrierNotification: (p: { formType: string }) => <span data-testid="request-notification">{p.formType}</span>,
}));

import { DriveRestFormEditCard, type DriveRestFormEditCardRef } from './DriveRestFormEditCard';

beforeEach(() => {
  vi.clearAllMocks();
  h.isDirty.mockReturnValue(true);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const baseProps = {
  scope: 'driver' as const,
  form: { id: '5', subFormNumber: 'SP-1', status: 'saved' } as never,
  compoundFormKey: 3,
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
  formType: 'sp-driver',
};

describe('DriveRestFormEditCard', () => {
  it('renderdab vormi ja kutsub onSaved ning värskendab versioone', () => {
    const onSaved = vi.fn();
    render(<DriveRestFormEditCard {...baseProps} onSaved={onSaved} canConfirm={false} />);
    expect(screen.getByText('SP-1')).toBeTruthy();
    fireEvent.click(screen.getByText('create-saved'));
    expect(onSaved).toHaveBeenCalledWith('77', true);
    expect(screen.getByTestId('request-notification').textContent).toBe('sp_driver');
    expect(screen.queryByText('common.confirm')).toBeNull();
  });

  it('kinnitusnupp koos teavitusega; teammate tüüp', () => {
    render(<DriveRestFormEditCard {...baseProps} scope="teammate" onSaved={vi.fn()} canConfirm />);
    fireEvent.click(screen.getByText('notify'));
    fireEvent.click(screen.getByText('common.confirm'));
    expect(h.confirm).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('request-notification').textContent).toBe('sp_teammate');
  });

  it('ilma vormi id-ta versioonitabelit pole', () => {
    render(<DriveRestFormEditCard {...baseProps} form={{ subFormNumber: 'X' } as never} onSaved={vi.fn()} canConfirm={false} />);
    expect(screen.queryByTestId('versions-table')).toBeNull();
  });

  it('ref-meetodid delegeerivad vormile', () => {
    const ref = createRef<DriveRestFormEditCardRef>();
    render(<DriveRestFormEditCard {...baseProps} ref={ref} onSaved={vi.fn()} canConfirm={false} />);
    ref.current!.save();
    expect(h.handleSubmit).toHaveBeenCalled();
    expect(ref.current!.isDirty()).toBe(true);
    ref.current!.validateForm!();
    expect(h.validateForm).toHaveBeenCalled();
    ref.current!.setFormData!({ notes: 'x' } as never);
    expect(h.setFormData).toHaveBeenCalledWith({ notes: 'x' });
    fireEvent.click(screen.getByText('publish-button'));
    expect(h.isDirty).toHaveBeenCalled();
  });
});
