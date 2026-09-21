import { describe, it, expect } from 'vitest';
import { createTechnicalCheckValidationSchema } from './useTechnicalCheckForm';

const t = (key: string) => key;

describe('createTechnicalCheckValidationSchema partsSummary check', () => {
  const schema = createTechnicalCheckValidationSchema(t);

  it('passes when a part is checked', async () => {
    const valid = await schema.isValid({
      resultType: 'ok',
      partsSummary: [{ partCode: 'CAA_1', checked: true, hasDefect: false }],
    });
    expect(valid).toBe(true);
  });

  it('passes when a part has a defect', async () => {
    const valid = await schema.isValid({
      resultType: 'ok',
      partsSummary: [{ partCode: 'CAA_1', checked: true, hasDefect: true }],
    });
    expect(valid).toBe(true);
  });

  it('fails when nothing is checked', async () => {
    const valid = await schema.isValid({
      resultType: 'ok',
      partsSummary: [{ partCode: 'CAA_1', checked: false, hasDefect: false }],
    });
    expect(valid).toBe(false);
  });

  it('skips the check when resultType is not ok', async () => {
    const valid = await schema.isValid({
      resultType: 'no_check',
      partsSummary: [{ partCode: 'CAA_1', checked: false, hasDefect: false }],
    });
    expect(valid).toBe(true);
  });
});
