import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUpload, Alert } from '@tedi-design-system/react/tedi';
import type { FileUploadFile } from '@tedi-design-system/react/tedi';
import {
  uploadFormFile,
  listFormFiles,
  downloadFormFile,
} from '../../api';
import type { FormAttachment } from '../../types';

const ALLOWED_ACCEPT = '.pdf,.jpg,.jpeg,.png,.tiff';
const MAX_SIZE_MB = 10;

interface FileUploadBlockProps {
  /** URL path segment of the owning form, e.g. "foreign-violation-form", "vehicle-technical". */
  formPath: string;
  formNumber?: string;
  disabled?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.substring(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FileUploadBlock({
  formPath,
  formNumber,
  disabled,
}: FileUploadBlockProps) {
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState<FormAttachment[]>([]);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    if (!formNumber) return;
    listFormFiles(formPath, formNumber).then(setAttachments).catch(() => setError(true));
  }, [formPath, formNumber]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const files: FileUploadFile[] = attachments.map((a) => ({
    id: a.id,
    name: a.fileName,
  }));

  const handleChange = async (updated: FileUploadFile[]) => {
    if (!formNumber) return;
    const newFiles = updated.filter(
      (f): f is FileUploadFile & File => !f.id && f instanceof File,
    );
    for (const raw of newFiles) {
      try {
        const base64 = await fileToBase64(raw);
        await uploadFormFile(formPath, {
          formNumber,
          fileName: raw.name,
          fileBase64: base64,
          mimetype: raw.type,
        });
      } catch {
        setError(true);
      }
    }
    refresh();
  };

  const handleDelete = () => {
    // File deletion is not part of the current scope; attachments list is refreshed from server.
    refresh();
  };

  const handleDownload = async (file: FileUploadFile) => {
    if (!file.id) return;
    try {
      const { url } = await downloadFormFile(formPath, file.id);
      window.open(url, '_blank');
    } catch {
      setError(true);
    }
  };

  return (
    <div>
      <FileUpload
        name={`${formPath}-files`}
        label={t('forms.shared.files.label')}
        accept={ALLOWED_ACCEPT}
        maxSize={MAX_SIZE_MB}
        multiple
        files={files}
        onChange={handleChange}
        onDelete={handleDelete}
        disabled={disabled || !formNumber}
        helper={
          !formNumber
            ? { text: t('forms.shared.files.save_first'), type: 'hint' }
            : undefined
        }
      />
      {attachments.length > 0 && (
        <ul>
          {attachments.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => handleDownload({ id: a.id, name: a.fileName } as FileUploadFile)}>
                {a.fileName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <Alert type="danger">{t('forms.shared.files.error')}</Alert>
      )}
    </div>
  );
}
