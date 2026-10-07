import { post, get, ApiError } from '../../shared/api/client';
import type { PagedResponse } from '../../hooks/usePaginatedList';
import {
  tracked,
  untracked,
  withRevision,
  type RevisionScope,
} from './formRevisions';
import type {
  ForeignViolationForm,
  CompoundForm,
  FormSnapshot,
  DriveRestForm,
  LabourInspectionForm,
  FormAttachment,
  TechnicalCheckForm,
  TechnicalCheckFormListItem,
  TechnicalCheckVariant,
  TransportInterruptionForm,
  TransportInterruptionFormListItem,
  AdrForm,
  AdrFormListItem,
  GoodReputeForm,
  FormSearchRow,
  FormSearchExportRow,
} from './types';

export const searchForms = async (
  params: Record<string, string>,
): Promise<PagedResponse<FormSearchRow>> => {
  const rows = await get<FormSearchRow[]>(
    '/v1/control-forms/search/list',
    params,
  );
  return {
    content: rows,
    total: rows.length > 0 ? Number(rows[0].total ?? 0) : 0,
  };
};

export const getSearchCarrierCountries = () =>
  get<{ countryCode: string }[]>('/v1/control-forms/search/carrier-countries');

export const exportSearchForms = (params: Record<string, string>) =>
  get<FormSearchExportRow[]>('/v1/control-forms/search/export', params);

const technicalCheckPath = (variant: TechnicalCheckVariant) =>
  variant === 'vehicle' ? 'vehicle-technical' : 'trailer-technical';

export type ProceedingOutcomeFormType =
  | 'labour_inspection'
  | 'tram_control_card'
  | 'sp_driver'
  | 'sp_teammate'
  | 'vehicle_technical'
  | 'trailer_technical'
  | 'adr';

const PROCEEDING_OUTCOME_SCOPES: Record<ProceedingOutcomeFormType, RevisionScope> = {
  labour_inspection: 'labour-inspection',
  tram_control_card: 'tram',
  sp_driver: 'sp-driver',
  sp_teammate: 'sp-teammate',
  vehicle_technical: 'vehicle',
  trailer_technical: 'trailer',
  adr: 'adr',
};

export const saveProceedingOutcome = (
  formType: ProceedingOutcomeFormType,
  id: string | number,
  enforcementDecision?: string,
  proceedingClosureBasis?: string,
) =>
  untracked(
    PROCEEDING_OUTCOME_SCOPES[formType],
    id,
    post<{ id: number }[]>(
      '/v1/control-forms/proceeding-outcome/edit/save',
      {
        formType,
        id: String(id),
        enforcementDecision: enforcementDecision?.trim() ?? '',
        proceedingClosureBasis: proceedingClosureBasis?.trim() ?? '',
      },
    ),
  );

export const getForm = (id: number) =>
  tracked(
    'foreign-violation',
    get<ForeignViolationForm>('/v1/control-forms/foreign-violation-form', {
      q: String(id),
    }),
  );

export const saveForeignViolationForm = (data: ForeignViolationForm) =>
  tracked(
    'foreign-violation',
    post<ForeignViolationForm[]>(
      `/v1/control-forms/foreign-violation-form/edit/save`,
      withRevision('foreign-violation', data),
    ),
  );

export const confirmForeignViolationForm = (data: ForeignViolationForm) =>
  tracked(
    'foreign-violation',
    post<ForeignViolationForm[]>(
      `/v1/control-forms/foreign-violation-form/edit/confirm`,
      withRevision('foreign-violation', data),
    ),
  );

export const publishForeignViolationForm = (id: string) =>
  untracked('foreign-violation', id, post<ForeignViolationForm[]>(
    `/v1/control-forms/foreign-violation-form/edit/publish`,
    { id: String(id) },
  ));

export const getCarrierRegistryEmail = (companyRegCode: string, id?: string) =>
  get<{ email: string; found: boolean }>(
    '/v1/control-forms/foreign-violation-form/carrier-registry-email',
    { companyRegCode, id: id ?? '' },
  );

export const createVrFormFromNcr = (businessCaseId: string) =>
  post<{ id: string; formNumber: string; version: number }[]>(
    `/v1/control-forms/foreign-violation-form/edit/create-from-ncr`,
    { businessCaseId },
  );

