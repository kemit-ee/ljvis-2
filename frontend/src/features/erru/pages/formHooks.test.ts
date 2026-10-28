// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/client';

const api = vi.hoisted(() => ({
  createCtudRequest: vi.fn(),
  updateCtudRequest: vi.fn(),
  sendCtudRequest: vi.fn(),
  createCgrRequest: vi.fn(),
  updateCgrRequest: vi.fn(),
  saveNuMessage: vi.fn(),
  saveNcrRequest: vi.fn(),
  saveNcrResponse: vi.fn(),
}));
vi.mock('../api', () => api);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../classifiers/ClassifierProvider', () => {
  const list = [
    { code: 'A', name: 'a', isValid: true },
    { code: 'B', name: 'b', isValid: false },
    { code: 'Heartbeat', name: 'h' },
  ];
  const stable = { getByCode: () => list, getErruMemberCountries: () => [{ code: 'LV', name: 'Läti' }] };
  return { useClassifiers: () => stable };
});

import { useCgrForm } from './cgr/useCgrForm';
import { useCtudForm } from './ctud/useCtudForm';
import { useNcrRequestForm } from './ncr/useNcrRequestForm';
import { useNcrResponseForm } from './ncr/useNcrResponseForm';
import { useNuForm } from './nu/useNuForm';

const validation = (code: string, field: string | null = null, status = 422) =>
  new ApiError('x', status, { type: 'VALIDATION_ERROR', code, field });

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useCtudForm', () => {
  const fill = async (r: { current: ReturnType<typeof useCtudForm> }, over = {}) => {
    await r.current.formik.setValues({
      ...r.current.formik.values,
      ctudTo: 'LV',
      transportUndertakingName: ' AS Test ',
      communityLicenceNumber: 'EE-1',
      ...over,
    });
  };

  it('exposes only valid classifier options', () => {
    const { result } = renderHook(() => useCtudForm(undefined, vi.fn()));
    expect(result.current.authorities.map((c) => c.code)).toEqual(['A', 'Heartbeat']);
    expect(result.current.countries).toHaveLength(1);
    expect(result.current.isEdit).toBe(false);
  });

  it('creates a draft, then optionally sends it', async () => {
    api.createCtudRequest.mockResolvedValue({ id: 5 });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useCtudForm(undefined, onSaved, { sendAfterCreate: true }));
    await act(() => fill(result));
    await act(() => result.current.formik.submitForm());
    expect(api.createCtudRequest.mock.calls[0][0].transportUndertakingName).toBe('AS Test');
    expect(api.sendCtudRequest).toHaveBeenCalledWith('5');
    expect(onSaved).toHaveBeenCalledWith('5', undefined);
  });

  it('reports a send failure after create via onSaved', async () => {
    api.createCtudRequest.mockResolvedValue({ id: 5 });
    api.sendCtudRequest.mockRejectedValue(new ApiError('x', 502, { code: 'send_unknown' }));
    const onSaved = vi.fn();
    const { result } = renderHook(() => useCtudForm(undefined, onSaved, { sendAfterCreate: true }));
    await act(() => fill(result));
    await act(() => result.current.formik.submitForm());
    expect(onSaved).toHaveBeenCalledWith('5', 'send_unknown');
  });

  it('updates an existing request', async () => {
    api.updateCtudRequest.mockResolvedValue({ id: 9 });
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useCtudForm({ id: 9, ctudTo: 'LV', requestAllVehicles: true, transportUndertakingName: 'x', communityLicenceNumber: 'y' } as never, onSaved),
    );
    expect(result.current.isEdit).toBe(true);
    await act(() => result.current.formik.submitForm());
    expect(api.updateCtudRequest).toHaveBeenCalledWith('9', expect.any(Object));
    expect(onSaved).toHaveBeenCalledWith('9', undefined);
  });

  it('requires two search criteria', async () => {
    const { result } = renderHook(() => useCtudForm(undefined, vi.fn()));
    await act(() => fill(result, { communityLicenceNumber: '' }));
    await act(() => result.current.formik.submitForm());
    expect(result.current.formError).toBe('erru.ctud.validation.min_two_search_criteria');
    expect(api.createCtudRequest).not.toHaveBeenCalled();
    act(() => result.current.clearFormError());
    expect(result.current.formError).toBeNull();
  });

  it('maps backend errors', async () => {
    const { result } = renderHook(() => useCtudForm(undefined, vi.fn()));
    await act(() => fill(result));
    api.createCtudRequest.mockRejectedValueOnce(validation('min_two_search_criteria', 'transportUndertakingName'));
    await act(() => result.current.formik.submitForm());
    expect(result.current.formError).toBe('erru.ctud.validation.min_two_search_criteria');
    api.createCtudRequest.mockRejectedValueOnce(validation('invalid_value', 'ctudTo'));
    await act(() => result.current.formik.submitForm());
    expect(result.current.formik.errors.ctudTo).toBe('erru.ctud.validation.invalid_value');
    api.createCtudRequest.mockRejectedValueOnce(new Error('boom'));
    await act(() => result.current.formik.submitForm());
    expect(console.error).toHaveBeenCalled();
  });

  it('rejects the literal "unknown" undertaking name and a missing registration country', async () => {
    const { result } = renderHook(() => useCtudForm(undefined, vi.fn()));
    await act(() => fill(result, { transportUndertakingName: 'Unknown', vehicleRegistrationNumber: '123' }));
    await act(() => result.current.formik.submitForm());
    expect(result.current.formik.errors.transportUndertakingName).toBe('erru.ctud.validation.unknown_not_allowed');
    expect(result.current.formik.errors.vehicleRegistrationCountry).toBeTruthy();
  });
});

