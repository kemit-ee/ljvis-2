import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }));

vi.mock('../../shared/api/client', () => ({
  get: getMock,
  post: postMock,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import * as api from './api';
import { ApiError } from '../../shared/api/client';
import { clearRevisionsForTests } from './formRevisions';

beforeEach(() => {
  getMock.mockReset().mockResolvedValue([]);
  postMock.mockReset().mockResolvedValue([]);
  clearRevisionsForTests();
});

const lastPost = () => postMock.mock.calls.at(-1)!;
const lastGet = () => getMock.mock.calls.at(-1)!;

describe('otsing', () => {
  it('searchForms tagastab kogusumma esimesest reast', async () => {
    getMock.mockResolvedValueOnce([{ id: 1, total: '7' }, { id: 2 }]);
    const res = await api.searchForms({ q: 'x' });
    expect(res.total).toBe(7);
    expect(res.content).toHaveLength(2);
    expect(lastGet()[0]).toBe('/v1/control-forms/search/list');
  });

  it('searchForms tühja vastuse korral on kogusumma 0', async () => {
    expect((await api.searchForms({})).total).toBe(0);
  });

  it('searchForms käsitleb puuduvat total-i nulliga', async () => {
    getMock.mockResolvedValueOnce([{ id: 1 }]);
    expect((await api.searchForms({})).total).toBe(0);
  });

  it('riikide ja ekspordi päringud', async () => {
    await api.getSearchCarrierCountries();
    expect(lastGet()[0]).toBe('/v1/control-forms/search/carrier-countries');
    await api.exportSearchForms({ a: 'b' });
    expect(lastGet()).toEqual(['/v1/control-forms/search/export', { a: 'b' }]);
  });
});

describe('menetlus', () => {
  it('saveProceedingOutcome trimmib ja stringib id', async () => {
    await api.saveProceedingOutcome('tram_control_card', 5, ' otsus ', ' alus ');
    expect(lastPost()[1]).toEqual({
      formType: 'tram_control_card',
      id: '5',
      enforcementDecision: 'otsus',
      proceedingClosureBasis: 'alus',
    });
  });

  it('saveProceedingOutcome asendab puuduvad väärtused tühja stringiga', async () => {
    await api.saveProceedingOutcome('adr', '9');
    expect(lastPost()[1]).toMatchObject({ enforcementDecision: '', proceedingClosureBasis: '' });
  });

  it('requestCarrierNotification ja getAdministrativeProcedure', async () => {
    await api.requestCarrierNotification('sp_driver', 3);
    expect(lastPost()[1]).toEqual({ formType: 'sp_driver', id: '3' });
    await api.getAdministrativeProcedure('tram-card', 4);
    expect(lastGet()[1]).toEqual({ formType: 'tram-card', id: '4' });
  });

  it('saveAdministrativeProcedure täidab vaikeväärtused', async () => {
    await api.saveAdministrativeProcedure('adr-form', 1, {});
    expect(lastPost()[1]).toMatchObject({
      klimClarificationDate: '',
      penaltyExpiredOrProcessed: 'false',
      adminProcedureDecision: '',
    });
    await api.saveAdministrativeProcedure('vehicle-technical', 1, {
      penaltyExpiredOrProcessed: true,
      adminProcedureDecision: ' jah ',
      klimClarificationDate: '2026-01-01',
    });
    expect(lastPost()[1]).toMatchObject({
      penaltyExpiredOrProcessed: 'true',
      adminProcedureDecision: 'jah',
      klimClarificationDate: '2026-01-01',
    });
    for (const t of ['drive-rest-form/driver', 'drive-rest-form/teammate', 'trailer-technical'] as const) {
      await api.saveAdministrativeProcedure(t, 2, {});
    }
    expect(postMock).toHaveBeenCalledTimes(5);
  });
});

describe('välisriigi rikkumise vorm', () => {
  it('päringud ja kirjutamised', async () => {
    await api.getForm(1);
    expect(lastGet()[1]).toEqual({ q: '1' });
    await api.saveForeignViolationForm({ id: 2 } as never);
    expect(lastPost()[0]).toContain('foreign-violation-form/edit/save');
    await api.confirmForeignViolationForm({ id: 2 } as never);
    expect(lastPost()[0]).toContain('/edit/confirm');
    await api.publishForeignViolationForm('2');
    expect(lastPost()[1]).toEqual({ id: '2' });
    await api.getCarrierRegistryEmail('123', '4');
    expect(lastGet()[1]).toEqual({ companyRegCode: '123', id: '4' });
    await api.getCarrierRegistryEmail('123');
    expect(lastGet()[1]).toEqual({ companyRegCode: '123', id: '' });
    await api.createVrFormFromNcr('bc');
    expect(lastPost()[1]).toEqual({ businessCaseId: 'bc' });
    await api.checkDuplicateForeignViolationForm({ companyRegCode: 'x' });
    expect(lastPost()[1]).toEqual({ companyRegCode: 'x' });
    await api.deleteForeignViolationForm('2', 'VR-1', 'saved');
    expect(lastPost()[1]).toEqual({ id: '2', form_number: 'VR-1', old_status: 'saved' });
    await api.getForeignViolationFormSnapshot('2', 'k');
    expect(lastPost()[1]).toEqual({ id: '2', formKey: 'k' });
  });
});

describe('koondvorm ja TRAM', () => {
  it('koondvormi kutsed', async () => {
    await api.getCompoundForm(1);
    expect(lastGet()[1]).toEqual({ q: '1' });
    await api.getCompoundForm(1, 2);
    expect(lastGet()[1]).toEqual({ q: '1', subFormId: '2' });
    await api.saveCompoundForm({ id: 1 } as never);
    await api.confirmCompoundForm({ id: 1 } as never);
    await api.publishCompoundForm('1');
    await api.deleteCompoundForm('1', 'saved');
    expect(lastPost()[1]).toEqual({ id: '1', old_status: 'saved' });
    await api.getFormSnapshots('1', 'compound');
    expect(lastGet()[1]).toEqual({ id: '1', formType: 'compound' });
    await api.getCompoundFormSnapshot('1', 'k');
    expect(lastPost()[1]).toEqual({ id: '1', formKey: 'k' });
  });

  it('TRAM kutsed', async () => {
    await api.getTramForm(1);
    expect(lastGet()[0]).toContain('tram-card/get');
    await api.saveTramForm({ id: 1 } as never);
    await api.confirmTramForm({ id: 1 } as never);
    await api.publishTramForm('1');
    await api.deleteTramForm('1', 'saved');
    await api.getTramFormSnapshot('1', 'k');
    await api.getTramFormSnapshots('1');
    expect(lastGet()[1]).toEqual({ id: '1' });
    expect(postMock).toHaveBeenCalledTimes(5);
  });
});

describe('failid', () => {
  it('uploadFormFile, downloadFormFile, deleteFormFile', async () => {
    await api.uploadFormFile('p', { formNumber: '1', fileName: 'a', fileBase64: 'b', mimetype: 'c' });
    expect(lastPost()[0]).toBe('/v1/control-forms/p/edit/files/upload');
    await api.downloadFormFile('p', '4');
    expect(lastGet()[1]).toEqual({ q: '4' });
    await api.deleteFormFile('p', '4');
    expect(lastPost()[1]).toEqual({ id: '4' });
  });

  it('listFormFiles toetab nii camelCase kui snake_case välju', async () => {
    getMock.mockResolvedValueOnce([
      { id: 1, fileName: 'a.pdf', formNumber: 'F', s3Key: 'k', status: 's', createdAt: 'c', createdBy: 'u' },
      { id: 2 },
    ]);
    const rows = await api.listFormFiles('p', 'F');
    expect(rows[0]).toMatchObject({ id: '1', fileName: 'a.pdf', createdBy: 'u' });
    expect(rows[1]).toMatchObject({ id: '2', fileName: '' });
  });
});

describe('sõidu- ja puhkeaja vorm', () => {
  it('kirjutamised mõlemas skoobis', async () => {
    for (const scope of ['driver', 'teammate'] as const) {
      await api.saveDriveRestForm(scope, { id: 1 } as never);
      expect(lastPost()[0]).toContain(`${scope}/edit/save`);
      await api.confirmDriveRestForm(scope, { id: 1 } as never);
      await api.publishDriveRestForm(scope, '1');
      await api.deleteDriveRestForm(scope, '1', 'F', 'saved');
      expect(lastPost()[1]).toEqual({ id: '1', form_number: 'F', old_status: 'saved' });
      await api.getDriveRestForm(scope, 1);
      expect(lastGet()[0]).toBe(`/v1/control-forms/${scope}-form`);
      await api.getDriveRestFormSnapshot(scope, '1', 'k');
      expect(lastPost()[0]).toContain(`sp-${scope}/read/get-snapshot`);
    }
  });

  it('getDriveRestFormByCompoundFormKey filtreerib kustutatud ja neelab 300', async () => {
    getMock.mockResolvedValueOnce({ id: 1, status: 'saved' });
    expect(await api.getDriveRestFormByCompoundFormKey('driver', 5)).toEqual({ id: 1, status: 'saved' });
    getMock.mockResolvedValueOnce({ id: 1, status: 'deleted' });
    expect(await api.getDriveRestFormByCompoundFormKey('teammate', 5)).toBeNull();
    getMock.mockResolvedValueOnce(null);
    expect(await api.getDriveRestFormByCompoundFormKey('driver', 5)).toBeNull();
    getMock.mockRejectedValueOnce(new ApiError('x', 300));
    expect(await api.getDriveRestFormByCompoundFormKey('driver', 5)).toBeNull();
    getMock.mockRejectedValueOnce(new ApiError('x', 500));
    await expect(api.getDriveRestFormByCompoundFormKey('driver', 5)).rejects.toThrow('x');
  });
});

describe('töökontroll', () => {
  it('kõik kutsed', async () => {
    await api.getLabourInspectionForm(1);
    await api.saveLabourInspectionForm({ id: 1 } as never);
    await api.confirmLabourInspectionForm({ id: 1 } as never);
    await api.publishLabourInspectionForm(1);
    await api.deleteLabourInspectionForm(1, 'saved');
    expect(lastPost()[1]).toEqual({ id: '1', old_status: 'saved' });
    await api.getLabourInspectionFormSnapshot('1', 'k');
    expect(lastPost()[0]).toContain('labour-inspection/read/get-snapshot');
    expect(getMock).toHaveBeenCalledTimes(1);
  });
});

describe('tehnokontroll', () => {
  it('kasutab variandipõhist teed', async () => {
    await api.getTechnicalCheckForm('vehicle', 1);
    expect(lastGet()[0]).toBe('/v1/control-forms/vehicle-technical');
    await api.getTechnicalCheckForm('trailer', 1);
    expect(lastGet()[0]).toBe('/v1/control-forms/trailer-technical');
    await api.getTechnicalCheckFormSnapshot('trailer', '1', 'k');
    expect(lastGet()[0]).toContain('trailer-technical/get-snapshot');
    getMock.mockResolvedValueOnce([{ status: 'saved' }, { status: 'deleted' }]);
    expect(await api.listTechnicalCheckFormsByCompoundFormKey('vehicle', 1)).toEqual([{ status: 'saved' }]);
    await api.saveTechnicalCheckForm('vehicle', { id: 1 } as never);
    await api.confirmTechnicalCheckForm('trailer', { id: 1 } as never);
    await api.publishTechnicalCheckForm('vehicle', '1');
    await api.deleteTechnicalCheckForm('trailer', 1, 'F', 'saved');
    expect(lastPost()[0]).toBe('/v1/control-forms/trailer-technical/edit/delete');
  });
});

describe('katkestus, ADR, hea maine', () => {
  it('katkestuse vorm', async () => {
    await api.getTransportInterruptionForm(1);
    getMock.mockResolvedValueOnce([{ status: 'deleted' }, { status: 'saved' }]);
    expect(await api.listTransportInterruptionFormsByCompoundFormKey(1)).toHaveLength(1);
    await api.getTransportInterruptionFormSnapshot('1', 'k');
    await api.saveTransportInterruptionForm({ id: 1 } as never);
    await api.confirmTransportInterruptionForm({ id: 1 } as never);
    await api.publishTransportInterruptionForm('1');
    await api.deleteTransportInterruptionForm(1, 'saved');
    expect(lastPost()[1]).toEqual({ id: '1', old_status: 'saved' });
  });

  it('ADR vorm', async () => {
    await api.getAdrForm(1);
    getMock.mockResolvedValueOnce([{ status: 'deleted' }, { status: 'saved' }]);
    expect(await api.listAdrFormsByCompoundFormKey(1)).toHaveLength(1);
    await api.getAdrFormSnapshot('1', 'k');
    await api.saveAdrForm({ id: 1 } as never);
    await api.confirmAdrForm({ id: 1 } as never);
    await api.publishAdrForm('1');
    await api.saveAdrFormXroadFields({ id: '1', enforcementDecision: 'x' });
    expect(lastPost()[0]).toContain('save-xroad-fields');
    await api.deleteAdrForm(1, 'saved');
    expect(lastPost()[1]).toEqual({ id: '1', old_status: 'saved' });
  });

  it('hea maine vorm', async () => {
    await api.getGoodReputeForm(1);
    await api.saveGoodReputeForm({ id: 1 } as never);
    await api.confirmGoodReputeForm({ id: 1 } as never);
    await api.publishGoodReputeForm(1);
    await api.getGoodReputeFormSnapshot('1', 'k');
    expect(lastGet()[1]).toEqual({ id: '1', formKey: 'k' });
    await api.deleteGoodReputeForm(1, 'saved');
    expect(lastPost()[1]).toEqual({ id: '1', old_status: 'saved' });
  });

  it('printControlForm', async () => {
    await api.printControlForm('/print');
    expect(lastPost()[1]).toEqual({ id: '', blank: false, snapshotId: '' });
    await api.printControlForm('/print', 5, true, 's');
    expect(lastPost()[1]).toEqual({ id: '5', blank: true, snapshotId: 's' });
  });
});
