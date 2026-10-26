// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransportInterruptionFormEditCard, type TransportInterruptionFormEditCardRef } from './TransportInterruptionFormEditCard';
import { TransportInterruptionFormViewCard } from './TransportInterruptionFormViewCard';

const page = {
  handleSubmit: vi.fn(),
  isDirty: vi.fn(() => true),
  hasErrors: vi.fn(() => false),
  validateForm: vi.fn(),
  confirm: vi.fn(),
};

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../FormVersionsTable/FormVersionsTable', () => ({
  FormVersionsTable: (p: { refreshKey: number }) => <div data-testid="versions">{p.refreshKey}</div>,
}));
vi.mock('../FormPrintButton/FormPrintButton', () => ({ FormPrintButton: () => <div>print</div> }));
vi.mock('../SubFormEditPublishButton/SubFormEditPublishButton', () => ({
  SubFormEditPublishButton: (p: { isDirty: () => boolean }) => <button onClick={() => p.isDirty()}>edit-publish</button>,
}));
vi.mock('../../pages/transport-interruption-form/TransportInterruptionFormCreatePage', () => ({
  TransportInterruptionFormCreatePage: React.forwardRef(function Page(
    p: { onSaved: (id?: string, c?: boolean) => void },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => page);
    return <button onClick={() => p.onSaved('9', false)}>page-saved</button>;
  }),
}));
vi.mock('../../pages/transport-interruption-form/useTransportInterruptionForm', () => ({
  useTransportInterruptionForm: () => ({ formik: {}, counties: [], addressValue: {}, setAddressValue: vi.fn(), toggleLegalBasis: vi.fn() }),
}));
vi.mock('../../pages/transport-interruption-form/TransportInterruptionFormFields', () => ({
  TransportInterruptionFormFields: () => <div>fields</div>,
}));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => false }));

const formObj = { id: '5', subFormNumber: 'TI-1' };
const form = formObj as never;

describe('TransportInterruptionFormEditCard', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);
  const props = { form, compoundFormKey: 1, onSaved: vi.fn(), onCancel: vi.fn(), onConfirm: vi.fn(), formType: 'transport-interruption', canConfirm: true };

  it('ref ja nupud', () => {
    const ref = React.createRef<TransportInterruptionFormEditCardRef>();
    render(<TransportInterruptionFormEditCard ref={ref} {...props} />);
    ref.current!.save();
    expect(page.handleSubmit).toHaveBeenCalled();
    expect(ref.current!.isDirty()).toBe(true);
    expect(ref.current!.hasErrors()).toBe(false);
    ref.current!.validateForm!();
    fireEvent.click(screen.getByText('common.confirm'));
    expect(page.confirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('edit-publish'));
    fireEvent.click(screen.getByText('page-saved'));
    expect(props.onSaved).toHaveBeenCalledWith('9', false);
    expect(screen.getByTestId('versions').textContent).toBe('1');
  });

  it('ilma id-ta ja õiguseta', () => {
    render(<TransportInterruptionFormEditCard {...props} form={{} as never} canConfirm={false} />);
    expect(screen.queryByTestId('versions')).toBeNull();
    expect(screen.queryByText('common.confirm')).toBeNull();
  });
});

describe('TransportInterruptionFormViewCard', () => {
  afterEach(cleanup);
  it('avalikustab ja värskendab versioone', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<TransportInterruptionFormViewCard form={{ ...formObj, compoundFormKey: 2 } as never} formType="x" canPublish onPublish={onPublish} />);
    expect(screen.getByText('fields')).toBeTruthy();
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(screen.getByTestId('versions').textContent).toBe('1'));
  });
  it('ilma õiguse ja id-ta', () => {
    render(<TransportInterruptionFormViewCard form={{} as never} formType="x" />);
    expect(screen.queryByText('common.publish')).toBeNull();
    expect(screen.queryByTestId('versions')).toBeNull();
  });
});