describe('useCgrForm', () => {
  const values = { originatingAuthority: 'A', requestPurpose: 'B', tmFirstName: ' Jaan ', tmFamilyName: 'Tamm', tmDateOfBirth: '1980-01-01' };

  it('creates with a complete name block', async () => {
    api.createCgrRequest.mockResolvedValue({ id: 3 });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useCgrForm(undefined, onSaved));
    expect(result.current.isEdit).toBe(false);
    await act(async () => {
      await result.current.formik.setValues({ ...result.current.formik.values, ...values });
    });
    await act(() => result.current.formik.submitForm());
    expect(api.createCgrRequest.mock.calls[0][0].tmFirstName).toBe('Jaan');
    expect(onSaved).toHaveBeenCalledWith('3');
  });

  it('updates, maps ZZ to empty and reports backend errors', async () => {
    api.updateCgrRequest.mockRejectedValueOnce(validation('invalid_value', null)).mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() =>
      useCgrForm({ id: 2, cgrTo: 'ZZ', originatingAuthority: 'A', requestPurpose: 'B', certificateNumber: 'C1', certificateIssueDate: '2020-01-01', certificateIssueCountry: 'LV' }, vi.fn()),
    );
    expect(result.current.isEdit).toBe(true);
    expect(result.current.formik.values.cgrTo).toBe('');
    await act(() => result.current.formik.submitForm());
    expect(api.updateCgrRequest).toHaveBeenCalledWith('2', expect.any(Object));
    expect(result.current.formError).toBe('erru.cgr.validation.invalid_value');
    await act(() => result.current.formik.submitForm());
    expect(console.error).toHaveBeenCalled();
    act(() => result.current.clearFormError());
    expect(result.current.formError).toBeNull();
  });

  it.each([
    [{ tmFirstName: 'x' }, 'name_block_incomplete'],
    [{ certificateNumber: 'x' }, 'certificate_block_incomplete'],
    [{}, 'search_choice_required'],
  ])('search choice validation %j', async (over, message) => {
    const { result } = renderHook(() => useCgrForm(undefined, vi.fn()));
    await act(async () => {
      await result.current.formik.setValues({ ...result.current.formik.values, originatingAuthority: 'A', requestPurpose: 'B', ...over });
    });
    await act(() => result.current.formik.submitForm());
    expect(JSON.stringify(result.current.formik.errors)).toContain(message);
  });
});

