// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  perms: ['good_repute_form.write'] as string[],
  onSaved: undefined as undefined | ((id?: string) => void),
  setFieldValue: vi.fn(),
  submitForm: vi.fn(),
  onPersonFound: undefined as undefined | ((p: object) => void),
  search: vi.fn(),
  setError: vi.fn(),
  setNotFound: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => h.perms.includes(p) }) }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: () => [
      { code: 'EE', name: 'Eesti', isValid: true },
      { code: 'XX', name: 'Vana', isValid: false },
    ],
  }),
  useClassifierScopeActive: vi.fn(),
}));
vi.mock('../../../xroad/hooks/usePersonSearch', () => ({
  usePersonSearch: (o: { onPersonFound: (p: object) => void }) => {
    h.onPersonFound = o.onPersonFound;
    return {
      searchByPersonalCode: h.search,
      loading: false,
      error: false,
      setError: h.setError,
      notFound: false,
      setNotFound: h.setNotFound,
    };
  },
}));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('./useGoodReputeForm', () => ({
  useGoodReputeForm: (_f: unknown, onSaved: (id?: string) => void) => {
    h.onSaved = onSaved;
    return {
      formik: {
        handleSubmit: vi.fn(),
        submitForm: h.submitForm,
        setFieldValue: h.setFieldValue,
        values: { personalCode: '39001010000' },
      },
      formError: 'VIGA',
    };
  },
}));
vi.mock('../../components/GoodRepute/GoodReputeFormFields', () => ({
  GoodReputeFormFields: (p: {
    onSearchPerson: () => void;
    onSearchErrorClose: () => void;
    onSearchNotFoundClose: () => void;
    countryOptions: unknown[];
  }) => (
    <div>
      <span data-testid="countries">{p.countryOptions.length}</span>
      <button onClick={p.onSearchPerson}>search-person</button>
      <button onClick={p.onSearchErrorClose}>close-error</button>
      <button onClick={p.onSearchNotFoundClose}>close-nf</button>
    </div>
  ),
}));
vi.mock('../../components/FormPrintButton/FormPrintButton', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));

import { GoodReputeFormCreatePage } from './GoodReputeFormCreatePage';

beforeEach(() => {
  vi.clearAllMocks();
  h.perms = ['good_repute_form.write'];
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GoodReputeFormCreatePage', () => {
  it('ilma kirjutusõiguseta on keelatud', () => {
    h.perms = [];
    render(<GoodReputeFormCreatePage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('renderdab vea, riikide valikud ja salvestusnupu', () => {
    render(<GoodReputeFormCreatePage />);
    expect(screen.getByText('VIGA')).toBeTruthy();
    expect(screen.getByTestId('countries').textContent).toBe('1');
    fireEvent.click(screen.getByText('common.save'));
    expect(h.submitForm).toHaveBeenCalled();
  });

  it('otsing, sulgemised ja isiku leidmine', () => {
    render(<GoodReputeFormCreatePage />);
    fireEvent.click(screen.getByText('search-person'));
    expect(h.search).toHaveBeenCalledWith('39001010000');
    fireEvent.click(screen.getByText('close-error'));
    fireEvent.click(screen.getByText('close-nf'));
    expect(h.setError).toHaveBeenCalledWith(false);
    expect(h.setNotFound).toHaveBeenCalledWith(false);
    h.onPersonFound!({ firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01' });
    expect(h.setFieldValue).toHaveBeenCalledWith('dateOfBirth', '1990-01-01');
    h.setFieldValue.mockClear();
    h.onPersonFound!({ firstName: 'A', lastName: 'B' });
    expect(h.setFieldValue).toHaveBeenCalledTimes(2);
  });

  it('salvestamise järel navigeerib vormi lehele', () => {
    render(<GoodReputeFormCreatePage />);
    h.onSaved!('42');
    expect(h.navigate).toHaveBeenCalledWith('/control-forms/good-repute/42', { state: { justCreated: true } });
  });
});
