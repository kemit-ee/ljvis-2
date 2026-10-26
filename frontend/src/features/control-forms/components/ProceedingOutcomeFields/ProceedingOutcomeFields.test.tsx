// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProceedingOutcomeFields } from './ProceedingOutcomeFields';

const perms = new Set<string>();
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => perms.has(p) }) }));

describe('ProceedingOutcomeFields', () => {
  beforeEach(() => perms.clear());
  afterEach(cleanup);

  it('peidab väljad enne kinnitamist', () => {
    const { container } = render(<ProceedingOutcomeFields status="saved" onChange={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('kinnitatud vorm ilma õiguseta on loetav', () => {
    render(<ProceedingOutcomeFields status="confirmed" enforcementDecision="otsus" onChange={vi.fn()} />);
    const ta = document.getElementById('enforcementDecision') as HTMLTextAreaElement;
    expect(ta.disabled).toBe(true);
    expect(ta.value).toBe('otsus');
    expect((document.getElementById('proceedingClosureBasis') as HTMLTextAreaElement).value).toBe('');
  });

  it('avaldatud vorm on alati lukus', () => {
    perms.add('control_form.punishment_register');
    render(<ProceedingOutcomeFields status="published" onChange={vi.fn()} />);
    expect((document.getElementById('enforcementDecision') as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('õigusega kinnitatud vormis saab muuta', () => {
    perms.add('control_form.punishment_register');
    const onChange = vi.fn();
    render(<ProceedingOutcomeFields status="confirmed" onChange={onChange} titleKey="x.title" />);
    expect(screen.getByText('x.title')).toBeTruthy();
    fireEvent.change(document.getElementById('enforcementDecision')!, { target: { value: 'a' } });
    fireEvent.change(document.getElementById('proceedingClosureBasis')!, { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('enforcementDecision', 'a');
    expect(onChange).toHaveBeenCalledWith('proceedingClosureBasis', 'b');
  });
});
