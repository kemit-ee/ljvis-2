// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdrFormEditCard, type AdrFormEditCardRef } from './AdrFormEditCard';
import { AdrFormViewCard } from './AdrFormViewCard';
import { saveProceedingOutcome } from '../../api';

const page = {
  handleSubmit: vi.fn(),
  isDirty: vi.fn(() => true),
  hasErrors: vi.fn(() => true),
  validateForm: vi.fn(),
  confirm: vi.fn(),
};
let formikValues: Record<string, unknown> = {};

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../FormVersionsTable/FormVersionsTable', () => ({
  FormVersionsTable: (p: { refreshKey: number; formId: string }) => <div data-testid="versions">{`${p.formId}:${p.refreshKey}`}</div>,
}));
vi.mock('../FormPrintButton/FormPrintButton', () => ({
  FormPrintButton: (p: { id?: string; snapshotId?: string }) => <div data-testid="print">{`${p.id ?? ''}:${p.snapshotId ?? ''}`}</div>,
}));
vi.mock('../SubFormEditPublishButton/SubFormEditPublishButton', () => ({
  SubFormEditPublishButton: (p: { isDirty: () => boolean }) => <button onClick={() => p.isDirty()}>edit-publish</button>,
}));
vi.mock('../../pages/adr-form/AdrFormCreatePage', () => ({
  AdrFormCreatePage: React.forwardRef(function Page(
    p: { onSaved: (id?: string, c?: boolean) => void },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => page);
    return <button onClick={() => p.onSaved('9', true)}>page-saved</button>;
  }),
}));
vi.mock('../../pages/adr-form/useAdrForm', () => ({
  useAdrForm: () => ({ formik: { values: formikValues } }),
}));
vi.mock('../../pages/adr-form/AdrFormFields', () => ({ AdrFormFields: () => <div>fields</div> }));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('../../api', () => ({ saveProceedingOutcome: vi.fn().mockResolvedValue(undefined) }));

const formObj = { id: '5', subFormNumber: 'ADR-1', status: 'confirmed' };
const form = formObj as never;

describe('AdrFormEditCard', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  const props = { form, compoundFormKey: 1, onSaved: vi.fn(), onCancel: vi.fn(), onConfirm: vi.fn(), formType: 'adr-form', canConfirm: true };

  it('ref-meetodid delegeerivad lehele ja kinnitusnupp kutsub confirm', () => {
    const ref = React.createRef<AdrFormEditCardRef>();
    const onSaved = vi.fn();
    render(<AdrFormEditCard ref={ref} {...props} onSaved={onSaved} />);
    ref.current!.save();
    expect(page.handleSubmit).toHaveBeenCalled();
    expect(ref.current!.isDirty()).toBe(true);
    expect(ref.current!.hasErrors()).toBe(true);
    ref.current!.validateForm!();
    expect(page.validateForm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.confirm'));
    expect(page.confirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('edit-publish'));
    fireEvent.click(screen.getByText('page-saved'));
    expect(onSaved).toHaveBeenCalledWith('9', true);
    expect(screen.getByTestId('versions').textContent).toBe('5:1');
  });

  it('ilma id-ta ja kinnitusõiguseta ei näita versioone ega nuppu', () => {
    render(<AdrFormEditCard {...props} form={{ subFormNumber: 'X' } as never} canConfirm={false} />);
    expect(screen.queryByTestId('versions')).toBeNull();
    expect(screen.queryByText('common.confirm')).toBeNull();
  });
});

describe('AdrFormViewCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formikValues = {};
  });
  afterEach(cleanup);

  it('näitab välju ja versioone; ilma menetluseta avalikustab otse', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<AdrFormViewCard form={{ ...formObj, compoundFormKey: 3 } as never} formType="adr-form" canPublish onPublish={onPublish} snapshotId="sn" />);
    expect(screen.getByText('fields')).toBeTruthy();
    expect(screen.getByTestId('print').textContent).toBe('5:sn');
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(saveProceedingOutcome).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('versions').textContent).toBe('5:1'));
  });

  it('menetlusega salvestab enne väljundi', async () => {
    formikValues = { proceedingType: 'misdemeanor', enforcementDecision: 'otsus', proceedingClosureBasis: 'alus' };
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<AdrFormViewCard form={form} formType="adr-form" canPublish onPublish={onPublish} />);
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(saveProceedingOutcome).toHaveBeenCalledWith('adr', '5', 'otsus', 'alus'));
    expect(onPublish).toHaveBeenCalled();
  });

  it('menetlus ilma väljundita peidab nupu; õiguseta peidab samuti; id-ta pole versioone', () => {
    formikValues = { proceedingType: 'misdemeanor' };
    const { rerender } = render(<AdrFormViewCard form={form} formType="adr-form" canPublish onPublish={vi.fn()} />);
    expect(screen.queryByText('common.publish')).toBeNull();
    formikValues = {};
    rerender(<AdrFormViewCard form={{ subFormNumber: 'X' } as never} formType="adr-form" />);
    expect(screen.queryByText('common.publish')).toBeNull();
    expect(screen.queryByTestId('versions')).toBeNull();
  });
});
