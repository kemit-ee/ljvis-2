// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TechnicalCheckFormEditCard, type TechnicalCheckFormEditCardRef } from './TechnicalCheckFormEditCard';
import { TechnicalCheckFormViewCard } from './TechnicalCheckFormViewCard';
import { saveProceedingOutcome } from '../../api';
import { buildRsiMessageFromTechnicalCard } from '../../../erru/api';

const page = {
  handleSubmit: vi.fn(),
  isDirty: vi.fn(() => true),
  hasErrors: vi.fn(() => true),
  validateForm: vi.fn(),
  confirm: vi.fn(),
};
let formikValues: Record<string, unknown> = {};
const perms = new Set<string>();
const navigate = vi.fn();

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => perms.has(p) }) }));
vi.mock('../FormVersionsTable/FormVersionsTable.tsx', () => ({
  FormVersionsTable: (p: { refreshKey: number }) => <div data-testid="versions">{p.refreshKey}</div>,
}));
vi.mock('../FormPrintButton/FormPrintButton', () => ({
  FormPrintButton: (p: { endpoint: string }) => <div data-testid="print">{p.endpoint}</div>,
}));
vi.mock('../SubFormEditPublishButton/SubFormEditPublishButton', () => ({
  SubFormEditPublishButton: (p: { isDirty: () => boolean }) => <button onClick={() => p.isDirty()}>edit-publish</button>,
}));
vi.mock('../shared/RequestCarrierNotification', () => ({
  RequestCarrierNotification: (p: { formType: string }) => <div data-testid="rcn">{p.formType}</div>,
}));
vi.mock('../../pages/technical-check-form/TechnicalCheckFormCreatePage.tsx', () => ({
  TechnicalCheckFormCreatePage: React.forwardRef(function Page(
    p: { onSaved: (id?: string, c?: boolean) => void },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => page);
    return <button onClick={() => p.onSaved('9', true)}>page-saved</button>;
  }),
}));
vi.mock('../../pages/technical-check-form/useTechnicalCheckForm', () => ({
  useTechnicalCheckForm: () => ({ formik: { values: formikValues }, parts: [], defectsByPartKey: {}, euViolations: [] }),
}));
vi.mock('../../pages/technical-check-form/TechnicalCheckFormFields', () => ({
  TechnicalCheckFormFields: (p: { variant: string }) => <div>{`fields-${p.variant}`}</div>,
}));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('../../api', () => ({ saveProceedingOutcome: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../erru/api', () => ({ buildRsiMessageFromTechnicalCard: vi.fn() }));

const formObj = { id: '5', subFormNumber: 'TC-1', status: 'confirmed' };
const form = formObj as never;

describe('TechnicalCheckFormEditCard', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);
  const props = { scope: 'vehicle' as const, form, compoundFormKey: 1, onSaved: vi.fn(), onCancel: vi.fn(), onConfirm: vi.fn(), formType: 'vehicle-technical', canConfirm: true };

  it('kinnitab märkega vedaja teavitamise ja delegeerib ref-i', () => {
    const ref = React.createRef<TechnicalCheckFormEditCardRef>();
    render(<TechnicalCheckFormEditCard ref={ref} {...props} />);
    ref.current!.save();
    expect(ref.current!.isDirty()).toBe(true);
    expect(ref.current!.hasErrors()).toBe(true);
    ref.current!.validateForm!();
    expect(page.validateForm).toHaveBeenCalled();
    expect(screen.getByTestId('print').textContent).toBe('/v1/control-forms/vehicle-technical/read/print');
    expect(screen.getByTestId('rcn').textContent).toBe('vehicle_technical');
    fireEvent.click(screen.getByText('common.confirm'));
    expect(page.confirm).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByLabelText('forms.notifyCarrierOnConfirm'));
    fireEvent.click(screen.getByText('common.confirm'));
    expect(page.confirm).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByText('edit-publish'));
    fireEvent.click(screen.getByText('page-saved'));
    expect(screen.getByTestId('versions').textContent).toBe('1');
  });

  it('haagise variant ilma õiguse ja id-ta', () => {
    render(<TechnicalCheckFormEditCard {...props} scope="trailer" form={{} as never} canConfirm={false} />);
    expect(screen.getByTestId('print').textContent).toBe('/v1/control-forms/trailer-technical/read/print');
    expect(screen.getByTestId('rcn').textContent).toBe('trailer_technical');
    expect(screen.queryByText('common.confirm')).toBeNull();
    expect(screen.queryByTestId('versions')).toBeNull();
  });
});

describe('TechnicalCheckFormViewCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formikValues = {};
    perms.clear();
  });
  afterEach(cleanup);

  it('avalikustab otse ja värskendab versioone', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<TechnicalCheckFormViewCard scope="vehicle" form={{ ...formObj, compoundFormKey: 4 } as never} formType="x" canPublish onPublish={onPublish} snapshotId="s" />);
    expect(screen.getByText('fields-vehicle')).toBeTruthy();
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(screen.getByTestId('versions').textContent).toBe('1'));
    expect(saveProceedingOutcome).not.toHaveBeenCalled();
  });

  it('menetlusega haagis salvestab väljundi', async () => {
    formikValues = { proceedingReferenceNumber: 'R1', enforcementDecision: 'a', proceedingClosureBasis: 'b' };
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<TechnicalCheckFormViewCard scope="trailer" form={form} formType="x" canPublish onPublish={onPublish} />);
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(saveProceedingOutcome).toHaveBeenCalledWith('trailer_technical', '5', 'a', 'b'));
  });

  it('menetlusega vehicle salvestab väljundi', async () => {
    formikValues = { proceedingReferenceNumber: 'R1', enforcementDecision: 'a', proceedingClosureBasis: 'b' };
    render(<TechnicalCheckFormViewCard scope="vehicle" form={form} formType="x" canPublish onPublish={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(saveProceedingOutcome).toHaveBeenCalledWith('vehicle_technical', '5', 'a', 'b'));
  });

  it('RSI loomise nupp navigeerib', async () => {
    perms.add('rsi.create');
    vi.mocked(buildRsiMessageFromTechnicalCard).mockResolvedValue({ id: 77 } as never);
    render(<TechnicalCheckFormViewCard scope="vehicle" form={form} formType="x" />);
    fireEvent.click(screen.getByText('erru.rsi.form.createFromTechnicalCard'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/erru/rsi/77', { state: { justSaved: true } }));
    expect(buildRsiMessageFromTechnicalCard).toHaveBeenCalledWith('5', 'vehicle');
  });

  it('peidab nupud ilma õigusteta, id-ta ja väljundita menetluse korral', () => {
    formikValues = { proceedingType: 'misdemeanor' };
    const { rerender } = render(<TechnicalCheckFormViewCard scope="vehicle" form={form} formType="x" canPublish onPublish={vi.fn()} />);
    expect(screen.queryByText('common.publish')).toBeNull();
    expect(screen.queryByText('erru.rsi.form.createFromTechnicalCard')).toBeNull();
    perms.add('rsi.create');
    rerender(<TechnicalCheckFormViewCard scope="vehicle" form={{} as never} formType="x" />);
    expect(screen.queryByText('erru.rsi.form.createFromTechnicalCard')).toBeNull();
    expect(screen.queryByTestId('versions')).toBeNull();
  });
});
