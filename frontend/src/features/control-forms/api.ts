import { post, postSilent, get, ApiError } from '../../shared/api/client';
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
} from './types';

const technicalCheckPath = (variant: TechnicalCheckVariant) =>
  variant === 'vehicle' ? 'vehicle-technical' : 'trailer-technical';

export const getForm = (id: number) =>
    get<ForeignViolationForm>('/v1/control-forms/foreign-violation-form', { q: String(id) });

export const insertForeignViolationForm = (
  data: ForeignViolationForm,
) => post<ForeignViolationForm[]>('/v1/control-forms/foreign-violation-form', data as unknown as Record<string, unknown>);

export const updateForeignViolationForm = (data: ForeignViolationForm) =>
  post<ForeignViolationForm[]>(
    `/v1/control-forms/foreign-violation-form/edit/update`,
    data as unknown as Record<string, unknown>,
  );

export const confirmForeignViolationForm = (data: ForeignViolationForm) =>
  post<ForeignViolationForm[]>(
    `/v1/control-forms/foreign-violation-form/edit/confirm`,
    data as unknown as Record<string, unknown>,
  );

export const deleteForeignViolationForm = (
  id: string,
  form_number: string,
  old_status: string,
) =>
  post<ForeignViolationForm[]>(
    `/v1/control-forms/foreign-violation-form/edit/delete`,
    { id, form_number, old_status },
  );

export const getCompoundForm = (id: number, subFormId?: number) =>
  get<CompoundForm>(
    `/v1/control-forms/compound-form`,
    subFormId != null ? { q: String(id), subFormId: String(subFormId) } : { q: String(id) },
  );

export const saveCompoundForm = (data: CompoundForm) =>
  post<CompoundForm[]>(
    `/v1/control-forms/compound-form/edit/save`,
    data as unknown as Record<string, unknown>,
  );

export const confirmCompoundForm = (data: CompoundForm) =>
  post<CompoundForm[]>(
    `/v1/control-forms/compound-form/edit/confirm`,
    data as unknown as Record<string, unknown>,
  );

export const deleteCompoundForm = (
  id: string,
  form_number: string,
  old_status: string,
) =>
  post<CompoundForm[]>(`/v1/control-forms/compound-form/edit/delete`, {
    id,
    form_number,
    old_status,
  });

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
) => post<FormAttachment>(`/v1/control-forms/${formPath}/edit/files/upload`, data);

export const listFormFiles = (formPath: string, formNumber: string) =>
  get<FormAttachment[]>(`/v1/control-forms/${formPath}/read/files/list`, {
    form_number: formNumber,
  });

export const downloadFormFile = (formPath: string, id: string) =>
  get<{ url: string }>(`/v1/control-forms/${formPath}/read/files/download`, {
    q: id,
  });

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
  post<DriveRestForm[]>(
    `/v1/control-forms/drive-rest-form/${scope}/edit/save`,
    data as unknown as Record<string, unknown>,
  );

export const confirmDriveRestForm = (
  scope: 'driver' | 'teammate',
  data: DriveRestForm,
) =>
  post<DriveRestForm[]>(
    `/v1/control-forms/drive-rest-form/${scope}/edit/confirm`,
    data as unknown as Record<string, unknown>,
  );

export const getDriveRestForm = (scope: 'driver' | 'teammate', id: number) =>
  get<DriveRestForm>(`/v1/control-forms/${scope}-form`, {
    q: String(id),
  });

