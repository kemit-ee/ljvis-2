// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  clearLastLoadFailure,
  del,
  get,
  getLastLoadFailure,
  post,
  postSilent,
  put,
  setGlobalErrorListener,
  setUnauthorizedHandler,
} from './client';

function mockFetch(status: number, body: unknown, jsonFails = false) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => (jsonFails ? Promise.reject(new Error('bad')) : Promise.resolve(body)),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  clearLastLoadFailure();
});

afterEach(() => {
  vi.unstubAllGlobals();
  setGlobalErrorListener(undefined);
  setUnauthorizedHandler(undefined);
});

describe('get', () => {
  it('returns response and filters empty params', async () => {
    const fetchFn = mockFetch(200, { response: { a: 1 } });
    const res = await get('/x', { q: 'v', e: '', u: 'undefined' });
    expect(res).toEqual({ a: 1 });
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe('/api/x');
    expect(url.searchParams.get('q')).toBe('v');
    expect(url.searchParams.has('e')).toBe(false);
    expect(url.searchParams.has('u')).toBe(false);
  });

  it('records the failure and notifies the global listener', async () => {
    mockFetch(500, { response: 'oops' });
    const listener = vi.fn();
    setGlobalErrorListener(listener);
    await expect(get('/x')).rejects.toBeInstanceOf(ApiError);
    expect(getLastLoadFailure()).toMatchObject({ status: 500, path: '/x' });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('calls the unauthorized handler on 401 instead of the listener', async () => {
    mockFetch(401, null, true);
    const listener = vi.fn();
    const unauth = vi.fn();
    setGlobalErrorListener(listener);
    setUnauthorizedHandler(unauth);
    await expect(get('/x')).rejects.toMatchObject({ status: 401 });
    expect(unauth).toHaveBeenCalledOnce();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('post / put / postSilent', () => {
  it('serialises undefined body values as null', async () => {
    const fetchFn = mockFetch(200, { response: 'ok' });
    await post('/p', { a: undefined, b: 1 });
    expect(fetchFn.mock.calls[0][1].method).toBe('POST');
    expect(fetchFn.mock.calls[0][1].body).toBe('{"a":null,"b":1}');
    await put('/p', { a: 2 });
    expect(fetchFn.mock.calls[1][1].method).toBe('PUT');
    expect(await postSilent('/p', { a: 3 })).toBe('ok');
  });

  it('post/put notify on failure, postSilent does not', async () => {
    mockFetch(422, { response: { code: 'x' } });
    const listener = vi.fn();
    setGlobalErrorListener(listener);
    await expect(post('/p', {})).rejects.toMatchObject({ status: 422, body: { code: 'x' } });
    await expect(put('/p', {})).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(2);
    await expect(postSilent('/p', {})).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('del', () => {
  it('sends DELETE with params and returns response', async () => {
    const fetchFn = mockFetch(200, { response: 1 });
    expect(await del('/d', { id: '5', empty: '' })).toBe(1);
    expect(fetchFn.mock.calls[0][1].method).toBe('DELETE');
    expect(fetchFn.mock.calls[0][0]).toContain('id=5');
  });

  it('throws ApiError on failure', async () => {
    mockFetch(404, null, true);
    await expect(del('/d')).rejects.toMatchObject({ status: 404 });
  });
});
