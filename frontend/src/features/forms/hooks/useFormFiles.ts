import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getFormAttachments,
  uploadFormAttachment,
  deleteFormAttachment,
  downloadFormAttachment,
} from '../api/filesApi';
import type { FormAttachment } from '../types/files';
import { ALLOWED_MIME_TYPES, ALLOWED_EXT, MAX_FILE_SIZE_MB } from '../types/files';

export function useFormFiles(formType: string, formNumber: string, canEdit: boolean) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FormAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const refreshFiles = async () => {
    setIsLoading(true);
    try {
      const result = await getFormAttachments(formType, formNumber);
      setFiles(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to load attachments', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (formNumber) refreshFiles();
  }, [formNumber]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setDuplicateWarning(null);
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = e.target.files[0];
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(t('form.files.error.tooLarge'));
      e.target.value = '';
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(selected.type) && !ALLOWED_EXT.test(selected.name)) {
      setFileError(t('form.files.error.invalidType'));
      e.target.value = '';
      return;
    }
    const duplicate = files.find(f => f.fileName === selected.name && f.status === 'active');
    if (duplicate) {
      setDuplicateWarning(t('form.files.error.duplicate'));
    }
    setFileToUpload(selected);
  };

  const handleUpload = async () => {
    if (!fileToUpload) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        await uploadFormAttachment(formType, {
          form_number: formNumber,
          file_name: fileToUpload.name,
          file_base64: base64String,
          mimetype: fileToUpload.type || 'application/octet-stream',
        });
        setFileToUpload(null);
        setFileError(null);
        setDuplicateWarning(null);
        setUploadModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await refreshFiles();
      } catch (error) {
        console.error('Upload failed', error);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(fileToUpload);
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(id);
    try {
      await deleteFormAttachment(formType, id);
      await refreshFiles();
    } catch (error) {
      console.error('Delete failed', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownload = async (file: FormAttachment) => {
    try {
      const result = await downloadFormAttachment(formType, file.id);
      const link = document.createElement('a');
      link.href = result.url;
      link.setAttribute('download', result.filename || file.fileName);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  const handleUploadModalToggle = (open: boolean) => {
    setUploadModalOpen(open);
    if (!open) {
      setFileToUpload(null);
      setFileError(null);
      setDuplicateWarning(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    files,
    canEdit,
    isLoading,
    isUploading,
    isDeleting,
    fileToUpload,
    fileError,
    uploadModalOpen,
    duplicateWarning,
    fileInputRef,
    handleFileChange,
    handleUpload,
    handleDelete,
    handleDownload,
    handleUploadModalToggle,
  };
}