describe('useNuForm', () => {
  const nuValues = { originatingAuthority: 'A', requestPurpose: 'B', tmFirstName: 'J', tmFamilyName: 'T', tmDateOfBirth: '1980-01-01', unfitStartDate: '2024-01-01' };

  it('filters Heartbeat from purposes and saves a new message', async () => {
    api.saveNuMessage.mockResolvedValue({ id: 8 });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useNuForm(undefined, 'K1', onSaved, 'S1'));
    expect(result.current.requestPurposes.map((c) => c.code)).toEqual(['A']);
    await act(async () => {
      await result.current.formik.setValues({ ...result.current.formik.values, ...nuValues });
    });
    await act(() => result.current.formik.submitForm());
    expect(api.saveNuMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: undefined, sourceGoodReputeFormKey: 'K1', sourceSnapshotId: 'S1' }),
    );
    expect(onSaved).toHaveBeenCalledWith('8');
  });

  it('edits an existing message and picks the certificate element', async () => {
    api.saveNuMessage.mockResolvedValue({ id: 4 });
    const { result } = renderHook(() =>
      useNuForm(
        { id: '4', version: 2, nuTo: 'ZZ', originatingAuthority: 'A', requestPurpose: 'B', certificateNumber: 'C', certificateIssueDate: '2020-01-01', certificateIssueCountry: 'LV', unfitStartDate: '2024-01-01' },
        'K1',
        vi.fn(),
      ),
    );
    expect(result.current.isEdit).toBe(true);
    expect(result.current.formik.values.primaryElement).toBe('certificate');
    expect(result.current.formik.values.nuTo).toBe('');
    await act(() => result.current.formik.submitForm());
    expect(api.saveNuMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: '4', sourceGoodReputeFormKey: undefined, expectedVersion: 2 }),
    );
  });

  it('puts errors on editable fields and in the alert', async () => {
    api.saveNuMessage.mockRejectedValueOnce(new ApiError('x', 422, { code: 'required', field: 'tmFirstName' }));
    api.saveNuMessage.mockRejectedValueOnce(new ApiError('x', 422, { code: 'source_changed', field: 'certificateNumber' }));
    const { result } = renderHook(() => useNuForm(undefined, 'K1', vi.fn()));
    await act(async () => {
      await result.current.formik.setValues({ ...result.current.formik.values, ...nuValues });
    });
    await act(() => result.current.formik.submitForm());
    expect(result.current.formik.errors.tmFirstName).toBeTruthy();
    expect(result.current.formError).toBeTruthy();
    await act(() => result.current.formik.submitForm());
    act(() => result.current.clearFormError());
    expect(result.current.formError).toBeNull();
  });

  it('requires the fields of the chosen element', async () => {
    const { result } = renderHook(() => useNuForm(undefined, 'K1', vi.fn()));
    await act(async () => {
      await result.current.formik.setFieldValue('primaryElement', 'certificate');
    });
    await act(() => result.current.formik.submitForm());
    expect(result.current.formik.errors.certificateNumber).toBeTruthy();
    expect(result.current.formik.errors.tmFirstName).toBeUndefined();
  });
});

