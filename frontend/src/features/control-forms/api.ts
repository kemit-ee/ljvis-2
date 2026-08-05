import { post, postSilent, get, ApiError } from '../../shared/api/client';
import type {
  ForeignViolationForm,
  CompoundForm,
  FormSnapshot,
  DriveRestForm,
  LabourInspectionForm,
} from './types';

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

export const getCompoundForm = (id: number, subFormId?: number) =>
  get<CompoundForm>(
    `/v1/control-forms/compound-form`,
    subFormId != null ? { q: String(id), subFormId: String(subFormId) } : { q: String(id) },
  );

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

export const getDriveRestForm = (scope: 'driver' | 'teammate', id: number) =>
  get<DriveRestForm>(`/v1/control-forms/${scope}-form`, {
    q: String(id),
  });

export const updateDriveRestForm = (
  scope: 'driver' | 'teammate',
  data: DriveRestForm,
) =>
  post<DriveRestForm[]>(
    `/v1/control-forms/drive-rest-form/${scope}/edit/update`,
    data as unknown as Record<string, unknown>,
  );

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
