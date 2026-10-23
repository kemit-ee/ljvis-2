// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  perms: ['tram_driver_form.write'] as string[],
  onSaved: undefined as undefined | ((id?: string) => void),
  handleSubmit: vi.fn(),
  submitCount: 0,
  isValid: true,
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => h.perms.includes(p) }) }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({ useClassifierScopeActive: vi.fn() }));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('./useTramControlCard', () => ({
  useTramControlCard: (_f: unknown, onSaved: (id?: string) => void) => {
    h.onSaved = onSaved;
    return {
      formik: { handleSubmit: h.handleSubmit, submitCount: h.submitCount, isValid: h.isValid, isSubmitting: false },
      structureUnits: [],
      orgOptions: [],
      roads: [],
      trailerCategories: [],
      vehicleCategories: [],
      counties: [],
      citiesParishes: [],
      companyCitiesParishes: [],
    };
  },
}));
vi.mock('../../components/CompoundForm/CompoundFormEditCard', () => ({
  CompoundFormEditCard: (p: { onCancel: () => void }) => <button onClick={p.onCancel}>edit-card-cancel</button>,
}));
vi.mock('../../components/DriveRestForm/DriveRestFormFields', () => ({
  DriveRestFormFields: (p: { readOnly: boolean }) => <div data-testid="dr-fields" data-readonly={String(p.readOnly)} />,
}));
vi.mock('../../components/FormPrintButton/FormPrintButton.tsx', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));

import { TramControlCardCreatePage } from './TramControlCardCreatePage';

beforeEach(() => {
  vi.clearAllMocks();
  h.perms = ['tram_driver_form.write'];
  h.submitCount = 0;
  h.isValid = true;
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TramControlCardCreatePage', () => {
  it('ilma kirjutusõiguseta on keelatud', () => {
    h.perms = [];
    render(<TramControlCardCreatePage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('renderdab vormi; tühistamine ja salvestamine', () => {
    render(<TramControlCardCreatePage />);
    expect(screen.getByTestId('dr-fields').getAttribute('data-readonly')).toBe('false');
    fireEvent.click(screen.getByText('edit-card-cancel'));
    expect(h.navigate).toHaveBeenCalledWith('/');
    fireEvent.click(screen.getByText('common.save'));
    expect(h.handleSubmit).toHaveBeenCalled();
  });

  it('kehtetu vorm pärast salvestamiskatset näitab veateadet', () => {
    h.submitCount = 1;
    h.isValid = false;
    render(<TramControlCardCreatePage />);
    expect(screen.getByText('forms.validationErrorNote')).toBeTruthy();
  });

  it('salvestamise järel navigeerib uue kaardi lehele', () => {
    render(<TramControlCardCreatePage />);
    h.onSaved!('12');
    expect(h.navigate).toHaveBeenCalledWith('/control-forms/tram-control-card/12', { state: { justCreated: true } });
  });
});
