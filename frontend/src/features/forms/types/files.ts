export interface FormAttachment {
  id: number;
  formNumber: string;
  fileName: string;
  s3Key: string;
  status: string;
  createdAt: string;
  createdBy: string;
}

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.etsi.asic-e+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ALLOWED_EXT = /\.(pdf|jpe?g|png|asice|doc|docx)$/i;

export const MAX_FILE_SIZE_MB = 20;
