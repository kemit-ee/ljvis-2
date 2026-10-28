import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import {
  getClassifier,
  getClassifierValue,
  getClassifierValues,
  getClassifiersBundle,
  insertClassifierValue,
  listClassifiers,
  updateClassifier,
  updateClassifierValue,
} from './api';

afterEach(() => vi.restoreAllMocks());

describe('classifiers api', () => {
  it('päringud', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    const post = vi.spyOn(client, 'post').mockResolvedValue([]);
    const put = vi.spyOn(client, 'put').mockResolvedValue([]);
    await getClassifiersBundle();
    await listClassifiers({ page: '1' });
    await getClassifier('3');
    await getClassifierValues({ classifierId: '3', search: 's' });
    await getClassifierValue('3', '4');
    const value = {
      classifierId: '3',
      code: 'C',
      name: 'N',
      validFrom: '2026-01-01',
      validUntil: '',
      formTypes: [],
    };
    await insertClassifierValue(value);
    await updateClassifierValue({ ...value, classifierValueId: '4' });
    await updateClassifier({ id: '3', name: 'n', description: 'd' });
    await updateClassifier({ id: 5 as unknown as string, name: 'n', description: 'd' });

    expect(get).toHaveBeenCalledWith('/v1/classifiers/bundle');
    expect(get).toHaveBeenCalledWith('/v1/classifiers', { page: '1' });
    expect(get).toHaveBeenCalledWith('/v1/classifiers/classifier', { q: '3' });
    expect(get).toHaveBeenCalledWith('/v1/classifiers/values', { classifierId: '3', search: 's' });
    expect(get).toHaveBeenCalledWith('/v1/classifiers/value', { q: '3', valueId: '4' });
    expect(post).toHaveBeenCalledWith('/v1/classifiers/value', value);
    expect(put).toHaveBeenCalledWith('/v1/classifiers/value', { ...value, classifierValueId: '4' });
    expect(put).toHaveBeenCalledWith('/v1/classifiers', { id: '5', name: 'n', description: 'd' });
    expect(put).toHaveBeenCalledWith('/v1/classifiers', { id: '3', name: 'n', description: 'd' });
  });
});
