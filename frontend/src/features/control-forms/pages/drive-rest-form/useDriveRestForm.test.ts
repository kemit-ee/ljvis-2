import { describe, it, expect } from 'vitest';
import { serializeDriveRestFormValues } from './useDriveRestForm';

describe('serializeDriveRestFormValues', () => {
  // Regression test: createSaveAllHandler falls back to the raw, never-edited
  // subForm.form snapshot (draftRef.current ?? subForm.form) when a compound
  // form's driver/teammate tab was never opened for editing. That snapshot
  // carries atpViolationFound as a genuine Postgres boolean (the DB column
  // type), not the 'true'/'false' string formik's own initialValues produce
  // via String(form?.atpViolationFound) — sending it raw made Resql reject
  // the save with "atpViolationFound expected string, got boolean".
  it('normalizes a raw boolean atpViolationFound to a string', () => {
    const result = serializeDriveRestFormValues({ atpViolationFound: true }, 'saved');
    expect(result.atpViolationFound).toBe('true');
  });

  it('normalizes a raw false boolean atpViolationFound to a string', () => {
    const result = serializeDriveRestFormValues({ atpViolationFound: false }, 'saved');
    expect(result.atpViolationFound).toBe('false');
  });

  it('leaves an already-stringified atpViolationFound untouched', () => {
    const result = serializeDriveRestFormValues({ atpViolationFound: 'true' }, 'saved');
    expect(result.atpViolationFound).toBe('true');
  });

  it('defaults a missing atpViolationFound to the string "false"', () => {
    const result = serializeDriveRestFormValues({}, 'saved');
    expect(result.atpViolationFound).toBe('false');
  });
});