describe('useNcrRequestForm', () => {
  const message = {
    businessCaseId: 'B1',
    ncrTo: 'LV',
    originatingAuthority: 'KLIM',
    requestSource: 'CA',
    requestPurpose: 'P',
    transportUndertakingName: 'TU',
    communityLicenceNumber: 'L1',
    vehicleRegistrationNumber: 'ABC',
    vehicleRegistrationCountry: 'LV',
    checkResult: 'Fail',
    checkDate: '2024-01-01',
    minorInfringement: { dateOfInfringement: '2024-01-01', numberOfInfringements: 2 },
    seriousInfringements: [
      {
        category: 'MSI',
        infringementType: 'MSI101',
        dateOfInfringement: '2024-01-01',
        detectionCheckDate: '2024-01-01',
        appealPossible: false,
        penaltiesImposed: [{ penaltyImposedIdentifier: ' p1 ', penaltyTypeImposed: 'x', finalDecisionDate: '', isExecuted: 'Unknown' }],
        penaltiesRequested: [{ penaltyRequestedIdentifier: ' r1 ', penaltyTypeRequested: 'y' }],
      },
    ],
  } as never;

  it('saves a failed check with sanitised serious infringements', async () => {
    api.saveNcrRequest.mockResolvedValue({ businessCaseId: 'B1' });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useNcrRequestForm(message, onSaved));
    await act(() => result.current.formik.submitForm());
    const body = api.saveNcrRequest.mock.calls[0][0];
    expect(body.checkResult).toBe('Fail');
    expect(JSON.parse(body.minorInfringement)).toEqual({ dateOfInfringement: '2024-01-01', numberOfInfringements: 2 });
    expect(JSON.parse(body.seriousInfringements)[0].penaltiesImposed[0].penaltyImposedIdentifier).toBe('p1');
    expect(onSaved).toHaveBeenCalledWith('B1');
  });

  it('a passed check clears the infringement data', async () => {
    api.saveNcrRequest.mockResolvedValue({ businessCaseId: 'B1' });
    const { result } = renderHook(() => useNcrRequestForm(message, vi.fn()));
    await act(async () => result.current.setCheckPassed(true));
    expect(result.current.formik.values.seriousInfringements).toEqual([]);
    await act(() => result.current.formik.submitForm());
    expect(api.saveNcrRequest.mock.calls[0][0]).toMatchObject({ checkResult: 'Pass', seriousInfringements: '[]', minorInfringement: '' });
    await act(async () => result.current.setCheckPassed(false));
    expect(result.current.formik.values.checkPassed).toBe(false);
  });

  it('edits the infringement lists', async () => {
    const { result } = renderHook(() => useNcrRequestForm(undefined, vi.fn()));
    await act(async () => result.current.addSeriousInfringement());
    expect(result.current.formik.values.seriousInfringements).toHaveLength(1);
    await act(async () => result.current.updateSeriousInfringement(0, { infringementType: 'X' }));
    await act(async () => result.current.addPenaltyImposed(0));
    await act(async () => result.current.addPenaltyRequested(0));
    let si = result.current.formik.values.seriousInfringements[0];
    expect(si.infringementType).toBe('X');
    expect(si.penaltiesImposed).toHaveLength(1);
    expect(si.penaltiesRequested).toHaveLength(1);
    await act(async () => result.current.removePenaltyImposed(0, 0));
    await act(async () => result.current.removePenaltyRequested(0, 0));
    si = result.current.formik.values.seriousInfringements[0];
    expect(si.penaltiesImposed).toHaveLength(0);
    expect(si.penaltiesRequested).toHaveLength(0);
    await act(async () => result.current.removeSeriousInfringement(0));
    expect(result.current.formik.values.seriousInfringements).toHaveLength(0);
  });

  it('keeps the other rows untouched when editing one', async () => {
    const { result } = renderHook(() => useNcrRequestForm(undefined, vi.fn()));
    await act(async () => result.current.addSeriousInfringement());
    await act(async () => result.current.addSeriousInfringement());
    await act(async () => result.current.addPenaltyImposed(0));
    await act(async () => result.current.addPenaltyRequested(0));
    await act(async () => result.current.updateSeriousInfringement(0, { infringementType: 'X' }));
    await act(async () => result.current.removePenaltyImposed(0, 0));
    await act(async () => result.current.removePenaltyRequested(0, 0));
    expect(result.current.formik.values.seriousInfringements[1].infringementType).toBe('');
  });

  it('maps backend validation errors and logs others', async () => {
    api.saveNcrRequest.mockRejectedValueOnce(validation('invalid_value', null)).mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useNcrRequestForm(message, vi.fn()));
    await act(() => result.current.formik.submitForm());
    expect(result.current.formError).toBe('erru.ncr.validation.invalid_value');
    await act(() => result.current.formik.submitForm());
    expect(console.error).toHaveBeenCalled();
    act(() => result.current.clearFormError());
    expect(result.current.formError).toBeNull();
  });

  it('seeds defaults for a new draft and a minor infringement without a count', async () => {
    api.saveNcrRequest.mockResolvedValue({ businessCaseId: 'B' });
    const { result } = renderHook(() => useNcrRequestForm(undefined, vi.fn()));
    expect(result.current.formik.values.originatingAuthority).toBe('KLIM');
    expect(result.current.formik.values.checkPassed).toBe(true);
  });
});

