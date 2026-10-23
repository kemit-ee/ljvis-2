// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

const auth = vi.hoisted(() => ({
  value: {
    user: null as null | Record<string, unknown>,
    hasPermission: (() => false) as (p: string) => boolean,
  },
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth.value }));

const dash = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('./useDashboard.ts', () => ({ useDashboard: () => dash.value }));

import { DesktopPage } from './DesktopPage';

const form = (labelKey: string, route: string, hasParent: boolean, typeParam?: string) => ({
  labelKey,
  route,
  hasParent,
  typeParam,
});

const summary = {
  scope: 'own',
  canSeeOrganisation: false,
  needsAttention: [],
  activeCompoundForms: [
    {
      compoundFormKey: 11,
      formNumber: 'K-1',
      status: 'saved',
      controlDate: '2026-03-31',
      controlTime: '10:00',
      vehicleRegNr: '123ABC',
      companyName: 'Firma OÜ',
      inspectorName: 'I',
      driverName: 'Juhan',
      subForms: [
        { formType: 'sp_driver', formKey: 5, formNumber: 'D-5', status: 'published', proceedingType: null },
        { formType: 'adr', formKey: 6, formNumber: 'A-6', status: 'saved', proceedingType: null },
        { formType: 'nope', formKey: 7, formNumber: 'N-7', status: 'saved', proceedingType: null },
      ],
    },
    {
      compoundFormKey: 12,
      formNumber: 'K-2',
      status: 'confirmed',
      controlDate: '2026-04-01',
      controlTime: '11:00',
      vehicleRegNr: null,
      companyName: null,
      inspectorName: null,
      driverName: null,
      subForms: [],
    },
    {
      compoundFormKey: 13,
      formNumber: 'K-3',
      status: 'saved',
      controlDate: '2026-04-02',
      controlTime: '12:00',
      vehicleRegNr: null,
      companyName: 'Ainult OÜ',
      inspectorName: null,
      driverName: null,
      subForms: [],
    },
  ],
  activeStandaloneForms: [
    { formType: 'good_repute', formKey: 9, formNumber: 'G-9', status: 'saved', mainDate: '2026-03-30', mainTime: null, vehicleRegNr: null },
    { formType: 'unknown', formKey: 1, formNumber: 'U-1', status: 'saved', mainDate: '2026-03-30', mainTime: '09:00', vehicleRegNr: 'X' },
  ],
};

