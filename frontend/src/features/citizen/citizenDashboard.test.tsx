// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
  }),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

const api = vi.hoisted(() => ({
  searchCitizenForms: vi.fn(),
  searchMyProtocols: vi.fn(),
  getCompanyRiskScore: vi.fn(),
  getCompanyControlsBreakdown: vi.fn(),
}));
vi.mock('./api', () => api);

const auth = vi.hoisted(() => ({
  value: {
    user: null as null | Record<string, unknown>,
    fetchRepresentationCompanies: vi.fn(),
  },
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth.value }));

import { buildCitizenFormsColumns } from './citizenFormsColumns';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage/CitizenDashboardPage';
import { CompanyCard } from './pages/CitizenDashboardPage/CompanyCard';
import { CompanyControlsTable } from './pages/CitizenDashboardPage/CompanyControlsTable';
import { MyProtocolsTable } from './pages/CitizenDashboardPage/MyProtocolsTable';
import { CompanyFormsListPage } from './pages/CompanyFormsListPage/CompanyFormsListPage';
import type { CitizenFormRow, CompanyControlRow } from './types';

const row = (over: Partial<CitizenFormRow> = {}): CitizenFormRow => ({
  formType: 'compound',
  formKey: 3,
  compoundFormKey: null,
  formNumber: 'K-3',
  status: 'published',
  mainDate: '2026-03-31',
  county: null,
  vehicleRegNr: '123ABC',
  companyRegCode: '1',
  companyName: 'A',
  hasViolation: true,
  total: 2,
  ...over,
});

const control = (over: Partial<CompanyControlRow> = {}): CompanyControlRow => ({
  formKey: 4,
  formType: 'compound',
  formNumber: 'C-4',
  mainDate: null,
  vehicleRegNr: null,
  isFullyExcluded: false,
  msi: 1,
  vsi: 2,
  si: 3,
  mi: 4,
  weightedPoints: 9,
  ...over,
});

