import { describe, expect, it } from 'vitest';
import { FORM_CONFIG } from '../control-forms/formRoutes';
import { buildFormLink } from './formLink';

describe('buildFormLink', () => {
  it('tagastab null kui allikas või id puudub', () => {
    expect(buildFormLink(null, '1')).toBeNull();
    expect(buildFormLink('compound_form', null)).toBeNull();
    expect(buildFormLink(undefined, undefined)).toBeNull();
  });

  it('tundmatu allikatüüp annab null', () => {
    expect(buildFormLink('unknown', '1')).toBeNull();
  });

  it('koostab lingi vormi marsruudi järgi', () => {
    expect(buildFormLink('compound_form', '7')).toBe(
      `/control-forms${FORM_CONFIG.compound_form.route}/7`,
    );
  });

  it('tram_control_card kaardistatakse tram_driver_form vormile', () => {
    expect(buildFormLink('tram_control_card', '3')).toBe(
      `/control-forms${FORM_CONFIG.tram_driver_form.route}/3`,
    );
  });
});
