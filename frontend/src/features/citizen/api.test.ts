import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../shared/api/client', () => client);

import {
  getCitizenCompoundForm,
  getCitizenCompoundSubForms,
  getCitizenForeignViolationForm,
  getCitizenGoodReputeForm,
  getCitizenLabourInspectionForm,
  getCompanyControlsBreakdown,
  getCompanyRiskScore,
  searchCitizenForms,
  searchCompanyForms,
  searchMyProtocols,
} from './api';

const params = { page: '2', pageSize: '10', search: '', sorting: 'main_date desc' };

beforeEach(() => {
  client.get.mockReset();
  client.post.mockReset();
});

describe('citizen search', () => {
  it('searchCitizenForms sends no scope and maps total from the first row', async () => {
    client.post.mockResolvedValue([{ total: '7' }, { total: '7' }]);
    const res = await searchCitizenForms(params);
    expect(client.post).toHaveBeenCalledWith('/v1/citizen/forms/search', {
      scope: '',
      registry_code: '',
      page: '2',
      page_size: '10',
      sorting: 'main_date desc',
      form_type: '',
    });
    expect(res.total).toBe(7);
    expect(res.content).toHaveLength(2);
  });

  it('returns total 0 for empty results and treats missing total as 0', async () => {
    client.post.mockResolvedValueOnce([]);
    expect((await searchCitizenForms(params)).total).toBe(0);
    client.post.mockResolvedValueOnce([{}]);
    expect((await searchCitizenForms(params)).total).toBe(0);
  });

  it('searchMyProtocols uses the self scope', async () => {
    client.post.mockResolvedValue([]);
    await searchMyProtocols(params);
    expect(client.post.mock.calls[0][1]).toMatchObject({ scope: 'self', registry_code: '' });
  });

  it('searchCompanyForms uses the company scope with registry code', async () => {
    client.post.mockResolvedValue([]);
    await searchCompanyForms('12345')(params);
    expect(client.post.mock.calls[0][1]).toMatchObject({ scope: 'company', registry_code: '12345' });
  });
});

describe('citizen gets', () => {
  it('requests risk score, controls and forms by id', async () => {
    client.get.mockResolvedValue({});
    await getCompanyRiskScore('1');
    expect(client.get).toHaveBeenLastCalledWith('/v1/citizen/risk-scores/my-company', { q: '1' });
    await getCompanyControlsBreakdown('1');
    expect(client.get).toHaveBeenLastCalledWith('/v1/citizen/risk-scores/controls', { q: '1' });
    await getCitizenLabourInspectionForm(5);
    expect(client.get).toHaveBeenLastCalledWith('/v1/citizen/forms/labour-inspection', { q: '5' });
    await getCitizenCompoundForm(5);
    expect(client.get).toHaveBeenLastCalledWith('/v1/citizen/forms/compound', { q: '5' });
    await getCitizenForeignViolationForm(5);
    expect(client.get).toHaveBeenLastCalledWith('/v1/citizen/forms/foreign-violation', { q: '5' });
    await getCitizenGoodReputeForm(5);
    expect(client.get).toHaveBeenLastCalledWith('/v1/citizen/forms/good-repute', { q: '5' });
  });

  it('parses the JSON-encoded violations of sub-forms, tolerating bad input', async () => {
    client.get.mockResolvedValue([
      { formKey: 1, violations: '[{"severityCode":"MSI"}]' },
      { formKey: 2, violations: '' },
      { formKey: 3, violations: '{not json' },
    ]);
    const rows = await getCitizenCompoundSubForms(9);
    expect(client.get).toHaveBeenCalledWith('/v1/citizen/forms/compound/sub-forms', { q: '9' });
    expect(rows[0].violations).toEqual([{ severityCode: 'MSI' }]);
    expect(rows[1].violations).toEqual([]);
    expect(rows[2].violations).toEqual([]);
  });
});
