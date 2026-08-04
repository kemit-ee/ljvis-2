import { post, get } from '../../shared/api/client';
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

export const insertCompoundForm = (data: CompoundForm) =>
  post<CompoundForm[]>(
    `/v1/control-forms/compound-form/edit/insert`,
    data as unknown as Record<string, unknown>,
  );

export const getCompoundForm = (id: number) =>
  post<CompoundForm>(`/v1/control-forms/compound-form/read/get`, { id });

export const updateCompoundForm = (data: CompoundForm) =>
  post<CompoundForm[]>(
    `/v1/control-forms/compound-form/edit/update`,
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
  post<FormAttachment[]>(`/v1/control-forms/${formPath}/read/files/list`, {
    formNumber,
  });

export const downloadFormFile = (formPath: string, id: string) =>
  post<{ url: string }>(`/v1/control-forms/${formPath}/read/files/download`, {
    id,
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

export const insertDriveRestForm = (
  scope: 'driver' | 'teammate',
  data: DriveRestForm,
) =>
  post<DriveRestForm[]>(
    `/v1/control-forms/drive-rest-form/${scope}/edit/insert`,
    data as unknown as Record<string, unknown>,
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

export const getTechnicalCheckForm = (
  variant: TechnicalCheckVariant,
  id: string,
) =>
  post<TechnicalCheckForm>(
    `/v1/control-forms/${technicalCheckPath(variant)}/read/get`,
    { id },
  );

export const listTechnicalCheckFormsByCompoundFormKey = (
  variant: TechnicalCheckVariant,
  compoundFormKey: number,
) =>
  post<TechnicalCheckFormListItem[]>(
    `/v1/control-forms/${technicalCheckPath(variant)}/read/get-by-compound-form-key`,
    { compoundFormKey },
  );

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
  post<TransportInterruptionForm>(
    `/v1/control-forms/transport-interruption/read/get`,
    { id },
  );

export const listTransportInterruptionFormsByCompoundFormKey = (
  compoundFormKey: number,
) =>
  post<TransportInterruptionFormListItem[]>(
    `/v1/control-forms/transport-interruption/read/get-by-compound-form-key`,
    { compoundFormKey },
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
