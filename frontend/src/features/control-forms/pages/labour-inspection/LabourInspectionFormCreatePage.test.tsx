// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  perms: ['labour_inspection_form.write'] as string[],
  onSaved: undefined as undefined | ((id?: string) => void),
  submitForm: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => h.perms.includes(p) }) }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({ useClassifierScopeActive: vi.fn() }));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('./useLabourInspectionForm', () => ({
  useLabourInspectionForm: (_f: unknown, onSaved: (id?: string) => void) => {
    h.onSaved = onSaved;
    return { formik: { handleSubmit: vi.fn(), submitForm: h.submitForm }, formError: 'VIGA' };
  },
}));
vi.mock('../../components/LabourInspection/LabourInspectionFormFields', () => ({
  LabourInspectionFormFields: (p: { readOnly: boolean }) => <div data-testid="fields" data-readonly={String(p.readOnly)} />,
}));
vi.mock('../../components/shared/FileUploadBlock', async () => ({
  FileUploadBlock: (await import('../../testing/commonStubs')).FileUploadBlockStub,
}));
vi.mock('../../components/FormPrintButton/FormPrintButton', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));

import { LabourInspectionFormCreatePage } from './LabourInspectionFormCreatePage';

beforeEach(() => {
  vi.clearAllMocks();
  h.perms = ['labour_inspection_form.write'];
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LabourInspectionFormCreatePage', () => {
  it('ilma kirjutusõiguseta on keelatud', () => {
    h.perms = [];
    render(<LabourInspectionFormCreatePage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('renderdab vormi, vea ja salvestusnupu', () => {
    render(<LabourInspectionFormCreatePage />);
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('false');
    expect(screen.getByText('VIGA')).toBeTruthy();
    expect(screen.getByTestId('file-upload').getAttribute('data-disabled')).toBe('true');
    fireEvent.click(screen.getByText('common.save'));
    expect(h.submitForm).toHaveBeenCalled();
  });

  it('salvestamise järel navigeerib uue vormi lehele', () => {
    render(<LabourInspectionFormCreatePage />);
    h.onSaved!('12');
    expect(h.navigate).toHaveBeenCalledWith('/control-forms/labour-inspection/12', { state: { justCreated: true } });
  });
});
