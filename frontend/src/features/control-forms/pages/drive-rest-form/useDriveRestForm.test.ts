import { describe, it, expect } from 'vitest';
import { serializeDriveRestFormValues } from './useDriveRestForm';
import type { DriveRestForm } from '../../types';

// atpViolationFound is typed as string on DriveRestForm (Resql's param is
// type: string), but the whole point of these tests is that a raw runtime
// value — a genuine boolean from an unedited API response — can reach this
// function despite the type. Cast the test inputs past that, same as the
// real caller (createSaveAllHandler) does implicitly via `as` at its call site.
type LooseDriveRestValues = Partial<DriveRestForm> & Record<string, unknown>;

describe('serializeDriveRestFormValues', () => {
  // Regression test: createSaveAllHandler falls back to the raw, never-edited
  // subForm.form snapshot (draftRef.current ?? subForm.form) when a compound
  // form's driver/teammate tab was never opened for editing. That snapshot
  // carries atpViolationFound as a genuine Postgres boolean (the DB column
  // type), not the 'true'/'false' string formik's own initialValues produce
  // via String(form?.atpViolationFound) — sending it raw made Resql reject
  // the save with "atpViolationFound expected string, got boolean".
  it('normalizes a raw boolean atpViolationFound to a string', () => {
    const result = serializeDriveRestFormValues({ atpViolationFound: true } as unknown as LooseDriveRestValues, 'saved');
    expect(result.atpViolationFound).toBe('true');
  });

  it('normalizes a raw false boolean atpViolationFound to a string', () => {
    const result = serializeDriveRestFormValues({ atpViolationFound: false } as unknown as LooseDriveRestValues, 'saved');
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

  // Resql returns the INTEGER day-count columns as JSON numbers; edit/save|confirm declare them type: string.
  it('stringifies raw numeric day counts from an unedited snapshot', () => {
    const result = serializeDriveRestFormValues(
      { checkedDaysCount: 28, workDaysCount: 0, otherActivityDaysCount: 3 } as unknown as LooseDriveRestValues,
      'saved',
    );
    expect(result.checkedDaysCount).toBe('28');
    expect(result.workDaysCount).toBe('0');
    expect(result.otherActivityDaysCount).toBe('3');
  });

  it('leaves empty and missing day counts as they are', () => {
    const result = serializeDriveRestFormValues({ checkedDaysCount: '', workDaysCount: null } as unknown as LooseDriveRestValues, 'saved');
    expect(result.checkedDaysCount).toBe('');
    expect(result.workDaysCount).toBeNull();
    expect(result.otherActivityDaysCount).toBeUndefined();
  });
});
