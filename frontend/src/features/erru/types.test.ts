import { describe, expect, it } from 'vitest';
import {
  isCgrEditable,
  isCgrSendable,
  isCtudEditable,
  isCtudSendable,
  isNcrRequestEditable,
  isNcrRequestSendable,
  isNcrResponseEditable,
  isNcrResponseSendable,
  isNuEditable,
  isNuSendable,
  isRsiEditable,
  isRsiSendable,
} from './types';

const o = (status: string) => ({ direction: 'outgoing', status }) as never;
const i = (status: string) => ({ direction: 'incoming', status }) as never;

describe.each([
  ['ctud', isCtudEditable, isCtudSendable, true],
  ['cgr', isCgrEditable, isCgrSendable, true],
  ['rsi', isRsiEditable, isRsiSendable, false],
  ['nu', isNuEditable, isNuSendable, false],
  ['ncr request', isNcrRequestEditable, isNcrRequestSendable, true],
] as const)('%s lifecycle guards', (_n, editable, sendable, retryOnError) => {
  it('is editable only as an outgoing draft', () => {
    expect(editable(o('initiated'))).toBe(true);
    expect(editable(o('sent'))).toBe(false);
    expect(editable(i('initiated'))).toBe(false);
  });
  it('is sendable from a draft, and after an error only where retry is allowed', () => {
    expect(sendable(o('initiated'))).toBe(true);
    expect(sendable(o('error'))).toBe(retryOnError);
    expect(sendable(o('sent'))).toBe(false);
    expect(sendable(i('initiated'))).toBe(false);
  });
});

describe('ncr response lifecycle guards', () => {
  it('is editable while viewed or drafted', () => {
    expect(isNcrResponseEditable(i('viewed'))).toBe(true);
    expect(isNcrResponseEditable(i('answer_drafted'))).toBe(true);
    expect(isNcrResponseEditable(i('responded'))).toBe(false);
    expect(isNcrResponseEditable(o('viewed'))).toBe(false);
  });
  it('is sendable from a draft or after an error', () => {
    expect(isNcrResponseSendable(i('answer_drafted'))).toBe(true);
    expect(isNcrResponseSendable(i('error'))).toBe(true);
    expect(isNcrResponseSendable(i('viewed'))).toBe(false);
    expect(isNcrResponseSendable(o('error'))).toBe(false);
  });
});
