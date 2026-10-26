// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useFormik } from 'formik';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClassifierInfoCard } from './ClassifierInfoCard/ClassifierInfoCard';
import { ClassifierInfoEditCard } from './ClassifierInfoCard/ClassifierInfoEditCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

describe('ClassifierInfoCard', () => {
  const classifier = { id: '1', code: 'C', name: 'Nimi', description: '' };

  it('kuvab andmed ja kriipsu tühja kirjelduse asemel', () => {
    render(<ClassifierInfoCard classifier={classifier} canEditClassifier={false} onEdit={vi.fn()} />);
    expect(screen.getByText('Nimi')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText('users.edit')).toBeNull();
  });

  it('muutmisnupp nähtav õigusega', () => {
    const onEdit = vi.fn();
    render(<ClassifierInfoCard classifier={{ ...classifier, description: 'Kirj' }} canEditClassifier onEdit={onEdit} />);
    expect(screen.getByText('Kirj')).toBeTruthy();
    fireEvent.click(screen.getByText('users.edit'));
    expect(onEdit).toHaveBeenCalled();
  });
});

function EditHarness({ isDesktop, touched }: { isDesktop: boolean; touched?: boolean }) {
  const formik = useFormik({
    initialValues: { id: '1', name: 'Vana', description: 'Kirj' },
    initialErrors: touched ? { name: 'Nimi viga', description: 'Kirj viga' } : {},
    initialTouched: touched ? { name: true, description: true } : {},
    onSubmit: () => {},
  });
  return (
    <ClassifierInfoEditCard
      formik={formik}
      isDesktop={isDesktop}
      handleSaveClick={() => document.body.setAttribute('data-saved', '1')}
      onCancel={() => document.body.setAttribute('data-cancelled', '1')}
    />
  );
}

describe('ClassifierInfoEditCard', () => {
  it('muudab välju, salvestab ja tühistab', () => {
    render(<EditHarness isDesktop />);
    const name = document.getElementById('name') as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Uus' } });
    expect(name.value).toBe('Uus');
    fireEvent.change(document.getElementById('description')!, { target: { value: 'Uus kirj' } });
    fireEvent.click(screen.getByText('classifiers.save'));
    expect(document.body.getAttribute('data-saved')).toBe('1');
    fireEvent.click(screen.getByText('classifiers.cancel'));
    expect(document.body.getAttribute('data-cancelled')).toBe('1');
  });

  it('mobiilivaade ja vead', () => {
    render(<EditHarness isDesktop={false} touched />);
    expect(screen.getByText('Nimi viga')).toBeTruthy();
    expect(screen.getByText('Kirj viga')).toBeTruthy();
  });
});