export const checkDuplicateForeignViolationForm = (params: {
  companyRegCode?: string;
  vehicleRegNr?: string;
  inspectionDate?: string;
  excludeId?: string;
}) =>
  post<{ id: number; formNumber: string; status: string }[]>(
    `/v1/control-forms/foreign-violation-form/check-duplicate`,
    params as Record<string, unknown>,
  );

export const deleteForeignViolationForm = (
  id: string,
  form_number: string,
  old_status: string,
) =>
  untracked('foreign-violation', id, post<ForeignViolationForm[]>(
    `/v1/control-forms/foreign-violation-form/edit/delete`,
    { id, form_number, old_status },
  ));

export const getCompoundForm = (id: number, subFormId?: number) =>
  tracked(
    'compound',
    get<CompoundForm>(
      `/v1/control-forms/compound-form`,
      subFormId != null
        ? { q: String(id), subFormId: String(subFormId) }
        : { q: String(id) },
    ),
  );

export const saveCompoundForm = (data: CompoundForm) =>
  tracked(
    'compound',
    post<CompoundForm[]>(
      `/v1/control-forms/compound-form/edit/save`,
      withRevision('compound', data),
    ),
  );

export const confirmCompoundForm = (data: CompoundForm) =>
  tracked(
    'compound',
    post<CompoundForm[]>(
      `/v1/control-forms/compound-form/edit/confirm`,
      withRevision('compound', data),
    ),
  );

export const publishCompoundForm = (id: string) =>
  untracked('compound', id, post<CompoundForm[]>(
    `/v1/control-forms/compound-form/edit/publish`,
    { id: String(id) }
  ));

export const deleteCompoundForm = (
  id: string,
  old_status: string,
) =>
  untracked('compound', id, post<CompoundForm[]>(`/v1/control-forms/compound-form/edit/delete`, {
    id,
    old_status,
  }));

export const getFormSnapshots = (id: string, formType: string) =>
  get<FormSnapshot[]>(`/v1/control-forms/get-snapshots`, { id, formType });

export const uploadFormFile = (
  formPath: string,
  data: {
    formNumber: string;
    fileName: string;
    fileBase64: string;
    mimetype: string;
  },
) =>
  post<FormAttachment>(`/v1/control-forms/${formPath}/edit/files/upload`, data);

export const listFormFiles = async (formPath: string, formNumber: string): Promise<FormAttachment[]> => {
  const rows = await get<Array<FormAttachment & {
    file_name?: string;
    form_number?: string;
    s3_key?: string;
    created_at?: string;
    created_by?: string;
  }>>(`/v1/control-forms/${formPath}/read/files/list`, {
    form_number: formNumber,
  });
  return rows.map((row) => ({
    id: String(row.id),
    fileName: row.fileName ?? row.file_name ?? '',
    formNumber: row.formNumber ?? row.form_number,
    s3Key: row.s3Key ?? row.s3_key,
    status: row.status,
    createdAt: row.createdAt ?? row.created_at,
    createdBy: row.createdBy ?? row.created_by,
  }));
};

export const downloadFormFile = (formPath: string, id: string) =>
  get<{ url: string }>(`/v1/control-forms/${formPath}/read/files/download`, {
    q: String(id),
  });

export const deleteFormFile = (formPath: string, id: string) =>
  post<FormAttachment>(`/v1/control-forms/${formPath}/edit/files/delete`, { id: String(id) });

// ── TRAM (Transpordiamet) kontrollkaart ──────────────────────────────────
// ADR-002: üks eraldiseisev olem forms.tram_control_card, oma guarditud
// endpointid (tram_driver_form.write/read). GET-id käivad läbi
// map_tram_control_card DMapperi → CompoundForm-kujuline objekt.
// Funktsiooninimed jäävad *TramForm — useCompoundForm impordib neid.

export const getTramForm = (id: number) =>
  tracked('tram', get<CompoundForm>(`/v1/control-forms/tram-card/get`, { q: String(id) }));

export const saveTramForm = (data: CompoundForm) =>
  tracked(
    'tram',
    post<CompoundForm[]>(
      `/v1/control-forms/tram-card/edit/save`,
      withRevision('tram', data),
    ),
  );

export const confirmTramForm = (data: CompoundForm) =>
  tracked(
    'tram',
    post<CompoundForm[]>(
      `/v1/control-forms/tram-card/edit/confirm`,
      withRevision('tram', data),
    ),
  );

