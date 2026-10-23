import { describe, expect, it } from 'vitest';
import {
  NOTIFICATION_TYPE_TEMPLATE_VARIABLES,
  NOTIFICATION_TYPE_TRIGGER_FORM_KEYS,
} from './notificationTypeMeta';

describe('notificationTypeMeta', () => {
  it('iga malli muutujatega liigil on käivitajad', () => {
    for (const type of Object.keys(NOTIFICATION_TYPE_TEMPLATE_VARIABLES)) {
      expect(NOTIFICATION_TYPE_TRIGGER_FORM_KEYS[type]).toBeDefined();
    }
  });

  it('muutujate nimed on unikaalsed liigi sees', () => {
    for (const vars of Object.values(NOTIFICATION_TYPE_TEMPLATE_VARIABLES)) {
      expect(new Set(vars).size).toBe(vars.length);
    }
  });
});
