// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotifyCarrierCheckbox } from './NotifyCarrierCheckbox';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('NotifyCarrierCheckbox', () => {
  afterEach(cleanup);
  it('annab märke muutuse edasi', () => {
    const onChange = vi.fn();
    const { rerender } = render(<NotifyCarrierCheckbox checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('forms.notifyCarrierOnConfirm'));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<NotifyCarrierCheckbox checked onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('forms.notifyCarrierOnConfirm'));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
