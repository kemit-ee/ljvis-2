// @vitest-environment jsdom
import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { exerciseAll } from '../../testing/exercise';

const api = vi.hoisted(() => ({ searchNuSources: vi.fn() }));
vi.mock('../../api', () => api);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }) }));
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testing/tediMock')).tediMock());
vi.mock('../../../control-forms/components/shared/MaskedDateField.tsx', async () =>
  (await import('../../testing/tediMock')).maskedFieldMock(),
);
vi.mock('../../../control-forms/components/shared/MaskedDateField', async () =>
  (await import('../../testing/tediMock')).maskedFieldMock(),
);
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const list = [{ code: 'EE', name: 'Eesti' }, { code: 'LV', name: 'Läti' }];
  const stable = { getByCode: () => list, getErruMemberCountries: () => list };
  return { useClassifiers: () => stable };
});

import { useNuForm } from '../../pages/nu/useNuForm';
import { NuMessageFields } from './NuMessageFields';
import { NuSourcePicker } from './NuSourcePicker';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
});
beforeEach(() => api.searchNuSources.mockReset());
afterEach(cleanup);

let formRef: ReturnType<typeof useNuForm>;
function Harness({ id }: { id?: string }) {
  const form = useNuForm(undefined, 'K1', vi.fn());
  useEffect(() => {
    formRef = form;
  });
  return <NuMessageFields form={form} businessCaseId={id} />;
}

describe('NuMessageFields', () => {
  it('writes typed text into the form values', () => {
    render(<Harness id="BC-1" />);
    fireEvent.change(screen.getByLabelText('erru.nu.form.tmFirstName'), { target: { value: 'Jaan' } });
    expect(formRef.formik.values.tmFirstName).toBe('Jaan');
  });

  it('drives every control and shows validation errors', async () => {
    render(<Harness id="BC-1" />);
    exerciseAll();
    await act(async () => {
      await formRef.formik.setValues({ ...formRef.formik.values, primaryElement: 'certificate', unfitStartDate: '', originatingAuthority: '' });
    });
    await act(async () => {
      await formRef.formik.submitForm();
    });
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  });

  it('renders without a case id', () => {
    render(<Harness />);
    expect(screen.queryByText('BC-1')).toBeNull();
  });
});

describe('NuSourcePicker', () => {
  const ids: Record<string, string> = {
    'erru.nu.form.tmFirstName': 'nu-source-first-name',
    'erru.nu.form.tmFamilyName': 'nu-source-last-name',
    'erru.nu.form.tmDateOfBirth': 'nu-source-date-of-birth',
    'erru.nu.form.certificateNumber': 'nu-source-certificate-number',
  };
  const fill = (label: string, value: string) =>
    fireEvent.change(document.getElementById(ids[label])!, { target: { value } });

  it('keeps search disabled until a complete criterion is given', () => {
    render(<NuSourcePicker onSelect={vi.fn()} />);
    const button = screen.getByText('common.search').closest('button')!;
    expect(button.disabled).toBe(true);
    fill('erru.nu.form.certificateNumber', 'C1');
    expect(button.disabled).toBe(false);
  });

  it('searches by name+date and selects a candidate', async () => {
    const onSelect = vi.fn();
    const candidate = { id: '1', snapshotId: '2', firstName: 'Jaan', lastName: 'Tamm', dateOfBirth: '1980-01-02', certificateNumber: null };
    api.searchNuSources.mockResolvedValue({ content: [candidate] });
    render(<NuSourcePicker onSelect={onSelect} />);
    fill('erru.nu.form.tmFirstName', 'Jaan');
    fill('erru.nu.form.tmFamilyName', 'Tamm');
    fill('erru.nu.form.tmDateOfBirth', '1980-01-02');
    await act(async () => fireEvent.click(screen.getByText('common.search')));
    await waitFor(() => expect(screen.getByText('common.select')).toBeTruthy());
    expect(api.searchNuSources).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Jaan', dateOfBirth: '1980-01-02' }));
    fireEvent.click(screen.getByText('common.select'));
    expect(onSelect).toHaveBeenCalledWith(candidate);
    fill('erru.nu.form.tmDateOfBirth', '');
  });

  it('reports an empty result and a failed search', async () => {
    api.searchNuSources.mockResolvedValueOnce({ content: [] }).mockRejectedValueOnce(new Error('x'));
    render(<NuSourcePicker onSelect={vi.fn()} />);
    fill('erru.nu.form.certificateNumber', 'C1');
    await act(async () => fireEvent.click(screen.getByText('common.search')));
    await waitFor(() => expect(screen.getByText('erru.nu.source.noResults')).toBeTruthy());
    await act(async () => fireEvent.click(screen.getByText('common.search')));
    await waitFor(() => expect(screen.getByText('erru.nu.source.searchFailed')).toBeTruthy());
  });
});
