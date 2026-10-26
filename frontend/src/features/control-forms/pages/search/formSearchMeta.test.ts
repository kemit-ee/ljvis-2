import { describe, expect, it } from 'vitest';
import { FORM_TYPE_META, FORM_TYPE_ORDER, resolveFormRoute } from './formSearchMeta';

describe('formSearchMeta', () => {
  it('igal järjestuse tüübil on metaandmed ja marsruut', () => {
    for (const code of FORM_TYPE_ORDER) {
      expect(FORM_TYPE_META[code]).toBeDefined();
      expect(FORM_TYPE_META[code].route(7)).toMatch(/^\/control-forms\/.+\/7$/);
      expect(FORM_TYPE_META[code].labelKey).toMatch(/^search\.formType\./);
      expect(FORM_TYPE_META[code].readPermission).toMatch(/\.read$/);
    }
  });

  it('resolveFormRoute tagastab teadaoleva tee ja tundmatu tüübi korral #', () => {
    expect(resolveFormRoute('adr', 3)).toBe('/control-forms/adr/3');
    expect(resolveFormRoute('kv', 4)).toBe('/control-forms/transport-interruption/4');
    expect(resolveFormRoute('unknown', 1)).toBe('#');
  });
});
