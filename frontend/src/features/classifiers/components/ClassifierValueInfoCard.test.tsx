// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useFormik } from 'formik';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClassifierValueInfoCard } from './ClassifierValueInfoCard/ClassifierValueInfoCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: () => [
      { classifierValueKey: 1, classifierCode: 'FORM_TYPE', code: 'TI_KONTROLLKAART', name: 'TI', parentKey: null },
      { classifierValueKey: 2, classifierCode: 'FORM_TYPE', code: 'SP_DRIVER_FORM', name: 'SP juht', parentKey: null },
      { classifierValueKey: 3, classifierCode: 'FORM_TYPE', code: 'TI_ALAM', name: 'TI alam', parentKey: 1 },
    ],
  }),
}));
vi.mock('../../control-forms/components/shared/MaskedDateField.tsx', () => ({
  MaskedDateField: ({
    id,
    onSelect,
    inputProps,
  }: {
    id: string;
    onSelect: (d: Date) => void;
    inputProps?: { helper?: { text: string } };
  }) => (
    <div>
      <input data-testid={id} onChange={(e) => onSelect(new Date(e.target.value))} />
      {inputProps?.helper && <span>{inputProps.helper.text}</span>}
    </div>
  ),
}));

// TEDI vajab matchMedia'd, mida jsdom ei paku.
window.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

afterEach(cleanup);

function Harness({ isEdit, isDesktop, withErrors }: { isEdit: boolean; isDesktop: boolean; withErrors?: boolean }) {
  const formik = useFormik({
    initialValues: {
      id: '',
      code: 'C1',
      name: 'N1',
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      formTypes: ['TI_KONTROLLKAART'],
    },
    initialErrors: withErrors
      ? { code: 'Kood viga', name: 'Nimi viga', validFrom: 'Algus viga', validUntil: 'Lõpp viga' }
      : {},
    initialTouched: withErrors ? { code: true, name: true, validFrom: true, validUntil: true } : {},
    onSubmit: () => {},
  });
  return (
    <>
      <ClassifierValueInfoCard
        formik={formik}
        isDesktop={isDesktop}
        isEdit={isEdit}
        handleSaveClick={() => document.body.setAttribute('data-saved', '1')}
        onCancel={() => document.body.setAttribute('data-cancelled', '1')}
      />
      <span data-testid="values">{JSON.stringify(formik.values)}</span>
    </>
  );
}

describe('ClassifierValueInfoCard', () => {
  it('lisamisrežiim: väljad on muudetavad, kuupäevad uuenevad', () => {
    render(<Harness isEdit={false} isDesktop />);
    const code = document.getElementById('code') as HTMLInputElement;
    expect(code.disabled).toBe(false);
    fireEvent.change(code, { target: { value: 'UUS' } });
    fireEvent.change(document.getElementById('name')!, { target: { value: 'Uus nimi' } });
    fireEvent.change(screen.getByTestId('validFrom'), { target: { value: '2026-02-03' } });
    fireEvent.change(screen.getByTestId('validUntil'), { target: { value: '2026-03-04' } });
    const values = JSON.parse(screen.getByTestId('values').textContent!);
    expect(values).toMatchObject({ code: 'UUS', name: 'Uus nimi', validFrom: '2026-02-03', validUntil: '2026-03-04' });
  });

  it('muutmisrežiimis kood ja nimi on lukus; nupud töötavad', () => {
    render(<Harness isEdit isDesktop={false} />);
    expect((document.getElementById('code') as HTMLInputElement).disabled).toBe(true);
    expect((document.getElementById('name') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('classifiers.save'));
    expect(document.body.getAttribute('data-saved')).toBe('1');
    fireEvent.click(screen.getByText('classifiers.cancel'));
    expect(document.body.getAttribute('data-cancelled')).toBe('1');
  });

  it('kuvab valideerimisvead', () => {
    render(<Harness isEdit={false} isDesktop withErrors />);
    for (const msg of ['Kood viga', 'Nimi viga', 'Algus viga', 'Lõpp viga']) {
      expect(screen.getByText(msg)).toBeTruthy();
    }
  });

  it('vormipiirangu valik uuendab formTypes välja (sorteeritult)', () => {
    render(<Harness isEdit={false} isDesktop />);
    const input = document.getElementById('formTypes') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    const values = JSON.parse(screen.getByTestId('values').textContent!);
    expect(values.formTypes.length).toBeGreaterThan(1);
    expect([...values.formTypes].sort()).toEqual(values.formTypes);
  });
});
