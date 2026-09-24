// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RsiMessage } from '../../types';
import { useRsiForm } from './useRsiForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../api', () => ({ saveRsiMessage: vi.fn() }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: () => [],
    getErruMemberCountries: () => [],
  }),
}));

const baseMessage: RsiMessage = {
  id: '1',
  version: 1,
  direction: 'outgoing',
  status: 'initiated',
  businessCaseId: 'EE-RSI-2026-00001',
  technicalId: null,
  workflowId: null,
  sentAt: null,
  rsiFrom: 'EE',
  rsiTo: 'LV',
  originatingAuthority: 'KLIM',
  requestSource: null,
  requestPurpose: null,
  vehicleCategory: 'N3',
  vehicleRegistrationNumber: 'ABC123',
  vehicleRegistrationCountry: 'LV',
  vehicleIdentificationNumber: null,
  odometerReading: null,
  driverFirstName: 'Andres',
  driverFamilyName: 'Lepik',
  driverLicenceNumber: null,
  driverLicenceCountry: null,
  identificationDetails: {
    isVehicleHolder: 'transport_undertaking',
    transportUndertakingName: 'AS Rapla Piim',
    communityLicenceNumber: 'EE-CL-100998-01',
    address: {
      address: 'Tehnika 12',
      city: 'Rapla',
      country: 'EE',
      postCode: '79511',
    },
  },
  inspectionIdentifier: null,
  inspectionLocation: 'Tallinn',
  inspectionDatetime: null,
  inspectionAuthorityOrName: 'PPA',
  inspectionPassed: false,
  ptiRequested: false,
  vehicleProhibitionOrRestriction: false,
  checkedItems: [],
  responseStatusCode: null,
  responseStatusMessage: null,
  handlerPersonalCode: null,
  handlerName: null,
  errorMessage: null,
  createdAt: '2026-09-24T00:00:00Z',
  createdBy: 'TEST',
};

describe('useRsiForm optional-block open state', () => {
  // Regression test: RsiFormPage calls useRsiForm(message, ...) unconditionally, ahead
  // of its own "still loading" guard, so on first mount `message` is undefined while the
  // GET request is in flight. driverBlockOpen/identificationBlockOpen used to be plain
  // useState(() => !!message?.driverFirstName) initialisers, which only ever evaluate
  // once — with `message` still undefined — so a pre-filled draft's driver/veoettevõtja
  // data landed in the backend (via build.yml eeltäitmine) but the UI never opened the
  // blocks to show it. See docs/muudatused.md 2026-09-24.
  it('opens the driver and undertaking blocks once the message loads asynchronously', () => {
    const { result, rerender } = renderHook(
      ({ message }: { message?: RsiMessage }) => useRsiForm(message, vi.fn()),
      { initialProps: { message: undefined as RsiMessage | undefined } },
    );

    expect(result.current.driverBlockOpen).toBe(false);
    expect(result.current.identificationBlockOpen).toBe(false);

    rerender({ message: baseMessage });

    expect(result.current.driverBlockOpen).toBe(true);
    expect(result.current.identificationBlockOpen).toBe(true);
    expect(result.current.formik.values.driverFirstName).toBe('Andres');
    expect(
      result.current.formik.values.identification.transportUndertakingName,
    ).toBe('AS Rapla Piim');
  });

  it('does not reopen a block the user closed after a reload of the same message id', () => {
    const { result, rerender } = renderHook(
      ({ message }: { message: RsiMessage }) => useRsiForm(message, vi.fn()),
      { initialProps: { message: baseMessage } },
    );
    expect(result.current.driverBlockOpen).toBe(true);

    result.current.setDriverBlockOpen(false);
    rerender({ message: { ...baseMessage, version: 2 } }); // same id, e.g. after Save

    expect(result.current.driverBlockOpen).toBe(false);
  });

  it('opens a truly blank draft with both blocks closed', () => {
    const { result } = renderHook(() => useRsiForm(undefined, vi.fn()));
    expect(result.current.driverBlockOpen).toBe(false);
    expect(result.current.identificationBlockOpen).toBe(false);
  });
});
