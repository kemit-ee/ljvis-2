// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubFormTab } from './SubFormTab';
import type { SubFormHandle } from '../../hooks/useSubForm';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const handle = (over: Partial<SubFormHandle<{ a: number }>>) =>
  ({ form: null, loaded: true, editActive: false, editCardRef: { current: null }, ...over }) as SubFormHandle<{ a: number }>;

describe('SubFormTab', () => {
  afterEach(cleanup);
  const view = (f: { a: number }) => <div>view {f.a}</div>;
  const edit = (f: { a: number }) => <div>edit {JSON.stringify(f)}</div>;

  it('ei renderda suletud sakki', () => {
    const { container } = render(<SubFormTab id="x" open={false} subForm={handle({})} renderView={view} renderEdit={edit} />);
    expect(container.innerHTML).toBe('');
  });
  it('näitab laadimist', () => {
    render(<SubFormTab id="x" open subForm={handle({ loaded: false })} renderView={view} renderEdit={edit} />);
    expect(screen.getByText('common.loading')).toBeTruthy();
  });
  it('näitab vaatekaarti, kui vorm on olemas ja muutmine pole aktiivne', () => {
    render(<SubFormTab id="x" open subForm={handle({ form: { a: 1 } })} renderView={view} renderEdit={edit} />);
    expect(screen.getByText('view 1')).toBeTruthy();
  });
  it('näitab muutmiskaarti vormiga ja ilma', () => {
    const { rerender } = render(
      <SubFormTab id="x" open subForm={handle({ form: { a: 1 }, editActive: true })} renderView={view} renderEdit={edit} />,
    );
    expect(screen.getByText('edit {"a":1}')).toBeTruthy();
    rerender(<SubFormTab id="x" open subForm={handle({})} renderView={view} renderEdit={edit} />);
    expect(screen.getByText('edit {}')).toBeTruthy();
  });
});
