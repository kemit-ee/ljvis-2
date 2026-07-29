import { get, post, del } from '../../../shared/api/client';
import type { FormAttachment } from '../types/files';

export type { FormAttachment };

const base = (formType: string) => `/v1/control-forms/${formType}`;

export const getFormAttachments = (formType: string, formNumber: string): Promise<FormAttachment[]> =>
    get<FormAttachment[]>(`${base(formType)}/read/files/list`, { form_number: formNumber });

export const uploadFormAttachment = (
    formType: string,
    fileData: { form_number: string; file_name: string; file_base64: string; mimetype: string },
): Promise<{ message: string; data: FormAttachment }> =>
    post(`${base(formType)}/edit/upload`, fileData);

export const deleteFormAttachment = (formType: string, id: number): Promise<FormAttachment> =>
    del(`${base(formType)}/edit/delete`, { q: id.toString() });

export const downloadFormAttachment = (formType: string, id: number): Promise<{ url: string; filename: string }> =>
    get(`${base(formType)}/read/files/download`, { q: id.toString() });
