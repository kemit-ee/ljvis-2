// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddressFields, type AddressFieldsValue } from './AddressFields';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../classifiers/ClassifierProvider.tsx', () => ({
  useClassifiers: () => ({
    getChildren: (_c: string, parent: number) => [{ classifierValueKey: parent * 10, name: `Linn${parent}` }],
  }),
}));

const base: AddressFieldsValue = { countryCode: 'EE', county: '1', city: '', street: '', postalCode: '' };
const counties = [{ id: 1, name: 'Harju' }, { id: 2, name: 'Tartu' }];
const sel = (id: string) => document.getElementById(id) as HTMLSelectElement;

describe('AddressFields', () => {
  afterEach(cleanup);

  it('Eesti: maakond ja linn on rippmenüüd, muutused nullivad sõltuvad väljad', () => {
    const onChange = vi.fn();
    render(<AddressFields value={{ ...base, city: '10' }} onChange={onChange} counties={counties} />);
    fireEvent.change(sel('addressCountryCode'), { target: { value: 'FI' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...base, city: '', county: '', countryCode: 'FI' });
    fireEvent.change(sel('addressCounty'), { target: { value: '2' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...base, county: '2', city: '' });
    fireEvent.change(sel('addressCity'), { target: { value: '10' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...base, city: '10' });
    fireEvent.change(sel('addressCity'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...base, city: '' });
    fireEvent.change(sel('addressCountryCode'), { target: { value: '' } });
    fireEvent.change(sel('addressCounty'), { target: { value: '' } });
  });

  it('tänav ja sihtnumber', () => {
    const onChange = vi.fn();
    render(<AddressFields value={base} onChange={onChange} counties={counties} />);
    fireEvent.change(document.getElementById('addressStreet')!, { target: { value: 'Tee 1' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...base, street: 'Tee 1' });
    fireEvent.change(document.getElementById('addressPostalCode')!, { target: { value: '12345' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...base, postalCode: '12345' });
  });

  it('linna valik on keelatud ilma maakonnata', () => {
    render(<AddressFields value={{ ...base, county: '' }} onChange={vi.fn()} counties={counties} />);
    expect(sel('addressCity').disabled).toBe(true);
  });

  it('välisriik: maakond ja linn on tekstiväljad', () => {
    const onChange = vi.fn();
    const v = { ...base, countryCode: 'FI', county: 'X' };
    render(<AddressFields value={v} onChange={onChange} counties={counties} />);
    fireEvent.change(document.getElementById('addressCounty')!, { target: { value: 'Y' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...v, county: 'Y' });
    fireEvent.change(document.getElementById('addressCity')!, { target: { value: 'Z' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...v, city: 'Z' });
  });

  it('kuvab vead (Eesti ja välisriik) ning disabled-oleku', () => {
    const errors = { countryCode: 'e1', county: 'e2', city: 'e3', street: 'e4', postalCode: 'e5' };
    const { unmount } = render(<AddressFields value={base} onChange={vi.fn()} counties={counties} errors={errors} disabled />);
    expect(screen.getAllByTestId('helper')).toHaveLength(5);
    unmount();
    render(<AddressFields value={{ ...base, countryCode: 'FI' }} onChange={vi.fn()} counties={counties} errors={errors} />);
    expect(screen.getAllByTestId('helper')).toHaveLength(5);
  });
});
