// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CgrMemberState, CgrRequest } from '../../types';
import { CgrMemberStatesTable } from './CgrMemberStatesTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getValue: (_: string, code: string) => ({ name: code }),
  }),
}));

const states: CgrMemberState[] = [
  { memberStateCode: 'AT', statusCode: 'NotFound' },
  { memberStateCode: 'LV', statusCode: 'Timeout' },
  {
    memberStateCode: 'CZ',
    statusCode: 'Found',
    transportManagerDetails: {
      respondingAuthority: 'MDCR',
      searchMethod: 'Phonetic',
      nameDetails: { firstName: 'Leah', familyName: 'Brauer', dateOfBirth: '1931-05-06', placeOfBirth: 'København K' },
    },
  },
  { memberStateCode: 'GR', statusCode: 'NotAvailable' },
] as CgrMemberState[];

const request = { status: 'responded', memberStates: states } as CgrRequest;

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

describe('CgrMemberStatesTable', () => {
  it('lists found countries first, then not found, then failed, without collapsing the found details', () => {
    const { container } = render(<CgrMemberStatesTable request={request} canSend={false} />);

    const order = [...container.querySelectorAll('[id^="cgr-member-state-"]')].map((el) => el.id);
    expect(order).toEqual([
      'cgr-member-state-CZ',
      'cgr-member-state-AT',
      'cgr-member-state-LV',
      'cgr-member-state-GR',
    ]);
    // found details are rendered up front, no click needed
    expect(screen.getByText('Leah')).toBeTruthy();
    expect(screen.getByText('Brauer')).toBeTruthy();
  });

  it('offers a resend button for every country when sending is allowed', () => {
    const onResend = vi.fn();
    render(<CgrMemberStatesTable request={request} canSend onResend={onResend} />);

    const buttons = screen.getAllByText('erru.cgr.form.resend');
    expect(buttons).toHaveLength(4);
    fireEvent.click(buttons[1]);
    expect(onResend).toHaveBeenCalledWith('AT');
  });
});