function setup(over: Record<string, unknown> = {}, perms: string[] = ['control_form.view_unpublished']) {
  auth.value = {
    user: { firstname: 'Mari', lastname: 'Maasikas', organisationname: 'Amet' },
    hasPermission: (p: string) => perms.includes(p),
  };
  dash.value = {
    loading: false,
    availableForms: [
      form('forms.compound_form', '/compound', false),
      form('forms.sp_driver_form', '/sp-driver', true, 'driver'),
      form('forms.adr_form', '/adr', true, 'adr'),
      form('forms.good_repute_form', '/good-repute', false),
    ],
    scope: 'own',
    setScope: vi.fn(),
    canSeeOrganisation: false,
    canSeeUnit: false,
    summary,
    summaryLoading: false,
    summaryError: false,
    refetch: vi.fn(),
    overdueCompoundKeys: new Set<number>([11]),
    overdueSubFormKeys: new Set<string>(['adr-6']),
    ...over,
  };
  return render(
    <MemoryRouter>
      <DesktopPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DesktopPage', () => {
  it('shows loading state', () => {
    setup({ loading: true });
    expect(screen.getByText('common.loading')).toBeTruthy();
  });

  it('renders user info, tables and navigates from rows', () => {
    setup();
    expect(screen.getByText('Mari Maasikas · Amet')).toBeTruthy();
    expect(screen.getByText('Juhan')).toBeTruthy();
    expect(screen.getByText('Firma OÜ')).toBeTruthy();
    expect(screen.getByText('Ainult OÜ')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('31.03.2026')).toBeTruthy();

    // compound row click
    fireEvent.click(screen.getByText('K-1'));
    expect(navigate).toHaveBeenCalledWith('/control-forms/compound/11');

    // sub-form row: click and keyboard
    const rows = screen.getAllByRole('button').filter((el) => el.textContent?.includes('D-5'));
    fireEvent.click(rows[0]);
    expect(navigate).toHaveBeenCalledWith('/control-forms/sp-driver/5');
    fireEvent.keyDown(rows[0], { key: 'Enter' });
    fireEvent.keyDown(rows[0], { key: ' ' });
    fireEvent.keyDown(rows[0], { key: 'a' });
    const unknown = screen.getAllByRole('button').find((el) => el.textContent?.includes('N-7'))!;
    navigate.mockClear();
    fireEvent.click(unknown);
    expect(navigate).not.toHaveBeenCalled();

    // standalone row + continue buttons
    fireEvent.click(screen.getByText('G-9'));
    expect(navigate).toHaveBeenCalledWith('/control-forms/good-repute/9');
    const continues = screen.getAllByText('dashboard.actions.continue');
    continues.forEach((b) => fireEvent.click(b));

    fireEvent.click(screen.getByText('dashboard.actions.viewAllSearch'));
    expect(navigate).toHaveBeenCalledWith('/search');
  });

  it('starts a compound form only after selecting sub-forms', () => {
    setup();
    const fill = screen.getAllByText('dashboard.actions.fill')[0].closest('button')!;
    expect(fill.disabled).toBe(true);
    fireEvent.click(fill);
    expect(navigate).not.toHaveBeenCalled();

    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getAllByText('dashboard.actions.fill')[0]);
    expect(navigate).toHaveBeenCalledWith('/control-forms/compound/new?types=driver');
  });

  it('starts a standalone form', () => {
    setup();
    fireEvent.click(screen.getAllByText('dashboard.actions.fill')[1]);
    expect(navigate).toHaveBeenCalledWith('/control-forms/good-repute/new');
  });

  it('starts a compound form without sub-form choices', () => {
    setup({
      availableForms: [form('forms.compound_form', '/compound', false)],
    });
    fireEvent.click(screen.getByText('dashboard.actions.fill'));
    expect(navigate).toHaveBeenCalledWith('/control-forms/compound/new');
  });

  it('hides form blocks and the standalone table without rights', () => {
    setup({ availableForms: [] }, []);
    expect(screen.queryByText('dashboard.sections.compoundBlock')).toBeNull();
    expect(screen.queryByText('dashboard.sections.activeStandalone')).toBeNull();
  });

  it('shows only the standalone block when there is no compound form', () => {
    setup({ availableForms: [form('forms.good_repute_form', '/good-repute', false)] }, ['good_repute_form.read']);
    expect(screen.queryByText('dashboard.sections.compoundBlock')).toBeNull();
    expect(screen.getByText('dashboard.sections.formsBlock')).toBeTruthy();
    expect(screen.getByText('dashboard.sections.activeStandalone')).toBeTruthy();
  });

  it('renders scope toggle and changes scope', () => {
    const setScope = vi.fn();
    setup({ canSeeOrganisation: true, canSeeUnit: true, setScope });
    fireEvent.click(screen.getByLabelText('dashboard.scope.organisation'));
    expect(setScope).toHaveBeenCalledWith('organisation');
    fireEvent.click(screen.getByLabelText('dashboard.scope.unit'));
    expect(setScope).toHaveBeenCalledWith('unit');
  });

  it('renders only own+org options when unit is not allowed', () => {
    setup({ canSeeOrganisation: true });
    expect(screen.queryByLabelText('dashboard.scope.unit')).toBeNull();
    expect(screen.getByLabelText('dashboard.scope.own')).toBeTruthy();
  });

  it('shows an error with retry', () => {
    const refetch = vi.fn();
    setup({ summaryError: true, refetch });
    fireEvent.click(screen.getByText('common.retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('works without a signed-in user', () => {
    setup();
    auth.value = { user: null, hasPermission: () => false };
    cleanup();
    render(
      <MemoryRouter>
        <DesktopPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Mari Maasikas · Amet')).toBeNull();
  });
});
