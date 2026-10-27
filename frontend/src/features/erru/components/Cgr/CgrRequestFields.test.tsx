// @vitest-environment jsdom
import { useEffect } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { exerciseAll } from '../../testing/exercise';

vi.mock('../../api', () => ({}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testing/tediMock')).tediMock());
vi.mock('../../../control-forms/components/shared/MaskedDateField.tsx', async () =>
  (await import('../../testing/tediMock')).maskedFieldMock(),
);
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const list = [{ code: 'EE', name: 'Eesti' }, { code: 'LV', name: 'Läti' }];
  const stable = { getByCode: () => list, getErruMemberCountries: () => list };
  return { useClassifiers: () => stable };
});

import { useCgrForm } from '../../pages/cgr/useCgrForm';
import { CgrRequestFields } from './CgrRequestFields';

let formRef: ReturnType<typeof useCgrForm>;
function Harness({ id }: { id?: string }) {
  const form = useCgrForm(undefined, vi.fn());
  useEffect(() => {
    formRef = form;
  });
  return <CgrRequestFields form={form} businessCaseId={id} />;
}

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
});
afterEach(cleanup);

describe('CgrRequestFields', () => {
  it('renders the three blocks with the case id', () => {
    render(<Harness id="BC-1" />);
    expect(screen.getByText('BC-1')).toBeTruthy();
    expect(screen.getByText('erru.cgr.form.nameBlock')).toBeTruthy();
  });

  it('updates every field and shows validation errors after submit', async () => {
    render(<Harness />);
    exerciseAll();
    await act(async () => {
      await formRef.formik.setValues({ ...formRef.formik.values, originatingAuthority: '', requestPurpose: '', tmFirstName: 'x', certificateNumber: 'y' });
    });
    await act(async () => {
      await formRef.formik.submitForm();
    });
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  });
});