export const getDriveRestFormByCompoundFormKey = (
  scope: 'driver' | 'teammate',
  compoundFormKey: number,
): Promise<DriveRestForm | null> =>
  postSilent<DriveRestForm | null>(
    `/v1/control-forms/drive-rest-form/${scope}/read/get-by-compound-form-key`,
    { compoundFormKey },
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
  post<DriveRestForm[]>(
    `/v1/control-forms/drive-rest-form/${scope}/edit/delete`,
    { id, form_number, old_status },
  );

export const deleteTechnicalCheckForm = (
  scope: 'vehicle' | 'trailer',
  id: string,
  form_number: string,
  old_status: string,
) =>
  post<TechnicalCheckForm[]>(
    `/v1/control-forms/${scope}-technical/edit/delete`,
    { id, form_number, old_status },
  );

export const getDriveRestFormSnapshot = (
  scope: 'driver' | 'teammate',
  id: string,
  formKey: string,
) =>
  post<DriveRestForm[]>(
    `/v1/control-forms/drive-rest-form/${scope}/read/get-snapshot`,
    { id, formKey },
  );

export const getLabourInspectionForm = (id: number) =>
  get<LabourInspectionForm>(`/v1/control-forms/labour-inspection`, {
    q: String(id),
  });

export const saveLabourInspectionForm = (data: LabourInspectionForm) =>
  post<LabourInspectionForm[]>(
    `/v1/control-forms/labour-inspection/edit/save`,
    data as unknown as Record<string, unknown>,
  );

export const confirmLabourInspectionForm = (data: LabourInspectionForm) =>
  post<LabourInspectionForm[]>(
    `/v1/control-forms/labour-inspection/edit/confirm`,
    data as unknown as Record<string, unknown>,
  );

export const deleteLabourInspectionForm = (id: string, old_status: string) =>
  post<LabourInspectionForm[]>(
    `/v1/control-forms/labour-inspection/edit/delete`,
    { id, old_status },
  );

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
  get<TechnicalCheckForm>(
    `/v1/control-forms/${technicalCheckPath(variant)}`,
    { q: id },
  );

export const listTechnicalCheckFormsByCompoundFormKey = (
  variant: TechnicalCheckVariant,
  compoundFormKey: number,
) =>
  get<TechnicalCheckFormListItem[]>(
    `/v1/control-forms/${technicalCheckPath(variant)}/get-by-compound-form-key`,
    { compoundFormKey: String(compoundFormKey) },
  ).then((list) => list.filter((item) => item.status !== 'deleted'));

export const saveTechnicalCheckForm = (
  variant: TechnicalCheckVariant,
  data: TechnicalCheckForm,
) =>
  post<TechnicalCheckForm[]>(
    `/v1/control-forms/${technicalCheckPath(variant)}/edit/save`,
    data as unknown as Record<string, unknown>,
  );

export const confirmTechnicalCheckForm = (
  variant: TechnicalCheckVariant,
  data: TechnicalCheckForm,
) =>
  post<TechnicalCheckForm[]>(
    `/v1/control-forms/${technicalCheckPath(variant)}/edit/confirm`,
    data as unknown as Record<string, unknown>,
  );

export const saveTechnicalCheckFormXroadFields = (
  variant: TechnicalCheckVariant,
  data: {
    id: string;
    extraordinaryInspectionDate?: string;
    enforcementDecision?: string;
    proceedingClosureBasis?: string;
  },
) =>
  post<TechnicalCheckForm[]>(
    `/v1/control-forms/${technicalCheckPath(variant)}/edit/xroad/save-xroad-fields`,
    data,
  );

export const getTransportInterruptionForm = (id: string) =>
  get<TransportInterruptionForm>(
    `/v1/control-forms/transport-interruption`,
    { q: id },
  );

export const listTransportInterruptionFormsByCompoundFormKey = (
  compoundFormKey: number,
) =>
  get<TransportInterruptionFormListItem[]>(
    `/v1/control-forms/transport-interruption/get-by-compound-form-key`,
    { compoundFormKey: String(compoundFormKey) },
  );

export const getTransportInterruptionFormSnapshot = (id: string, formKey: string) =>
  get<TransportInterruptionForm>(
    `/v1/control-forms/transport-interruption/get-snapshot`,
    { id, formKey },
  );

export const saveTransportInterruptionForm = (
  data: TransportInterruptionForm,
) =>
  post<TransportInterruptionForm[]>(
    `/v1/control-forms/transport-interruption/edit/save`,
    data as unknown as Record<string, unknown>,
  );

export const confirmTransportInterruptionForm = (
  data: TransportInterruptionForm,
) =>
  post<TransportInterruptionForm[]>(
    `/v1/control-forms/transport-interruption/edit/confirm`,
    data as unknown as Record<string, unknown>,
  );

export const getAdrForm = (id: string) =>
  get<AdrForm>(`/v1/control-forms/adr-form`, { q: id });

export const listAdrFormsByCompoundFormKey = (compoundFormKey: number) =>
  get<AdrFormListItem[]>(
    `/v1/control-forms/adr-form/get-by-compound-form-key`,
    { compoundFormKey: String(compoundFormKey) },
  );

export const getAdrFormSnapshot = (id: string, formKey: string) =>
  get<AdrForm>(`/v1/control-forms/adr-form/get-snapshot`, { id, formKey });

export const saveAdrForm = (data: AdrForm) =>
  post<AdrForm[]>(
    `/v1/control-forms/adr-form/edit/save`,
    data as unknown as Record<string, unknown>,
  );

export const confirmAdrForm = (data: AdrForm) =>
  post<AdrForm[]>(
    `/v1/control-forms/adr-form/edit/confirm`,
    data as unknown as Record<string, unknown>,
  );

export const saveAdrFormXroadFields = (data: {
  id: string;
  enforcementDecision?: string;
  proceedingClosureBasis?: string;
}) =>
  post<AdrForm[]>(
    `/v1/control-forms/adr-form/edit/xroad/save-xroad-fields`,
    data,
  );

export const deleteTransportInterruptionForm = (id: string, old_status: string) =>
  post<TransportInterruptionForm[]>(
    `/v1/control-forms/transport-interruption/edit/delete`,
    { id, old_status },
  );

export const deleteAdrForm = (id: string, old_status: string) =>
  post<AdrForm[]>(
    `/v1/control-forms/adr-form/edit/delete`,
    { id, old_status },
  );

export const deleteGoodReputeForm = (id: string, old_status: string) =>
  post<GoodReputeForm[]>(`/v1/control-forms/good-repute/edit/delete`, {
    id,
    old_status,
  });

export const getGoodReputeForm = (id: string) =>
  get<GoodReputeForm>(`/v1/control-forms/good-repute`, { q: id });

export const saveGoodReputeForm = (data: GoodReputeForm) =>
  post<GoodReputeForm[]>(
    `/v1/control-forms/good-repute/edit/save`,
    data as unknown as Record<string, unknown>,
  );

export const confirmGoodReputeForm = (data: GoodReputeForm) =>
  post<GoodReputeForm[]>(
    `/v1/control-forms/good-repute/edit/confirm`,
    data as unknown as Record<string, unknown>,
  );

export const getGoodReputeFormSnapshot = (id: string, formKey: string) =>
  get<GoodReputeForm[]>(
    `/v1/control-forms/good-repute/get-snapshot`,
    { id, formKey },
  );
