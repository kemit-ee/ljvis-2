// @vitest-environment jsdom
import { useEffect } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { exerciseAll } from '../../testing/exercise';

vi.mock('../../api', () => ({ saveRsiMessage: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testing/tediMock')).tediMock());
vi.mock('../../../control-forms/components/shared/MaskedDateField', async () =>
  (await import('../../testing/tediMock')).maskedFieldMock(),
);
vi.mock('../../../control-forms/components/shared/MaskedTimeField', async () =>
  (await import('../../testing/tediMock')).maskedFieldMock(),
);
vi.mock('../../../organisations/hooks', () => {
  const organisations = [{ code: 'KLIM', name: 'Kliimaministeerium' }];
  return { useOrganisations: () => ({ organisations, loading: false }) };
});
vi.mock('./RsiCheckedItemsTable', () => ({
  RsiCheckedItemsTable: ({ onChange }: { onChange: (items: unknown[]) => void }) => (
    <button type="button" onClick={() => onChange([])}>
      items-table
    </button>
  ),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const list = [{ code: 'EE', name: 'Eesti' }, { code: 'LV', name: 'Läti' }, { code: 'N3', name: 'N3' }];
  const stable = { getByCode: () => list, getErruMemberCountries: () => list };
  return { useClassifiers: () => stable };
});

import { useRsiForm } from '../../pages/rsi/useRsiForm';
import { RsiMessageFields } from './RsiMessageFields';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
});
afterEach(cleanup);

let formRef: ReturnType<typeof useRsiForm>;
function Harness({ message }: { message?: never }) {
  const form = useRsiForm(message, vi.fn());
  useEffect(() => {
    formRef = form;
  });
  return <RsiMessageFields form={form} />;
}

const message = {
  id: 1,
  version: 1,
  businessCaseId: 'EE-RSI-1',
  vehicleRegistrationCountry: 'LV',
  driverFirstName: 'Andres',
  identificationDetails: { isVehicleHolder: 'transport_undertaking', transportUndertakingName: 'TU' },
  checkedItems: [],
} as never;

describe('RsiMessageFields', () => {
  it('renders a blank draft with both optional blocks closed', () => {
    render(<Harness />);
    expect(screen.getByText('erru.rsi.form.driverBlock')).toBeTruthy();
    expect(screen.queryByText('erru.rsi.form.driverFirstName')).toBeNull();
  });

  it('opens the optional blocks and drives every control', async () => {
    render(<Harness message={message} />);
    for (let i = 0; i < 4; i++) exerciseAll();
    await act(async () => screen.getByText('items-table').click());
    await act(async () => {
      await formRef.formik.setFieldValue('vehicleRegistrationNumber', '');
    });
    await act(async () => {
      await formRef.formik.submitForm();
    });
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  }, 30000);

  it('shows the owner branches (company and natural person)', async () => {
    render(<Harness message={message} />);
    await act(async () => {
      await formRef.formik.setFieldValue('identification.isVehicleHolder', 'owner');
      await formRef.formik.setFieldValue('identification.isNaturalPerson', 'company');
    });
    exerciseAll();
    await act(async () => {
      await formRef.formik.setFieldValue('identification.isNaturalPerson', 'natural_person');
    });
    exerciseAll();
    expect(document.querySelectorAll('input').length).toBeGreaterThan(5);
  });
});