describe('useNcrResponseForm', () => {
  const message = {
    businessCaseId: 'B1',
    seriousInfringements: [{ penaltiesRequested: [{ penaltyRequestedIdentifier: 'r1' }, { penaltyRequestedIdentifier: 'r2' }] }, {}],
    responsePenaltiesImposed: [{ penaltyRequestedIdentifier: 'r2', authorityImposingPenalty: 'X', isImposed: true, penaltyTypeImposed: 'T' }],
    responseNumberOfVehicles: 3,
    responseAddress: { address: 'a', postCode: '1', city: 'c', country: 'EE' },
  } as never;

  it('seeds one row per requested penalty and saves', async () => {
    api.saveNcrResponse.mockResolvedValue({ businessCaseId: 'B1' });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useNcrResponseForm(message, onSaved));
    const rows = result.current.formik.values.responsePenaltiesImposed;
    expect(rows.map((r) => r.penaltyRequestedIdentifier)).toEqual(['r1', 'r2']);
    expect(rows[0].authorityImposingPenalty).toBe('KLIM');
    expect(rows[1].authorityImposingPenalty).toBe('X');
    await act(() => result.current.formik.submitForm());
    expect(JSON.parse(api.saveNcrResponse.mock.calls[0][0].responseAddress).city).toBe('c');
    expect(api.saveNcrResponse.mock.calls[0][0].responseNumberOfVehicles).toBe('3');
    expect(onSaved).toHaveBeenCalledWith('B1');
  });

  it('clears dependent fields when toggling "imposed"', async () => {
    const { result } = renderHook(() => useNcrResponseForm(message, vi.fn()));
    await act(async () => result.current.updatePenalty(1, { isImposed: false }));
    expect(result.current.formik.values.responsePenaltiesImposed[1]).toMatchObject({ penaltyTypeImposed: null, startDate: null });
    await act(async () => result.current.updatePenalty(0, { isImposed: true }));
    expect(result.current.formik.values.responsePenaltiesImposed[0].reason).toBeNull();
    await act(async () => result.current.updatePenalty(0, { reason: 'r' }));
    expect(result.current.formik.values.responsePenaltiesImposed[0].reason).toBe('r');
  });

  it('works without a message, sending an empty address, and maps errors', async () => {
    api.saveNcrResponse.mockRejectedValueOnce(validation('bad', 'responseStatusCode')).mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useNcrResponseForm(undefined, vi.fn()));
    await act(() => result.current.formik.submitForm());
    expect(api.saveNcrResponse.mock.calls[0][0]).toMatchObject({ businessCaseId: '', responseAddress: '' });
    expect(result.current.formik.errors.responseStatusCode).toBe('erru.ncr.validation.bad');
    await act(() => result.current.formik.submitForm());
    expect(console.error).toHaveBeenCalled();
    act(() => result.current.clearFormError());
    expect(result.current.formError).toBeNull();
  });

  it('requires a penalty type for imposed penalties', async () => {
    const { result } = renderHook(() =>
      useNcrResponseForm(
        { businessCaseId: 'B', seriousInfringements: [{ penaltiesRequested: [{ penaltyRequestedIdentifier: 'r1' }] }] } as never,
        vi.fn(),
      ),
    );
    await act(async () => result.current.updatePenalty(0, { isImposed: true }));
    await act(() => result.current.formik.submitForm());
    expect(api.saveNcrResponse).not.toHaveBeenCalled();
  });
});
