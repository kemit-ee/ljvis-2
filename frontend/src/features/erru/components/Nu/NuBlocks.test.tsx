// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../classifiers/useClassifierLabel', () => ({
  useClassifierLabel: () => ({ label: (_c: string, v: string | null) => (v ? `L:${v}` : '') }),
}));

import { DetailRow } from '../shared/DetailRow';
import { ErruDirection } from '../shared/ErruDirection';
import { NuIdentityBlocks } from './NuIdentityBlocks';
import { NuInfoBlock } from './NuInfoBlock';
import { NuMemberStatesTable } from './NuMemberStatesTable';
import { NuVersionsTable } from './NuVersionsTable';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});
afterEach(cleanup);

describe('shared detail components', () => {
  it('DetailRow shows a dash for empty values', () => {
    render(
      <>
        <DetailRow label="A" value="x" />
        <DetailRow label="B" value="" />
        <DetailRow label="C" value={null} />
      </>,
    );
    expect(screen.getByText('x')).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('ErruDirection renders its text for both directions', () => {
    const { rerender } = render(<ErruDirection direction="outgoing">Väljaminev</ErruDirection>);
    expect(screen.getByText('Väljaminev')).toBeTruthy();
    rerender(<ErruDirection direction={null}>Sissetulev</ErruDirection>);
    expect(screen.getByText('Sissetulev')).toBeTruthy();
  });
});

describe('NU blocks', () => {
  it('NuInfoBlock lists fields with a dash fallback', () => {
    render(<NuInfoBlock title="T" fields={[{ label: 'a', value: 'v' }, { label: 'b', value: null }]} />);
    expect(screen.getByText('T')).toBeTruthy();
    expect(screen.getByText('v')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('NuIdentityBlocks shows name and certificate blocks', () => {
    render(
      <NuIdentityBlocks
        identity={{
          firstName: 'Jaan',
          lastName: 'Tamm',
          dateOfBirth: '1980-01-02',
          placeOfBirth: 'Tallinn',
          certificateNumber: 'C1',
          certificateIssueDate: '2020-03-04',
          certificateIssueCountry: 'LV',
        }}
      />,
    );
    expect(screen.getByText('Jaan')).toBeTruthy();
    expect(screen.getByText('L:LV')).toBeTruthy();
    expect(screen.getByText('erru.nu.form.certificateBlock')).toBeTruthy();
  });

  it('NuMemberStatesTable renders rows, and nothing when empty', () => {
    const { container, rerender } = render(
      <NuMemberStatesTable
        message={{ memberStates: [{ memberStateCode: 'LV', respondingAuthority: 'A', statusCode: 'OK' }] } as never}
      />,
    );
    expect(screen.getByText('L:LV')).toBeTruthy();
    expect(screen.getByText('L:OK')).toBeTruthy();
    rerender(<NuMemberStatesTable message={{ memberStates: [] } as never} />);
    expect(container.textContent).toBe('');
    rerender(<NuMemberStatesTable message={{} as never} />);
    expect(container.textContent).toBe('');
  });

  it('NuVersionsTable links each snapshot to its message', () => {
    const { container } = render(
      <MemoryRouter>
        <NuVersionsTable
          messageId="7"
          snapshots={[{ snapshotId: '3', version: 1, status: 'sent', createdAt: '2024-01-01T10:00:00Z', createdBy: 'x' } as never]}
        />
      </MemoryRouter>,
    );
    expect(container.querySelector('a[href="/erru/nu/7?snapshotId=3"]')).toBeTruthy();
    expect(screen.getByText('L:sent')).toBeTruthy();
  });
});
