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
import { uploadErrorKey } from '../../../../shared/api/uploadErrors';
import { resolveUploadMime } from '../../../forms/types/files';

const ALLOWED_ACCEPT = '.pdf,.jpg,.jpeg,.png,.tiff,.ddd';
const MAX_SIZE_MB = 10;
const GENERIC_ERROR = 'forms.shared.files.error';

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
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refreshRequest = useRef(0);
  const pendingOperations = useRef(0);

  // A failed list (e.g. nothing uploaded yet) is not a user-facing error —
  // the alert is reserved for failed upload / delete / download actions.
  const refresh = useCallback(() => {
    if (!formNumber) return;
    const request = ++refreshRequest.current;
    listFormFiles(formPath, formNumber)
      .then((result) => {
        if (request === refreshRequest.current) setAttachments(result);
      })
      .catch(() => {
        if (request === refreshRequest.current) setAttachments([]);
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
    setErrorKey(null);
    for (const raw of newFiles) {
      try {
        const base64 = await fileToBase64(raw);
        await uploadFormFile(formPath, {
          formNumber,
          fileName: raw.name,
          fileBase64: base64,
          mimetype: resolveUploadMime(raw),
        });
      } catch (err) {
        setErrorKey(uploadErrorKey(err) ?? GENERIC_ERROR);
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
      setErrorKey(GENERIC_ERROR);
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
      setErrorKey(GENERIC_ERROR);
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
      {errorKey && (
        <Alert type="danger">{t(errorKey)}</Alert>
      )}
    </div>
  );
}
