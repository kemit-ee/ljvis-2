import { describe, expect, it } from 'vitest';
import i18n from './index';
import et from './et.json';
import en from './en.json';

describe('i18n', () => {
  it('initialises with et fallback and both resource bundles', () => {
    expect(i18n.options.fallbackLng).toEqual(['et']);
    expect(i18n.hasResourceBundle('et', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
  });

  it('translates in both languages', async () => {
    const [firstKey] = Object.keys(et as Record<string, unknown>);
    expect(firstKey).toBeTruthy();
    await i18n.changeLanguage('et');
    expect(i18n.t('nav.desktop')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(i18n.t('nav.desktop')).toBeTruthy();
    expect(Object.keys(en as Record<string, unknown>).length).toBeGreaterThan(0);
  });
});
