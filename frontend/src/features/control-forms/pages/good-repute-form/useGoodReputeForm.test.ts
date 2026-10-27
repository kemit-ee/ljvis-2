// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  save: vi.fn(),
  confirm: vi.fn(),
  publish: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('../../api', () => ({
  saveGoodReputeForm: api.save,
  confirmGoodReputeForm: api.confirm,
  publishGoodReputeForm: api.publish,
}));

import {
  createGoodReputeValidationSchema,
  useGoodReputeForm,
} from './useGoodReputeForm';
import { ApiError } from '../../../../shared/api/client';
import type { GoodReputeForm } from '../../types';

const valid: GoodReputeForm = {
  id: '5',
  formNumber: 'GR-1',
  version: 2,
  personalCode: '39001010000',
  firstName: 'Mari',
  lastName: 'Maasikas',
  dateOfBirth: '1990-01-01',
  placeOfBirth: 'Tallinn',
  certificateNumber: 'C1',
  certificateIssueDate: '2020-01-01',
  certificateCountryCode: 'EE',
  fitnessStatus: 'fit',
  unfitFromDate: '',
  unfitUntilDate: '',
} as GoodReputeForm;

beforeEach(() => {
  vi.clearAllMocks();
  api.save.mockResolvedValue([{ id: '77' }]);
  api.confirm.mockResolvedValue([{ id: '5' }]);
  api.publish.mockResolvedValue([{ id: '5' }]);
});

describe('useGoodReputeForm', () => {
  it('uus vorm: vaikeväärtused ja isEdit=false', () => {
    const { result } = renderHook(() => useGoodReputeForm(undefined, vi.fn()));
    expect(result.current.isEdit).toBe(false);
    expect(result.current.formik.values.fitnessStatus).toBe('fit');
    expect(result.current.formik.values.version).toBe(1);
  });

  it('valideerimine nõuab kohustuslikke välju ega salvesta', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useGoodReputeForm(undefined, onSaved));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(api.save).not.toHaveBeenCalled();
    expect(result.current.formik.errors.personalCode).toBe(
      'forms.good_repute.validation.required',
    );
  });

  it('salvestab kehtiva vormi ja annab id tagasi', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useGoodReputeForm(valid, onSaved));
    expect(result.current.isEdit).toBe(true);
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(api.save).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith('77');
  });

  it('kinnitamine kutsub onConfirmed', async () => {
    const onSaved = vi.fn();
    const onConfirmed = vi.fn();
    const { result } = renderHook(() =>
      useGoodReputeForm(valid, onSaved, onConfirmed),
    );
    await act(async () => {
      await result.current.triggerConfirm();
    });
    expect(api.confirm).toHaveBeenCalled();
    expect(onConfirmed).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('kinnitamine ilma onConfirmed-ita langeb tagasi onSaved peale', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useGoodReputeForm(valid, onSaved));
    await act(async () => {
      await result.current.triggerConfirm();
    });
    expect(onSaved).toHaveBeenCalledWith('5');
  });

  it('avalikustamine kutsub onPublished', async () => {
    const onPublished = vi.fn();
    const { result } = renderHook(() =>
      useGoodReputeForm(valid, vi.fn(), vi.fn(), onPublished),
    );
    await act(async () => {
      await result.current.triggerPublish();
    });
    expect(api.publish).toHaveBeenCalledWith('5');
    expect(onPublished).toHaveBeenCalled();
  });

  it('tulevane sünnikuupäev ja vale unfit vahemik on valideerimisvead', async () => {
    const { result } = renderHook(() =>
      useGoodReputeForm(
        {
          ...valid,
          dateOfBirth: '2999-01-01',
          fitnessStatus: 'unfit',
          unfitFromDate: '2026-05-01',
          unfitUntilDate: '2026-04-01',
        } as GoodReputeForm,
        vi.fn(),
      ),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.dateOfBirth).toBe(
      'forms.good_repute.validation.api.future_date_not_allowed',
    );
    expect(result.current.formik.errors.unfitUntilDate).toBe(
      'forms.good_repute.validation.api.must_be_after_unfit_from_date',
    );
  });

  it('unfit nõuab kuupäevi', async () => {
    const { result } = renderHook(() =>
      useGoodReputeForm(
        { ...valid, fitnessStatus: 'unfit' } as GoodReputeForm,
        vi.fn(),
      ),
    );
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.unfitFromDate).toBeTruthy();
    expect(result.current.formik.errors.unfitUntilDate).toBeTruthy();
  });

  it('serveri valideerimisviga läheb väljale', async () => {
    api.save.mockRejectedValue(
      new ApiError('x', 422, {
        type: 'VALIDATION_ERROR',
        field: 'firstName',
        code: 'bad',
      }),
    );
    const { result } = renderHook(() => useGoodReputeForm(valid, vi.fn()));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formik.errors.firstName).toBe(
      'forms.good_repute.validation.api.bad',
    );
  });

  it('väljata valideerimisviga läheb vormi veaks', async () => {
    api.save.mockRejectedValue(
      new ApiError('x', 422, { type: 'VALIDATION_ERROR', code: 'general' }),
    );
    const { result } = renderHook(() => useGoodReputeForm(valid, vi.fn()));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    await waitFor(() =>
      expect(result.current.formError).toBe(
        'forms.good_repute.validation.api.general',
      ),
    );
  });

  it('ootamatu viga näitab üldist teadet', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.save.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useGoodReputeForm(valid, vi.fn()));
    await act(async () => {
      await result.current.formik.submitForm();
    });
    expect(result.current.formError).toBe('common.errors.unexpected');
    err.mockRestore();
  });
});

const base: GoodReputeForm = {
  personalCode: 'TEST',
  firstName: 'TEST',
  lastName: 'TEST',
  dateOfBirth: '',
  certificateNumber: 'TEST',
  certificateIssueDate: '',
  certificateCountryCode: 'EE',
  fitnessStatus: 'unfit',
  unfitFromDate: '',
  unfitUntilDate: '',
};
const t = (key: string) => key;
describe('unknown imported dates', () => {
  it('allows unknown dates on a persisted imported form', async () => {
    const schema = createGoodReputeValidationSchema(t, {
      ...base,
      legacyImport: true,
    });
    expect(await schema.isValid(base)).toBe(true);
  });
  it('does not exempt new forms based on a submitted legacyImport flag', async () => {
    expect(
      await createGoodReputeValidationSchema(t).isValid({
        ...base,
        legacyImport: true,
      }),
    ).toBe(false);
  });
  it('does not permit clearing a previously known imported date', async () => {
    const schema = createGoodReputeValidationSchema(t, {
      ...base,
      legacyImport: true,
      dateOfBirth: '2000-01-01',
    });
    expect(await schema.isValid(base)).toBe(false);
  });
  it('requires unfitness dates when changing an imported fit form to unfit', async () => {
    const schema = createGoodReputeValidationSchema(t, {
      ...base,
      legacyImport: true,
      fitnessStatus: 'fit',
    });
    expect(await schema.isValid(base)).toBe(false);
  });
  it('still rejects impossible chronology when dates are supplied', async () => {
    const schema = createGoodReputeValidationSchema(t, {
      ...base,
      legacyImport: true,
    });
    expect(
      await schema.isValid({
        ...base,
        unfitFromDate: '2020-02-01',
        unfitUntilDate: '2020-01-01',
      }),
    ).toBe(false);
    expect(await schema.isValid({ ...base, dateOfBirth: '2999-01-01' })).toBe(
      false,
    );
  });
});