export const publishTramForm = (id: string) =>
  untracked('tram', id, post<CompoundForm[]>(`/v1/control-forms/tram-card/edit/publish`, {
    id: String(id),
  }));

export const deleteTramForm = (id: string, old_status: string) =>
  untracked('tram', id, post<CompoundForm[]>(`/v1/control-forms/tram-card/edit/delete`, {
    id,
    old_status,
  }));

export const getTramFormSnapshot = (id: string, formKey: string) =>
  post<CompoundForm>(`/v1/control-forms/tram-card/read/get-snapshot`, {
    id,
    formKey,
  });

export const getTramFormSnapshots = (id: string) =>
  get<FormSnapshot[]>(`/v1/control-forms/tram-card/get-snapshots`, { id });

export const getForeignViolationFormSnapshot = (id: string, formKey: string) =>
  post<ForeignViolationForm[]>(
    `/v1/control-forms/foreign-violation-form/read/get-snapshot`,
    { id, formKey },
  );

export const getCompoundFormSnapshot = (id: string, formKey: string) =>
  post<CompoundForm[]>(`/v1/control-forms/compound-form/read/get-snapshot`, {
    id,
    formKey,
  });

export const saveDriveRestForm = (scope: 'driver' | 'teammate', data: DriveRestForm) =>
  tracked(
    driveRestScope(scope),
    post<DriveRestForm[]>(
      `/v1/control-forms/drive-rest-form/${scope}/edit/save`,
      withRevision(driveRestScope(scope), data),
    ),
  );

export const confirmDriveRestForm = (
  scope: 'driver' | 'teammate',
  data: DriveRestForm,
) =>
  tracked(
    driveRestScope(scope),
    post<DriveRestForm[]>(
      `/v1/control-forms/drive-rest-form/${scope}/edit/confirm`,
      withRevision(driveRestScope(scope), data),
    ),
  );

export const publishDriveRestForm = (
  scope: 'driver' | 'teammate',
  id: string,
) =>
  untracked(driveRestScope(scope), id, post<DriveRestForm[]>(
    `/v1/control-forms/drive-rest-form/${scope}/edit/publish`,
    { id: String(id) },
  ));

const driveRestScope = (scope: 'driver' | 'teammate'): RevisionScope =>
  scope === 'driver' ? 'sp-driver' : 'sp-teammate';

export const getDriveRestForm = (scope: 'driver' | 'teammate', id: number) =>
  tracked(
    driveRestScope(scope),
    get<DriveRestForm>(`/v1/control-forms/${scope}-form`, {
      q: String(id),
    }),
  );

export const getDriveRestFormByCompoundFormKey = (
  scope: 'driver' | 'teammate',
  compoundFormKey: number,
): Promise<DriveRestForm | null> =>
  tracked(
    driveRestScope(scope),
    get<DriveRestForm | null>(
      `/v1/control-forms/sp-${scope}/read/get-by-compound-form-key`,
      { compoundFormKey: String(compoundFormKey) },
    ),
  )
    .then((res) => (res?.status === 'deleted' ? null : res))
    .catch((err: ApiError) => {
      if (err?.status === 300) return null;
      throw err;
    });

export const deleteDriveRestForm = (
  scope: 'driver' | 'teammate',
  id: string,
  form_number: string,
  old_status: string,
) =>
  untracked(driveRestScope(scope), id, post<DriveRestForm[]>(
    `/v1/control-forms/drive-rest-form/${scope}/edit/delete`,
    { id, form_number, old_status },
  ));

export const deleteTechnicalCheckForm = (
  scope: 'vehicle' | 'trailer',
  id: string,
  form_number: string,
  old_status: string,
) =>
  untracked(scope, id, post<TechnicalCheckForm[]>(
    `/v1/control-forms/${scope}-technical/edit/delete`,
    { id, form_number, old_status },
  ));

export const getDriveRestFormSnapshot = (
  scope: 'driver' | 'teammate',
  id: string,
  formKey: string,
) =>
  post<DriveRestForm[]>(
    `/v1/control-forms/sp-${scope}/read/get-snapshot`,
    { id, formKey },
  );

export const getLabourInspectionForm = (id: number) =>
  tracked(
    'labour-inspection',
    get<LabourInspectionForm>(`/v1/control-forms/labour-inspection`, {
      q: String(id),
    }),
  );

