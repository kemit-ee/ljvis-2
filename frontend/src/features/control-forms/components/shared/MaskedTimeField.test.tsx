// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MaskedTimeField } from './MaskedTimeField';

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);

describe('MaskedTimeField', () => {
  afterEach(cleanup);
  it('lisab koolon sisestamise ajal', () => {
    const onChange = vi.fn();
    const { container } = render(<MaskedTimeField id="t" label="l" onChange={onChange} />);
    fireEvent.change(container.querySelector('#t')!, { target: { value: '1200' } });
    expect(onChange).toHaveBeenCalledWith('12:00');
  });
  it('talub puuduvat onChange-i', () => {
    const { container } = render(<MaskedTimeField id="t" label="l" />);
    fireEvent.change(container.querySelector('#t')!, { target: { value: '12' } });
  });
});
