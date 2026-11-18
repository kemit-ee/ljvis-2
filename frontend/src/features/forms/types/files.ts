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
  'application/x-tachograph-ddd',
];

export const ALLOWED_EXT = /\.(pdf|jpe?g|png|asice|doc|docx|ddd)$/i;

/** Tahhograafi andmefaili (.ddd) MIME-tüüp; brauser ei tea seda ja annab `File.type` tühjana. */
export const DDD_MIME_TYPE = 'application/x-tachograph-ddd';

/** MIME-tüüp, mis saadetakse serverile: `.ddd` failile fikseeritud tüüp, muul juhul brauseri oma. */
export const resolveUploadMime = (file: Pick<File, 'name' | 'type'>): string =>
  /\.ddd$/i.test(file.name) ? DDD_MIME_TYPE : file.type || 'application/octet-stream';

export const MAX_FILE_SIZE_MB = 20;
