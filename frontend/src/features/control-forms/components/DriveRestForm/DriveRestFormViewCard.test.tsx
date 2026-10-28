// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  perms: [] as string[],
  outcome: vi.fn(),
  values: {} as Record<string, unknown>,
  hookArgs: undefined as undefined | unknown[],
  ncr: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasAnyPermission: (ps: string[]) => ps.some((p) => h.perms.includes(p)) }),
}));
vi.mock('../../api', () => ({ saveProceedingOutcome: h.outcome }));
vi.mock('../../pages/drive-rest-form/useDriveRestForm', () => ({
  useDriveRestForm: (...args: unknown[]) => {
    h.hookArgs = args;
    return {
      formik: { values: h.values },
      cargoCabotageViolations: [],
      passengerCabotageViolations: [],
      transportClasses: [],
      docRightChecks: [],
      docRightOtherDocs: [],
      tachographTypes: [],
      drivingViolations: [],
      drivingViolationsMain: [],
      rooma1Violations: [],
      postingViolations: [],
      massDimensions: [],
    };
  },
}));
vi.mock('./DriveRestFormFields', () => ({
  DriveRestFormFields: (p: { readOnly: boolean; hideDriveRestExtras?: boolean }) => (
    <div data-testid="fields" data-readonly={String(p.readOnly)} data-hide={String(!!p.hideDriveRestExtras)} />
  ),
}));
vi.mock('../FormVersionsTable/FormVersionsTable.tsx', async () => ({
  FormVersionsTable: (await import('../../testing/commonStubs')).FormVersionsTableStub,
}));
vi.mock('../FormPrintButton/FormPrintButton', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));
vi.mock('../../../erru/components/Ncr/NcrBuildModal', () => ({
  NcrBuildModal: (p: { open: boolean; onClose: () => void }) => {
    h.ncr(p);
    return p.open ? <button onClick={p.onClose}>ncr-close</button> : null;
  },
}));

import { DriveRestFormViewCard } from './DriveRestFormViewCard';

const form = { id: '5', subFormNumber: 'SP-1', compoundFormKey: 7 } as never;

beforeEach(() => {
  vi.clearAllMocks();
  h.perms = [];
  h.values = {};
  h.outcome.mockResolvedValue([]);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DriveRestFormViewCard', () => {
  it('renderdab pealkirja, kirjutuskaitstud väljad ja versioonid', () => {
    render(<DriveRestFormViewCard scope="driver" form={form} formType="sp-driver" snapshotId="9" hideDriveRestExtras />);
    expect(screen.getByText('SP-1')).toBeTruthy();
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('true');
    expect(screen.getByTestId('fields').getAttribute('data-hide')).toBe('true');
    expect(screen.getByTestId('versions-table')).toBeTruthy();
    expect(screen.getByTestId('print-button').getAttribute('data-snapshot')).toBe('9');
    expect(screen.queryByText('erru.ncr.buildModal.button')).toBeNull();
    expect(h.hookArgs![3]).toBe(7);
  });

  it('vorm ilma id ja ühendatud võtmeta', () => {
    render(<DriveRestFormViewCard scope="teammate" form={{ subFormNumber: 'X' } as never} formType="sp-teammate" />);
    expect(screen.queryByTestId('versions-table')).toBeNull();
    expect(h.hookArgs![3]).toBeUndefined();
  });

  it('NCR nupp avab ja sulgeb modaali', () => {
    h.perms = ['ncr.create'];
    render(<DriveRestFormViewCard scope="driver" form={form} formType="sp-driver" />);
    fireEvent.click(screen.getByText('erru.ncr.buildModal.button'));
    fireEvent.click(screen.getByText('ncr-close'));
    expect(h.ncr).toHaveBeenCalled();
  });

  it('avalikustab ilma menetluseta', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<DriveRestFormViewCard scope="driver" form={form} formType="sp-driver" canPublish onPublish={onPublish} />);
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(h.outcome).not.toHaveBeenCalled();
  });

  it('avalikustab menetlusega: salvestab tulemuse enne', async () => {
    h.values = { proceedingReferenceNumber: 'M-1', enforcementDecision: 'otsus', proceedingClosureBasis: 'alus' };
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<DriveRestFormViewCard scope="teammate" form={form} formType="sp-teammate" canPublish onPublish={onPublish} />);
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(h.outcome).toHaveBeenCalledWith('sp_teammate', '5', 'otsus', 'alus');
  });

  it('menetlus ilma tulemuseta peidab avalikustamise nupu', () => {
    h.values = { proceedingReferenceNumber: 'M-1' };
    render(<DriveRestFormViewCard scope="driver" form={form} formType="sp-driver" canPublish onPublish={vi.fn()} />);
    expect(screen.queryByText('common.publish')).toBeNull();
  });
});
