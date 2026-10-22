// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ErruStatusBadge, erruResponseColor, erruStatusColor } from './ErruStatusBadge';

beforeAll(() => {
  // TEDI's breakpoint hook needs matchMedia, which jsdom does not provide.
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList;
});

afterEach(cleanup);

describe('erruStatusColor', () => {
  it('maps lifecycle statuses of every ERRU family to one colour scheme', () => {
    expect(erruStatusColor('initiated')).toBe('neutral');
    expect(erruStatusColor('sending')).toBe('warning');
    expect(erruStatusColor('sent')).toBe('warning');
    expect(erruStatusColor('responded')).toBe('success');
    expect(erruStatusColor('answered')).toBe('success');
    expect(erruStatusColor('received')).toBe('brand');
    expect(erruStatusColor('viewed')).toBe('brand');
    expect(erruStatusColor('send_unknown')).toBe('warning');
    expect(erruStatusColor('error')).toBe('danger');
    expect(erruStatusColor('something_new')).toBe('neutral');
  });
});

describe('erruResponseColor', () => {
  it('colours single-country response outcomes', () => {
    expect(erruResponseColor('Found')).toBe('success');
    expect(erruResponseColor('OK')).toBe('success');
    expect(erruResponseColor('NotFound')).toBe('warning');
    expect(erruResponseColor('Timeout')).toBe('danger');
    expect(erruResponseColor('NotAvailable')).toBe('danger');
    expect(erruResponseColor(null)).toBe('neutral');
  });
});

describe('ErruStatusBadge', () => {
  it('shows the response outcome as a second badge only when present', () => {
    const { rerender } = render(
      <ErruStatusBadge status="responded" response={{ code: 'Timeout', label: 'Ei vastanud' }}>
        Vastus saadud
      </ErruStatusBadge>,
    );
    expect(screen.getByText('Vastus saadud')).toBeTruthy();
    expect(screen.getByText('Ei vastanud')).toBeTruthy();

    rerender(<ErruStatusBadge status="sent">Päring saadetud</ErruStatusBadge>);
    expect(screen.queryByText('Ei vastanud')).toBeNull();
  });
});
