import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRevisionsForTests,
  forgetRevision,
  rememberRevision,
  revisionFor,
  tracked,
  untracked,
  withRevision,
} from './formRevisions';

describe('form revision tracking (optimistic lock)', () => {
  beforeEach(clearRevisionsForTests);

  it('sends the revision seen on load when saving', () => {
    rememberRevision('vehicle', { id: 7, revision: 3 });
    expect(withRevision('vehicle', { id: 7 }).revision).toBe(3);
    expect(withRevision('vehicle', { id: '7' }).id).toBe('7');
  });

  it('keeps forms of different types with the same key apart', () => {
    rememberRevision('vehicle', { id: 7, revision: 3 });
    rememberRevision('trailer', { id: 7, revision: 9 });
    expect(withRevision('vehicle', { id: 7 }).revision).toBe(3);
    expect(withRevision('trailer', { id: 7 }).revision).toBe(9);
  });

  it('moves to the new revision after a successful save, so a second save is not a false conflict', async () => {
    rememberRevision('adr', { id: 1, revision: 2 });
    await tracked('adr', Promise.resolve([{ id: 1, revision: 3 }]));
    expect(withRevision('adr', { id: 1 }).revision).toBe(3);
  });

  it('fails open: unknown revision is sent as null (no server-side check)', () => {
    expect(withRevision('adr', { id: 1 }).revision).toBeNull();
    expect(withRevision('adr', {}).revision).toBeNull();
  });

  it('forgets the revision when the response has none or the form was published/deleted/outcome-saved', async () => {
    rememberRevision('adr', { id: 1, revision: 2 });
    rememberRevision('adr', { id: 1 });
    expect(revisionFor('adr', 1)).toBeUndefined();
    rememberRevision('adr', { id: 1, revision: 4 });
    await untracked('adr', 1, Promise.resolve('published'));
    expect(revisionFor('adr', 1)).toBeUndefined();
    rememberRevision('adr', { id: 2, revision: 4 });
    forgetRevision('adr', 2);
    expect(revisionFor('adr', 2)).toBeUndefined();
  });

  it('falls back to the revision on the form object when nothing is tracked', () => {
    expect(withRevision('good-repute', { id: 5, revision: 6 }).revision).toBe(6);
  });

  it('prefers the tracked revision over a stale one embedded in the draft', () => {
    rememberRevision('good-repute', { id: 5, revision: 8 });
    expect(withRevision('good-repute', { id: 5, revision: 6 }).revision).toBe(8);
  });

  it('ignores null and list responses without ids', () => {
    rememberRevision('compound', null);
    rememberRevision('compound', [{ revision: 2 }, null]);
    expect(revisionFor('compound', undefined)).toBeUndefined();
  });
});
