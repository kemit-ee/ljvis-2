import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, put } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../../shared/api/client', () => ({ get, post, put }));

import * as api from './api';

const params = { page: '0', pageSize: '10', sorting: 'a desc', search: '' } as never;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
});

describe.each([
  ['listCtudRequests', '/v1/erru/ctud/search', true],
  ['listCgrRequests', '/v1/erru/cgr/search', true],
  ['listRsiMessages', '/v1/erru/rsi/search', false],
  ['listNcrCases', '/v1/erru/ncr/list/search', false],
] as const)('%s', (name, path, hasSearch) => {
  const fn = (api as unknown as Record<string, (p: unknown, f?: unknown) => Promise<unknown>>)[name];

  it('sends paging and only non-empty filters', async () => {
    get.mockResolvedValue({ content: [] });
    await fn(params, { a: 'x', b: '' });
    expect(get).toHaveBeenCalledWith(path, { page: '0', pageSize: '10', sorting: 'a desc', a: 'x' });
  });

  it('maps search onto businessCaseId only where supported', async () => {
    get.mockResolvedValue({ content: [] });
    await fn({ ...(params as object), search: 'BC-1' });
    const query = get.mock.calls[0][1];
    expect(query.businessCaseId).toBe(hasSearch ? 'BC-1' : undefined);
  });
});

describe('CTUD', () => {
  it('get/create/update/send', async () => {
    await api.getCtudRequest('1');
    expect(get).toHaveBeenCalledWith('/v1/erru/ctud', { q: '1' });
    await api.createCtudRequest({ a: 1 } as never);
    expect(post).toHaveBeenCalledWith('/v1/erru/ctud', { a: 1 });
    await api.updateCtudRequest('1', { a: 1 } as never);
    expect(put).toHaveBeenCalledWith('/v1/erru/ctud', { id: '1', a: 1 });
    await api.sendCtudRequest('1');
    expect(post).toHaveBeenCalledWith('/v1/erru/ctud/send', { id: '1' });
  });
});

describe('CGR', () => {
  it('get/create/update/send/resend', async () => {
    await api.getCgrRequest('1');
    expect(get).toHaveBeenCalledWith('/v1/erru/cgr/get', { q: '1' });
    await api.createCgrRequest({ a: 1 } as never);
    expect(post).toHaveBeenCalledWith('/v1/erru/cgr/draft/create', { a: 1 });
    await api.updateCgrRequest('1', { a: 1 } as never);
    expect(put).toHaveBeenCalledWith('/v1/erru/cgr/draft/revise', { id: '1', a: 1 });
    await api.sendCgrRequest('1');
    expect(post).toHaveBeenCalledWith('/v1/erru/cgr/send', { id: '1' });
    await api.resendCgrRequest('1', 'LV');
    expect(post).toHaveBeenCalledWith('/v1/erru/cgr/resend', { id: '1', memberStateCode: 'LV' });
  });
});

describe('RSI', () => {
  it('get/print/save/build/send', async () => {
    await api.getRsiMessage('1');
    expect(get).toHaveBeenCalledWith('/v1/erru/rsi/get', { q: '1' });
    await api.printRsiMessage('1');
    expect(post).toHaveBeenCalledWith('/v1/erru/rsi/print', { id: '1' });
    await api.saveRsiMessage('1', { a: 1 } as never);
    expect(post).toHaveBeenCalledWith('/v1/erru/rsi/request/save', { id: '1', a: 1 });
    await api.buildRsiMessageFromTechnicalCard('9', 'trailer');
    expect(post).toHaveBeenCalledWith('/v1/erru/rsi/request/build', {
      vehicleTechnicalFormId: '9',
      technicalFormType: 'trailer',
    });
    await api.sendRsiMessage('1');
    expect(post).toHaveBeenCalledWith('/v1/erru/rsi/send', { id: '1' });
  });
});