export const saveLabourInspectionForm = (data: LabourInspectionForm) =>
  tracked(
    'labour-inspection',
    post<LabourInspectionForm[]>(
      `/v1/control-forms/labour-inspection/edit/save`,
      withRevision('labour-inspection', data),
    ),
  );

export const confirmLabourInspectionForm = (data: LabourInspectionForm) =>
  tracked(
    'labour-inspection',
    post<LabourInspectionForm[]>(
      `/v1/control-forms/labour-inspection/edit/confirm`,
      withRevision('labour-inspection', data),
    ),
  );

export const publishLabourInspectionForm = (id: string) =>
  untracked('labour-inspection', id, post<LabourInspectionForm[]>(
    `/v1/control-forms/labour-inspection/edit/publish`,
    { id: String(id) },
  ));

export const deleteLabourInspectionForm = (id: string, old_status: string) =>
  untracked('labour-inspection', id, post<LabourInspectionForm[]>(
    `/v1/control-forms/labour-inspection/edit/delete`,
    { id, old_status },
  ));

export const getLabourInspectionFormSnapshot = (id: string, formKey: string) =>
  post<LabourInspectionForm[]>(
    `/v1/control-forms/labour-inspection/read/get-snapshot`,
    { id, formKey },
  );

export const getTechnicalCheckFormSnapshot = (
  variant: TechnicalCheckVariant,
  id: string,
  formKey: string,
) =>
  get<TechnicalCheckForm>(
    `/v1/control-forms/${technicalCheckPath(variant)}/get-snapshot`,
    { id, formKey },
  );

export const getTechnicalCheckForm = (
  variant: TechnicalCheckVariant,
  id: string,
) =>
  tracked(
    variant,
    get<TechnicalCheckForm>(`/v1/control-forms/${technicalCheckPath(variant)}`, {
      q: id,
    }),
  );

export const listTechnicalCheckFormsByCompoundFormKey = (
  variant: TechnicalCheckVariant,
  compoundFormKey: number,
) =>
  tracked(
    variant,
    get<TechnicalCheckFormListItem[]>(
      `/v1/control-forms/${technicalCheckPath(variant)}/get-by-compound-form-key`,
      { compoundFormKey: String(compoundFormKey) },
    ),
  ).then((list) => list.filter((item) => item.status !== 'deleted'));

export const saveTechnicalCheckForm = (
  variant: TechnicalCheckVariant,
  data: TechnicalCheckForm,
) =>
  tracked(
    variant,
    post<TechnicalCheckForm[]>(
      `/v1/control-forms/${technicalCheckPath(variant)}/edit/save`,
      withRevision(variant, data),
    ),
  );

export const confirmTechnicalCheckForm = (
  variant: TechnicalCheckVariant,
  data: TechnicalCheckForm,
) =>
  tracked(
    variant,
    post<TechnicalCheckForm[]>(
      `/v1/control-forms/${technicalCheckPath(variant)}/edit/confirm`,
      withRevision(variant, data),
    ),
  );

export const publishTechnicalCheckForm = (
  variant: TechnicalCheckVariant,
  id: string,
) =>
  untracked(variant, id, post<TechnicalCheckForm[]>(
    `/v1/control-forms/${technicalCheckPath(variant)}/edit/publish`,
    { id: String(id) }
  ));

export const getTransportInterruptionForm = (id: string) =>
  tracked(
    'transport-interruption',
    get<TransportInterruptionForm>(`/v1/control-forms/transport-interruption`, {
      q: id,
    }),
  );

export const listTransportInterruptionFormsByCompoundFormKey = (
  compoundFormKey: number,
) =>
  tracked(
    'transport-interruption',
    get<TransportInterruptionFormListItem[]>(
      `/v1/control-forms/transport-interruption/get-by-compound-form-key`,
      { compoundFormKey: String(compoundFormKey) },
    ),
  ).then((list) => list.filter((item) => item.status !== 'deleted'));

export const getTransportInterruptionFormSnapshot = (
  id: string,
  formKey: string,
) =>
  get<TransportInterruptionForm>(
    `/v1/control-forms/transport-interruption/get-snapshot`,
    { id, formKey },
  );

export const saveTransportInterruptionForm = (
  data: TransportInterruptionForm,
) =>
  tracked(
    'transport-interruption',
    post<TransportInterruptionForm[]>(
      `/v1/control-forms/transport-interruption/edit/save`,
      withRevision('transport-interruption', data),
    ),
  );