beforeEach(() => {
  navigate.mockReset();
  Object.values(api).forEach((f) => f.mockReset());
  auth.value = { user: null, fetchRepresentationCompanies: vi.fn().mockResolvedValue([]) };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Table({ rows }: { rows: CitizenFormRow[] }) {
  api.searchMyProtocols.mockResolvedValue({ content: rows, total: rows.length });
  return (
    <MemoryRouter>
      <MyProtocolsTable />
    </MemoryRouter>
  );
}

describe('citizen forms columns / MyProtocolsTable', () => {
  it('renders rows with labels, tags and detail navigation', async () => {
    render(
      <Table
        rows={[
          row(),
          row({ formKey: 4, formType: 'weird', mainDate: null, vehicleRegNr: null, hasViolation: false, formNumber: 'W-4' }),
          row({ formKey: 0, formType: 'good_repute', formNumber: 'G-0' }),
        ]}
      />,
    );
    await waitFor(() => expect(screen.getByText('K-3')).toBeTruthy());
    expect(screen.getByText('search.formType.compound')).toBeTruthy();
    expect(screen.getByText('weird')).toBeTruthy();
    expect(screen.getAllByText('citizen.formsList.yes')).toHaveLength(2);
    expect(screen.getByText('citizen.formsList.no')).toBeTruthy();
    const views = screen.getAllByText('citizen.formsList.view');
    expect(views).toHaveLength(1);
    fireEvent.click(views[0]);
    expect(navigate).toHaveBeenCalledWith('/my-companies/compound/3', { state: { from: 'citizen-app' } });
  });

  it('builds six columns', () => {
    expect(buildCitizenFormsColumns(((k: string) => k) as never, navigate)).toHaveLength(6);
  });
});

describe('CompanyControlsTable', () => {
  it('shows loading text', () => {
    render(
      <MemoryRouter>
        <CompanyControlsTable registryCode="1" controls={[]} isLoading />
      </MemoryRouter>,
    );
    expect(screen.getByText('common.loading')).toBeTruthy();
  });

  it('renders controls and navigates only for supported form types', () => {
    render(
      <MemoryRouter>
        <CompanyControlsTable
          registryCode="1"
          isLoading={false}
          controls={[
            control(),
            control({ formKey: 5, formType: 'tram_control_card', formNumber: 'T-5', mainDate: '2026-01-01', vehicleRegNr: 'ABC' }),
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('C-4')).toBeTruthy();
    expect(screen.getByText('T-5')).toBeTruthy();
    const views = screen.getAllByText('citizen.dashboard.controls.view');
    expect(views).toHaveLength(1);
    fireEvent.click(views[0]);
    expect(navigate).toHaveBeenCalledWith('/my-companies/compound/4', { state: { from: 'citizen-app' } });
  });
});

describe('CompanyCard', () => {
  it('loads risk score and controls and toggles the controls table', async () => {
    api.getCompanyRiskScore.mockResolvedValue({
      riskScore: 1,
      riskBandCode: 'Roheline',
      totalControls: 1,
      companyName: 'Firma',
      windowStart: '2025-01-01',
      windowEnd: '2026-01-01',
    });
    api.getCompanyControlsBreakdown.mockResolvedValue({ controls: [control()] });
    render(
      <MemoryRouter>
        <CompanyCard registryCode="123" companyName="Firma OÜ" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Firma OÜ')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('riskScores.bandRoheline')).toBeTruthy());
    expect(screen.getByText('Riskitase hinnatud ajavahemikus {{start}}–{{end}}')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('citizen.dashboard.company.totalControls')).toBeTruthy());
    fireEvent.click(screen.getByText('citizen.dashboard.company.viewControls'));
    expect(screen.getByText('C-4')).toBeTruthy();
    fireEvent.click(screen.getByText('citizen.dashboard.company.hideControls'));
    expect(screen.queryByText('C-4')).toBeNull();
  });

  it('survives failing requests', async () => {
    api.getCompanyRiskScore.mockRejectedValue(new Error('x'));
    api.getCompanyControlsBreakdown.mockRejectedValue(new Error('x'));
    render(
      <MemoryRouter>
        <CompanyCard registryCode="123" companyName="Firma OÜ" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('citizen.dashboard.company.totalControls')).toBeTruthy());
  });

  it('ignores responses after unmount', async () => {
    let resolveScore!: (v: unknown) => void;
    api.getCompanyRiskScore.mockReturnValue(new Promise((r) => (resolveScore = r)));
    api.getCompanyControlsBreakdown.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(
      <MemoryRouter>
        <CompanyCard registryCode="123" companyName="Firma OÜ" />
      </MemoryRouter>,
    );
    unmount();
    resolveScore({ riskBandCode: 'Hall', windowStart: null, windowEnd: null });
  });
});

describe('CitizenDashboardPage', () => {
  it('shows companies fetched on mount plus the protocols section', async () => {
    api.searchMyProtocols.mockResolvedValue({ content: [], total: 0 });
    api.getCompanyRiskScore.mockResolvedValue({ riskBandCode: 'Hall', windowStart: null, windowEnd: null });
    api.getCompanyControlsBreakdown.mockResolvedValue({ controls: [] });
    auth.value = {
      user: { representedCompanies: [] },
      fetchRepresentationCompanies: vi.fn().mockResolvedValue([{ registryCode: '1', companyName: 'Ettevõte 1' }]),
    };
    render(
      <MemoryRouter>
        <CitizenDashboardPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Ettevõte 1')).toBeTruthy());
    expect(screen.getByText('citizen.dashboard.companiesTitle')).toBeTruthy();
    expect(screen.getByText('citizen.dashboard.protocolsTitle')).toBeTruthy();
  });

  it('hides the companies section without represented companies', async () => {
    api.searchMyProtocols.mockResolvedValue({ content: [], total: 0 });
    const { unmount } = render(
      <MemoryRouter>
        <CitizenDashboardPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(auth.value.fetchRepresentationCompanies).toHaveBeenCalled());
    expect(screen.queryByText('citizen.dashboard.companiesTitle')).toBeNull();
    unmount();
  });
});

describe('CompanyFormsListPage', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <CompanyFormsListPage />
      </MemoryRouter>,
    );

  it('explains when the user has no companies', () => {
    api.searchCitizenForms.mockResolvedValue({ content: [], total: 0 });
    auth.value = { ...auth.value, user: { representedCompanies: [] } };
    renderPage();
    expect(screen.getByText('Teiega ei ole seotud ühtegi ettevõtet.')).toBeTruthy();
  });

  it('asks to select a company when no valid role is active', () => {
    api.searchCitizenForms.mockResolvedValue({ content: [], total: 0 });
    auth.value = {
      ...auth.value,
      user: { representedCompanies: [{ registryCode: '1', companyName: 'A' }], activeRole: 'officer' },
    };
    renderPage();
    expect(screen.getByText('Valige päisest ettevõte, mille andmeid soovite vaadata.')).toBeTruthy();
  });

  it('lists forms for an active company role', async () => {
    api.searchCitizenForms.mockResolvedValue({ content: [row()], total: 1 });
    auth.value = {
      ...auth.value,
      user: { representedCompanies: [{ registryCode: '1', companyName: 'A' }], activeRole: 'company' },
    };
    renderPage();
    await waitFor(() => expect(screen.getByText('K-3')).toBeTruthy());
  });

  it('treats a missing user as having no companies', () => {
    api.searchCitizenForms.mockResolvedValue({ content: [], total: 0 });
    auth.value = { ...auth.value, user: null };
    renderPage();
    expect(screen.getByText('Teiega ei ole seotud ühtegi ettevõtet.')).toBeTruthy();
  });
});
