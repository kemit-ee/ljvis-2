// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  perms: ['foreign_violation_form.write'] as string[],
  onSaved: undefined as undefined | ((id?: string) => void),
  submitForm: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => h.perms.includes(p) }) }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({ useClassifierScopeActive: vi.fn() }));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('./useForeignViolationForm', () => ({
  useForeignViolationForm: (_f: unknown, onSaved: (id?: string) => void) => {
    h.onSaved = onSaved;
    return { formik: { handleSubmit: vi.fn(), submitForm: h.submitForm } };
  },
}));
vi.mock('../../components/ForeignViolationForm/ForeignViolationFormFields', () => ({
  ForeignViolationFormFields: (p: { readOnly: boolean }) => <div data-testid="fields" data-readonly={String(p.readOnly)} />,
}));
vi.mock('../../components/FormPrintButton/FormPrintButton', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));

import { ForeignViolationFormCreatePage } from './ForeignViolationFormCreatePage';

beforeEach(() => {
  vi.clearAllMocks();
  h.perms = ['foreign_violation_form.write'];
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ForeignViolationFormCreatePage', () => {
  it('ilma kirjutusõiguseta on keelatud', () => {
    h.perms = [];
    render(<ForeignViolationFormCreatePage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('renderdab vormi ja salvestab', () => {
    render(<ForeignViolationFormCreatePage />);
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('false');
    fireEvent.click(screen.getByText('common.save'));
    expect(h.submitForm).toHaveBeenCalled();
  });

  it('salvestamise järel navigeerib uue vormi lehele', () => {
    render(<ForeignViolationFormCreatePage />);
    h.onSaved!('12');
    expect(h.navigate).toHaveBeenCalledWith('/control-forms/foreign-violation/12', { state: { justCreated: true } });
  });
});
