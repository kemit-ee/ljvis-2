// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listCtudRequests: vi.fn(),
  listCgrRequests: vi.fn(),
  listNcrCases: vi.fn(),
  listRsiMessages: vi.fn(),
  listNuMessages: vi.fn(),
}));
vi.mock('../api', () => api);

import { useCgrList } from './cgr/useCgrList';
import { useCtudList } from './ctud/useCtudList';
import { useNcrList } from './ncr/useNcrList';
import { useNuList } from './nu/useNuList';
import { useRsiList } from './rsi/useRsiList';

describe.each([
  ['useCtudList', useCtudList, api.listCtudRequests],
  ['useCgrList', useCgrList, api.listCgrRequests],
  ['useNcrList', useNcrList, api.listNcrCases],
  ['useRsiList', useRsiList, api.listRsiMessages],
  ['useNuList', useNuList, api.listNuMessages],
] as const)('%s', (_name, hook, listFn) => {
  beforeEach(() => {
    listFn.mockReset();
    listFn.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });
  });

  it('loads the first page through the matching list endpoint', async () => {
    renderHook(() => hook());
    await waitFor(() => expect(listFn).toHaveBeenCalled());
  });
});
