// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransportInterruptionFormFields } from './TransportInterruptionFormFields';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: () => [
      { code: 'A', name: 'Alus A', description: 'kirjeldus A', isValid: true },
      { code: 'B', name: 'Alus B', description: undefined, isValid: true },
      { code: 'OLD', name: 'Vana', description: 'aegunud', isValid: false },
    ],
  }),
}));
vi.mock('../../components/shared/AddressFields', () => ({
  AddressFields: (props: { errors?: { postalCode?: string }; onChange: (v: unknown) => void }) => (
    <div data-testid="address" data-error={props.errors?.postalCode ?? ''}>
      <button onClick={() => props.onChange({ countryCode: 'EE' })}>address-change</button>
    </div>
  ),
}));
vi.mock('../../components/shared/FileUploadBlock.tsx', () => ({
  FileUploadBlock: (props: { formNumber: string }) => <div data-testid="files">{props.formNumber}</div>,
}));

type Props = Parameters<typeof TransportInterruptionFormFields>[0];

const makeProps = (over: Partial<Props> = {}, values: Record<string, unknown> = {}, errors: Record<string, unknown> = {}) => {
  const setFieldValue = vi.fn();
  const toggleLegalBasis = vi.fn();
  const setAddressValue = vi.fn();
  const props = {
    formik: {
      values: {
        headerText: 'Päis',
        interruptionReason: 'Põhjus',
        legalBases: ['A'],
        terminationCondition: 'Tingimus',
        personApplications: 'Avaldused',
        subFormNumber: 'SP-9',
        ...values,
      },
      errors,
      setFieldValue,
    },
    counties: [],
    addressValue: { countryCode: 'EE', county: '', city: '', street: '', postalCode: '' },
    setAddressValue,
    toggleLegalBasis,
    canEdit: true,
    isDesktop: true,
    ...over,
  } as unknown as Props;
  return { props, setFieldValue, toggleLegalBasis, setAddressValue };
};

describe('TransportInterruptionFormFields', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the sections, hides invalid legal bases while editing and passes the file number', () => {
    const { props } = makeProps();
    render(<TransportInterruptionFormFields {...props} />);
    expect(screen.getByText('forms.transport_interruption.header.title')).toBeTruthy();
    expect(screen.getByLabelText(/Alus A/)).toBeTruthy();
    expect(screen.queryByLabelText(/Vana/)).toBeNull();
    expect(screen.getByTestId('files').textContent).toBe('SP-9');
  });

  it('shows the invalid legal bases and no file block in read-only mode', () => {
    const { props } = makeProps({ canEdit: false, isDesktop: false }, { subFormNumber: '' });
    render(<TransportInterruptionFormFields {...props} />);
    expect(screen.getByLabelText(/Vana/)).toBeTruthy();
    expect(screen.queryByTestId('files')).toBeNull();
  });

  it('forwards the postal code error to the address block', () => {
    const { props } = makeProps({}, {}, { residencePostalCode: 'liiga pikk' });
    render(<TransportInterruptionFormFields {...props} />);
    expect(screen.getByTestId('address').getAttribute('data-error')).toBe('liiga pikk');
  });

  it('writes text fields through formik', () => {
    const { props, setFieldValue } = makeProps();
    const { container } = render(<TransportInterruptionFormFields {...props} />);
    const set = (id: string, value: string) =>
      fireEvent.change(container.querySelector(`#${id}`) as HTMLTextAreaElement, { target: { value } });
    set('headerText', 'h');
    set('interruptionReason', 'r');
    set('terminationCondition', 't');
    set('personApplications', 'p');
    expect(setFieldValue).toHaveBeenCalledWith('headerText', 'h');
    expect(setFieldValue).toHaveBeenCalledWith('interruptionReason', 'r');
    expect(setFieldValue).toHaveBeenCalledWith('terminationCondition', 't');
    expect(setFieldValue).toHaveBeenCalledWith('personApplications', 'p');
  });

  it('toggles legal bases through the choice group', () => {
    const { props, toggleLegalBasis } = makeProps();
    render(<TransportInterruptionFormFields {...props} />);
    fireEvent.click(screen.getByLabelText(/Alus B/));
    expect(toggleLegalBasis).toHaveBeenCalledWith('B', true);
    fireEvent.click(screen.getByLabelText(/Alus A/));
    expect(toggleLegalBasis).toHaveBeenCalledWith('A', false);
  });

  it('ignores legal basis changes when not editable', () => {
    const { props, toggleLegalBasis } = makeProps({ canEdit: false });
    render(<TransportInterruptionFormFields {...props} />);
    fireEvent.click(screen.getByLabelText(/Alus B/));
    expect(toggleLegalBasis).not.toHaveBeenCalled();
  });

  it('copes with missing optional values', () => {
    const { props } = makeProps({}, {
      headerText: undefined,
      interruptionReason: undefined,
      legalBases: undefined,
      terminationCondition: undefined,
      personApplications: undefined,
    });
    render(<TransportInterruptionFormFields {...props} />);
    expect(screen.getByTestId('address')).toBeTruthy();
  });
});