export const confirmTransportInterruptionForm = (
  data: TransportInterruptionForm,
) =>
  tracked(
    'transport-interruption',
    post<TransportInterruptionForm[]>(
      `/v1/control-forms/transport-interruption/edit/confirm`,
      withRevision('transport-interruption', data),
    ),
  );

export const publishTransportInterruptionForm = (
  id: string,
) =>
  untracked('transport-interruption', id, post<TransportInterruptionForm[]>(
    `/v1/control-forms/transport-interruption/edit/publish`,
    { id: String(id) }
  ));

export const getAdrForm = (id: string) =>
  tracked('adr', get<AdrForm>(`/v1/control-forms/adr-form`, { q: id }));

export const listAdrFormsByCompoundFormKey = (compoundFormKey: number) =>
  tracked(
    'adr',
    get<AdrFormListItem[]>(
      `/v1/control-forms/adr-form/get-by-compound-form-key`,
      { compoundFormKey: String(compoundFormKey) },
    ),
  ).then((list) => list.filter((item) => item.status !== 'deleted'));

export const getAdrFormSnapshot = (id: string, formKey: string) =>
  get<AdrForm>(`/v1/control-forms/adr-form/get-snapshot`, { id, formKey });

export const saveAdrForm = (data: AdrForm) =>
  tracked(
    'adr',
    post<AdrForm[]>(
      `/v1/control-forms/adr-form/edit/save`,
      withRevision('adr', data),
    ),
  );

export const confirmAdrForm = (data: AdrForm) =>
  tracked(
    'adr',
    post<AdrForm[]>(
      `/v1/control-forms/adr-form/edit/confirm`,
      withRevision('adr', data),
    ),
  );

export const publishAdrForm = (id: string) =>
  untracked('adr', id, post<AdrForm[]>(
    `/v1/control-forms/adr-form/edit/publish`,
    { id: String(id) }
  ));

export interface PdfRenderResponse {
  filename: string;
  contentType: 'application/pdf';
  base64: string;
  warnings: string[];
}

export const printControlForm = (
  endpoint: string,
  id?: string | number,
  blank = false,
  snapshotId?: string,
) =>
  post<PdfRenderResponse>(endpoint, {
    id: id == null ? '' : String(id),
    blank,
    snapshotId: snapshotId ?? '',
  });

export const saveAdrFormXroadFields = (data: {
  id: string;
  enforcementDecision?: string;
  proceedingClosureBasis?: string;
}) =>
  untracked('adr', data.id, post<AdrForm[]>(
    `/v1/control-forms/adr-form/edit/xroad/save-xroad-fields`,
    data,
  ));

export const deleteTransportInterruptionForm = (id: string, old_status: string) =>
  untracked('transport-interruption', id, post<TransportInterruptionForm[]>(
    `/v1/control-forms/transport-interruption/edit/delete`,
    { id, old_status },
  ));

export const deleteAdrForm = (id: string, old_status: string) =>
  untracked('adr', id, post<AdrForm[]>(
    `/v1/control-forms/adr-form/edit/delete`,
    { id, old_status },
  ));

export const deleteGoodReputeForm = (id: string, old_status: string) =>
  untracked('good-repute', id, post<GoodReputeForm[]>(`/v1/control-forms/good-repute/edit/delete`, {
    id,
    old_status,
  }));

export const getGoodReputeForm = (id: string) =>
  tracked('good-repute', get<GoodReputeForm>(`/v1/control-forms/good-repute`, { q: id }));

export const saveGoodReputeForm = (data: GoodReputeForm) =>
  tracked(
    'good-repute',
    post<GoodReputeForm[]>(
      `/v1/control-forms/good-repute/edit/save`,
      withRevision('good-repute', data),
    ),
  );

export const confirmGoodReputeForm = (data: GoodReputeForm) =>
  tracked(
    'good-repute',
    post<GoodReputeForm[]>(
      `/v1/control-forms/good-repute/edit/confirm`,
      withRevision('good-repute', data),
    ),
  );

export const publishGoodReputeForm = (id: string) =>
  untracked('good-repute', id, post<GoodReputeForm[]>(
    `/v1/control-forms/good-repute/edit/publish`,
    { id: String(id) },
  ));

export const getGoodReputeFormSnapshot = (id: string, formKey: string) =>
  get<GoodReputeForm[]>(`/v1/control-forms/good-repute/get-snapshot`, {
    id,
    formKey,
  });
