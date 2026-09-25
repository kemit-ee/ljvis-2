import { describe, expect, it } from 'vitest';
import {
  canPublishWithProceedingOutcome,
  canManuallyPublish,
  hasProceeding,
  hasProceedingOutcome,
} from './proceedingOutcome';

describe('proceeding outcome publication gate', () => {
  it('allows a form without a selected proceeding', () => {
    expect(canPublishWithProceedingOutcome({ proceedingType: 'none' })).toBe(true);
  });

  it('blocks a selected proceeding without an outcome', () => {
    expect(canPublishWithProceedingOutcome({ proceedingType: 'general' })).toBe(false);
  });

  it('accepts either an enforcement decision or a closure basis', () => {
    expect(canPublishWithProceedingOutcome({ proceedingType: 'general', enforcementDecision: 'Jõustunud' })).toBe(true);
    expect(canPublishWithProceedingOutcome({ proceedingReferenceNumber: '123', proceedingClosureBasis: 'Lõpetatud' })).toBe(true);
  });

  it('ignores whitespace-only values', () => {
    const form = { proceedingReferenceNumber: ' 123 ', enforcementDecision: ' ', proceedingClosureBasis: ' ' };
    expect(hasProceeding(form)).toBe(true);
    expect(hasProceedingOutcome(form)).toBe(false);
    expect(canPublishWithProceedingOutcome(form)).toBe(false);
  });

  it('does not require the special permission when no proceeding is selected', () => {
    expect(canManuallyPublish({ proceedingType: 'none' }, false)).toBe(true);
  });

  it('requires the special permission when a proceeding is selected', () => {
    const form = { proceedingType: 'general', enforcementDecision: 'Jõustunud' };
    expect(canManuallyPublish(form, false)).toBe(false);
    expect(canManuallyPublish(form, true)).toBe(true);
  });
});