describe('NCR', () => {
  it('get/save/build/send', async () => {
    await api.getNcrCase('B1');
    expect(get).toHaveBeenCalledWith('/v1/erru/ncr/get', { q: 'B1' });
    await api.saveNcrRequest({ a: 1 } as never);
    expect(post).toHaveBeenCalledWith('/v1/erru/ncr/request/save', { a: 1 });
    await api.saveNcrResponse({ a: 1 } as never);
    expect(post).toHaveBeenCalledWith('/v1/erru/ncr/response/save', { a: 1 });
    await api.buildNcrRequest({ a: 1 } as never);
    expect(post).toHaveBeenCalledWith('/v1/erru/ncr/request/build', { a: 1 });
    await api.sendNcrRequest('B1');
    expect(post).toHaveBeenCalledWith('/v1/erru/ncr/send', { businessCaseId: 'B1' });
    await api.sendNcrResponse('B1');
    expect(post).toHaveBeenCalledWith('/v1/erru/ncr/response-send', { businessCaseId: 'B1' });
  });
});

describe('NU', () => {
  it('getNuMessage passes the snapshot id and parses string payloads', async () => {
    get.mockResolvedValueOnce(JSON.stringify({ id: 1 }));
    expect(await api.getNuMessage('1', '5')).toEqual({ id: 1 });
    expect(get).toHaveBeenCalledWith('/v1/erru/nu/get', { q: '1', snapshotId: '5' });
    get.mockResolvedValueOnce({ id: 2 });
    expect(await api.getNuMessage('2')).toEqual({ id: 2 });
    expect(get).toHaveBeenLastCalledWith('/v1/erru/nu/get', { q: '2' });
  });

  it('listNuMessages drops empty filters and parses strings', async () => {
    get.mockResolvedValue(JSON.stringify({ content: [] }));
    expect(await api.listNuMessages(params, { a: 'x', b: '' } as never)).toEqual({ content: [] });
    expect(get).toHaveBeenCalledWith('/v1/erru/nu/list/search', {
      page: '0',
      pageSize: '10',
      sorting: 'a desc',
      a: 'x',
    });
    get.mockResolvedValue({ content: [1] });
    expect(await api.listNuMessages(params)).toEqual({ content: [1] });
  });

  it('searchNuSources stringifies ids and rejects malformed payloads', async () => {
    get.mockResolvedValueOnce({ content: [{ id: 1, snapshotId: 2 }] });
    expect(await api.searchNuSources({ firstName: 'A', lastName: '' })).toEqual({
      content: [{ id: '1', snapshotId: '2' }],
    });
    expect(get).toHaveBeenCalledWith('/v1/erru/nu/source/search', { firstName: 'A' });
    get.mockResolvedValueOnce({});
    await expect(api.searchNuSources({})).rejects.toThrow('Invalid NU source search response');
    get.mockResolvedValueOnce(JSON.stringify({ content: [] }));
    expect(await api.searchNuSources({})).toEqual({ content: [] });
  });

  it('getNuSource stringifies ids', async () => {
    get.mockResolvedValue({ id: 3, snapshotId: 4, x: 1 });
    expect(await api.getNuSource('k')).toEqual({ id: '3', snapshotId: '4', x: 1 });
    expect(get).toHaveBeenCalledWith('/v1/erru/nu/source/get', { q: 'k' });
  });

  it('saveNuMessage normalises ids and requires an id in the response', async () => {
    post.mockResolvedValueOnce({ id: 7, version: 1 });
    expect(
      await api.saveNuMessage({ id: 7, sourceSnapshotId: 8, sourceGoodReputeFormKey: 9, expectedVersion: 2 } as never),
    ).toEqual({ id: '7', version: 1 });
    expect(post).toHaveBeenCalledWith('/v1/erru/nu/request/save', {
      id: '7',
      sourceSnapshotId: '8',
      sourceGoodReputeFormKey: '9',
      expectedVersion: 2,
    });
    post.mockResolvedValueOnce({ id: 1 });
    await api.saveNuMessage({} as never);
    expect(post.mock.calls[1][1]).toMatchObject({
      id: undefined,
      sourceSnapshotId: undefined,
      sourceGoodReputeFormKey: undefined,
    });
    post.mockResolvedValueOnce(JSON.stringify({}));
    await expect(api.saveNuMessage({} as never)).rejects.toThrow('Invalid NU save response');
  });

  it('sendNuMessage posts the stringified id', async () => {
    post.mockResolvedValue(JSON.stringify({ status: 'sent' }));
    expect(await api.sendNuMessage('5', 3)).toEqual({ status: 'sent' });
    expect(post).toHaveBeenCalledWith('/v1/erru/nu/send', { id: '5', expectedVersion: 3 });
  });
});
