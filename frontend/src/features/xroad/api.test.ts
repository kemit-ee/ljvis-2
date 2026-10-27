import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import {
  getAssociatedPersons,
  queryEtoimikQualifications,
  searchCompanyByName,
  searchCompanyByRegCode,
  searchMtrSoidukikaart,
  searchPersonByCode,
  searchVehicleByRegNr,
} from './api';

afterEach(() => vi.restoreAllMocks());

describe('xroad api', () => {
  it('searchCompanyByRegCode', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ totalFound: 1, data: [{ a: 1 }] });
    expect(await searchCompanyByRegCode('123')).toEqual([{ a: 1 }]);
    expect(post).toHaveBeenCalledWith('/v1/xroad/arireg/lihtandmed', {
      registryCode: '123',
      companyName: null,
      maxResults: null,
    });
  });

  it('searchCompanyByName vaikimisi 10 tulemust', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ totalFound: 0, data: [] });
    await searchCompanyByName('AS');
    await searchCompanyByName('AS', 3);
    expect(post).toHaveBeenNthCalledWith(1, '/v1/xroad/arireg/lihtandmed', {
      registryCode: null,
      companyName: 'AS',
      maxResults: 10,
    });
    expect(post).toHaveBeenNthCalledWith(2, '/v1/xroad/arireg/lihtandmed', {
      registryCode: null,
      companyName: 'AS',
      maxResults: 3,
    });
  });

  describe('searchPersonByCode', () => {
    it('parsib stringina tulnud vastuse, normaliseerib sünniaja ja kodakondsuse', async () => {
      vi.spyOn(client, 'post').mockResolvedValue(
        JSON.stringify({
          data: { firstName: 'A', dateOfBirth: '01.02.1990', citizenshipCode: '233', citizenshipName: 'Eesti' },
        }),
      );
      const p = await searchPersonByCode('39001010000');
      expect(p).toMatchObject({ dateOfBirth: '1990-02-01', citizenshipCode: 'EE' });
    });

    it('objektina vastus, ISO-kuupäev jääb samaks', async () => {
      vi.spyOn(client, 'post').mockResolvedValue({
        data: { dateOfBirth: '1990-02-01', citizenshipCode: 'XX' },
      });
      const p = await searchPersonByCode('x');
      expect(p).toMatchObject({ dateOfBirth: '1990-02-01', citizenshipCode: 'XX' });
    });

    it('puuduva sünniaja korral jääb undefined', async () => {
      vi.spyOn(client, 'post').mockResolvedValue({ data: {} });
      const p = await searchPersonByCode('x');
      expect(p?.dateOfBirth).toBeUndefined();
      expect(p?.citizenshipCode).toBe('');
    });

    it('andmete puudumisel null', async () => {
      vi.spyOn(client, 'post').mockResolvedValue({ data: null });
      expect(await searchPersonByCode('x')).toBeNull();
    });
  });

  describe('getAssociatedPersons', () => {
    const raw = {
      isiku_tyyp: 'F',
      isiku_roll: 'JUHL',
      isiku_roll_tekstina: 'Juhatuse liige',
      eesnimi: 'A',
      nimi_arinimi: 'B',
      isikukood_registrikood: '1',
      algus_kpv: 's',
      lopp_kpv: 'e',
      staatus: 'K',
    };
    const wrap = (item: unknown) => ({
      ettevottegaSeotudIsikud_v1Response: { keha: { seosed: { item } } },
    });

    it('üksik kirje', async () => {
      vi.spyOn(client, 'post').mockResolvedValue(wrap(raw));
      const res = await getAssociatedPersons('1');
      expect(res).toEqual([
        {
          personType: 'F',
          role: 'JUHL',
          roleText: 'Juhatuse liige',
          firstName: 'A',
          nameOrBusinessName: 'B',
          identityCode: '1',
          startDate: 's',
          endDate: 'e',
          status: 'K',
        },
      ]);
    });

    it('massiiv ja puuduvad väljad', async () => {
      vi.spyOn(client, 'post').mockResolvedValue(wrap([{}, raw]));
      const res = await getAssociatedPersons('1');
      expect(res).toHaveLength(2);
      expect(res[0]).toMatchObject({ personType: 'F', role: '', roleText: '', nameOrBusinessName: '', identityCode: '' });
    });

    it('tühi vastus', async () => {
      vi.spyOn(client, 'post').mockResolvedValue(undefined as never);
      expect(await getAssociatedPersons('1')).toEqual([]);
    });
  });

  it('searchVehicleByRegNr', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: [{ v: 1 }] });
    expect(await searchVehicleByRegNr('123ABC')).toEqual([{ v: 1 }]);
    expect(post).toHaveBeenCalledWith('/v1/xroad/liiklusregister/paring2', { registrationNumber: '123ABC' });
    post.mockResolvedValue(undefined as never);
    expect(await searchVehicleByRegNr('x')).toEqual([]);
  });

  it('queryEtoimikQualifications', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { c: 1 } });
    const params = {
      caseNumber: '',
      referenceNumber: '',
      personalCode: '1',
      firstName: '',
      lastName: '',
      birthDate: '',
      sourceType: 's',
      sourceRecordId: 'r',
    };
    expect(await queryEtoimikQualifications(params)).toEqual({ c: 1 });
    expect(post).toHaveBeenCalledWith('/v1/xroad/etoimik/kvalifikatsioonid', params);
    post.mockResolvedValue(undefined as never);
    expect(await queryEtoimikQualifications(params)).toBeNull();
  });

  it('searchMtrSoidukikaart', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { m: 1 } });
    expect(await searchMtrSoidukikaart('123')).toEqual({ m: 1 });
    expect(post).toHaveBeenCalledWith('/v1/xroad/mtr/soidukikaart', {
      registryCode: '123',
      sourceType: 'compound_form',
      sourceRecordId: '',
    });
    post.mockResolvedValue(undefined as never);
    expect(await searchMtrSoidukikaart('1')).toBeNull();
  });
});
