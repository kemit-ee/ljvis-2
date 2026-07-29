import { post, get } from '../../shared/api/client';
import type {
  ForeignViolationForm,
  CompoundForm,
  FormSnapshot,
  DriveRestForm,
  LabourInspectionForm,
} from './types';

export const getForm = (id: number) =>
  post<ForeignViolationForm>(
    `/v1/control-forms/foreign-violation-form/read/get`,
    { id },
  );

export const insertForeignViolationForm = (data: ForeignViolationForm) =>
  post<ForeignViolationForm[]>(
    `/v1/control-forms/foreign-violation-form/edit/insert`,
    data as unknown as Record<string, unknown>,
  );

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

export const deleteLabourInspectionForm = (
  id: string,
  form_number: string,
  old_status: string,
) =>
  post<LabourInspectionForm[]>(
    `/v1/control-forms/labour-inspection/edit/delete`,
    { id, form_number, old_status },
  );

export const getLabourInspectionFormSnapshot = (id: string, formKey: string) =>
  post<LabourInspectionForm[]>(
    `/v1/control-forms/labour-inspection/read/get-snapshot`,
    { id, formKey },
  );
