import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUpload, Alert } from '@tedi-design-system/react/tedi';
import type { FileUploadFile } from '@tedi-design-system/react/tedi';
import {
  uploadFormFile,
  listFormFiles,
  downloadFormFile,
  deleteFormFile,
} from '../../api';
import type { FormAttachment } from '../../types';

const ALLOWED_ACCEPT = '.pdf,.jpg,.jpeg,.png,.tiff';
const MAX_SIZE_MB = 10;

interface FileUploadBlockProps {
  /** URL path segment of the owning form, e.g. "foreign-violation-form", "vehicle-technical". */
  formPath: string;
  formNumber?: string;
  disabled?: boolean;
  /** Overrides the default `forms.shared.files.label` dropzone label. */
  label?: string;
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
  label,
}: FileUploadBlockProps) {
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState<FormAttachment[]>([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const refreshRequest = useRef(0);
  const pendingOperations = useRef(0);

  const refresh = useCallback(() => {
    if (!formNumber) return;
    const request = ++refreshRequest.current;
    listFormFiles(formPath, formNumber)
      .then((result) => {
        if (request === refreshRequest.current) setAttachments(result);
      })
      .catch(() => {
        if (request === refreshRequest.current) setError(true);
      });
  }, [formPath, formNumber]);

  useEffect(() => {
    refresh();
    return () => { refreshRequest.current += 1; };
  }, [refresh]);

  const files: FileUploadFile[] = attachments.map((a) => ({
    id: a.id,
    name: a.fileName,
  }));

  const handleChange = async (updated: FileUploadFile[]) => {
    if (!formNumber) return;
    const newFiles = updated.filter(
      (f): f is FileUploadFile & File => f instanceof File,
    );
    if (newFiles.length === 0) return;
    pendingOperations.current += 1;
    setBusy(true);
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
    pendingOperations.current -= 1;
    setBusy(pendingOperations.current > 0);
    refresh();
  };

  const handleDelete = async (file: FileUploadFile) => {
    if (!file.id) return;
    pendingOperations.current += 1;
    setBusy(true);
    try {
      await deleteFormFile(formPath, file.id);
      refresh();
    } catch {
      setError(true);
    } finally {
      pendingOperations.current -= 1;
      setBusy(pendingOperations.current > 0);
    }
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
    <div className="mb-1">
      <FileUpload
        name={`${formPath}-files`}
        label={label ?? t('forms.shared.files.label')}
        accept={ALLOWED_ACCEPT}
        maxSize={MAX_SIZE_MB}
        multiple
        files={files}
        onChange={handleChange}
        onDelete={handleDelete}
        disabled={disabled || busy || !formNumber}
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
