// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ClassifierProvider,
  ClassifierScopeProvider,
  useClassifierScopeActive,
  useClassifiers,
} from './ClassifierProvider';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { activeRole: 'officer' } }),
}));
vi.mock('../classifier-values/api', () => ({
  listClassifierValues: vi.fn().mockResolvedValue([
    { classifierValueKey: 1, classifierCode: 'TT', code: 'ALL', name: 'Kõigile', parentKey: null, formTypes: [] },
    { classifierValueKey: 2, classifierCode: 'TT', code: 'TI', name: 'Ainult TI', parentKey: null, formTypes: ['TI_KONTROLLKAART'] },
    { classifierValueKey: 3, classifierCode: 'TT', code: 'SP', name: 'Ainult autojuht', parentKey: null, formTypes: ['SP_DRIVER_FORM'] },
  ]),
}));

function Probe({ id }: { id: string }) {
  const { getByCode, getValue } = useClassifiers();
  return (
    <div>
      <span data-testid={`${id}-codes`}>{getByCode('TT').map((v) => v.code).join(',')}</span>
      <span data-testid={`${id}-label`}>{getValue('TT', 'SP')?.name ?? ''}</span>
    </div>
  );
}

/** Nagu vormileht: teatab oma muutmisrežiimi lähimale skoobile. */
function PageProbe({ id, editActive }: { id: string; editActive: boolean }) {
  useClassifierScopeActive(editActive);
  return <Probe id={id} />;
}

const codes = (id: string) => screen.getByTestId(`${id}-codes`).textContent;

describe('ClassifierScopeProvider (ADR-011)', () => {
  afterEach(cleanup);

  it('ilma skoobita on kõik väärtused nähtavad', async () => {
    render(
      <ClassifierProvider>
        <Probe id="p" />
      </ClassifierProvider>,
    );
    await waitFor(() => expect(codes('p')).toBe('ALL,TI,SP'));
  });

  it('vaaterežiimis (aktiveerimata) filtrit ei rakendata', async () => {
    render(
      <ClassifierProvider>
        <ClassifierScopeProvider formType="TI_KONTROLLKAART">
          <PageProbe id="p" editActive={false} />
        </ClassifierScopeProvider>
      </ClassifierProvider>,
    );
    await waitFor(() => expect(codes('p')).toBe('ALL,TI,SP'));
  });

  it('muutmisrežiimis on ainult vormile lubatud valikud, sildid jäävad alles', async () => {
    render(
      <ClassifierProvider>
        <ClassifierScopeProvider formType="TI_KONTROLLKAART">
          <PageProbe id="p" editActive />
        </ClassifierScopeProvider>
      </ClassifierProvider>,
    );
    await waitFor(() => expect(codes('p')).toBe('ALL,TI'));
    expect(screen.getByTestId('p-label').textContent).toBe('Ainult autojuht');
  });

  it('pesastatud skoop filtreerib filtreerimata nimekirjast (alamvorm koondvormi sees)', async () => {
    render(
      <ClassifierProvider>
        <ClassifierScopeProvider formType="SP_COMPOUND" active>
          <Probe id="outer" />
          <ClassifierScopeProvider formType="SP_DRIVER_FORM" active>
            <Probe id="inner" />
          </ClassifierScopeProvider>
        </ClassifierScopeProvider>
      </ClassifierProvider>,
    );
    await waitFor(() => expect(codes('outer')).toBe('ALL'));
    expect(codes('inner')).toBe('ALL,SP');
  });
});
