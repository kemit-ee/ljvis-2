import { describe, it, expect } from 'vitest';
import { createGoodReputeValidationSchema } from './useGoodReputeForm';
import type { GoodReputeForm } from '../../types';
const base: GoodReputeForm = {
  personalCode: 'TEST', firstName: 'TEST', lastName: 'TEST', dateOfBirth: '',
  certificateNumber: 'TEST', certificateIssueDate: '', certificateCountryCode: 'EE',
  fitnessStatus: 'unfit', unfitFromDate: '', unfitUntilDate: '',
};
const t = (key: string) => key;
describe('unknown imported dates', () => {
  it('allows unknown dates on a persisted imported form', async () => {
    const schema = createGoodReputeValidationSchema(t, { ...base, legacyImport: true });
    expect(await schema.isValid(base)).toBe(true);
  });
  it('does not exempt new forms based on a submitted legacyImport flag', async () => {
    expect(await createGoodReputeValidationSchema(t).isValid({ ...base, legacyImport: true })).toBe(false);
  });
  it('does not permit clearing a previously known imported date', async () => {
    const schema = createGoodReputeValidationSchema(t, { ...base, legacyImport: true, dateOfBirth: '2000-01-01' });
    expect(await schema.isValid(base)).toBe(false);
  });
  it('requires unfitness dates when changing an imported fit form to unfit', async () => {
    const schema = createGoodReputeValidationSchema(t, { ...base, legacyImport: true, fitnessStatus: 'fit' });
    expect(await schema.isValid(base)).toBe(false);
  });
  it('still rejects impossible chronology when dates are supplied', async () => {
    const schema = createGoodReputeValidationSchema(t, { ...base, legacyImport: true });
    expect(await schema.isValid({ ...base, unfitFromDate: '2020-02-01', unfitUntilDate: '2020-01-01' })).toBe(false);
    expect(await schema.isValid({ ...base, dateOfBirth: '2999-01-01' })).toBe(false);
  });
});
