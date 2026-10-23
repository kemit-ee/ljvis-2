// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubFormEditPublishButton } from './SubFormEditPublishButton';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('SubFormEditPublishButton', () => {
  afterEach(cleanup);
  const form = { id: 1, status: 'confirmed' };

  it.each([
    ['õigus puudub', { form, canPublish: false, onPublish: vi.fn() }],
    ['onPublish puudub', { form, canPublish: true }],
    ['vorm pole kinnitatud', { form: { id: 1, status: 'saved' }, canPublish: true, onPublish: vi.fn() }],
    ['menetlus olemas', { form: { ...form, proceedingType: 'misdemeanor' }, canPublish: true, onPublish: vi.fn() }],
  ])('peidab nupu: %s', (_n, props) => {
    const { container } = render(<SubFormEditPublishButton isDirty={() => false} {...props} />);
    expect(container.innerHTML).toBe('');
  });

  it('avalikustab puhta vormi', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<SubFormEditPublishButton form={form} canPublish onPublish={onPublish} isDirty={() => false} />);
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hoiatab salvestamata muudatuste korral ja lubab hoiatuse sulgeda', async () => {
    const onPublish = vi.fn();
    render(<SubFormEditPublishButton form={form} canPublish onPublish={onPublish} isDirty={() => true} />);
    fireEvent.click(screen.getByText('common.publish'));
    await waitFor(() => expect(screen.getByText('forms.publishUnsavedChanges')).toBeTruthy());
    expect(onPublish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('alert-close'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
