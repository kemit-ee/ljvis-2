import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Heading,
  Text,
  StatusBadge,
  Modal,
} from '@tedi-design-system/react/tedi';
import { useFormFiles } from '../hooks/useFormFiles';
import type { FormAttachment } from '../types/files';
import styles from './FormFiles.module.css';

interface FormFilesProps {
  formType: string;
  formNumber: string;
  canEdit: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' })
  );
}

export const FormFiles = ({ formType, formNumber, canEdit }: FormFilesProps) => {
  const { t } = useTranslation();
  const {
    files,
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
  } = useFormFiles(formType, formNumber, canEdit);

  const [deleteModalFileId, setDeleteModalFileId] = useState<number | null>(null);
  const fileForDeleteModal = files.find((f) => f.id === deleteModalFileId) ?? null;

  if (!formNumber) return null;

  return (
    <Card className="mb-1">
      <Card.Content>
        <div className={styles.header}>
          <Heading element="h3">{t('form.files.title')}</Heading>
          {canEdit && (
          <Button iconLeft="add" onClick={() => handleUploadModalToggle(true)}>
            {t('form.files.addBtn')}
          </Button>)}
          <Modal open={uploadModalOpen} onToggle={handleUploadModalToggle}>
            <Modal.Content>
              <Modal.Header
                title={t('form.files.uploadTitle')}
                closeButton
              />
              <Modal.Body>
                <div className={styles.uploadInputWrapper}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpeg,.jpg,.png,.asice,.doc,.docx"
                  />
                  <Text modifiers="small" color="secondary">
                    {t('form.files.limits')}
                  </Text>
                  {fileError && (
                    <Text modifiers="small" color="danger">
                      {fileError}
                    </Text>
                  )}
                  {duplicateWarning && !fileError && (
                    <Text modifiers="small" color="warning">
                      {duplicateWarning}
                    </Text>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Modal.Closer>
                  <Button visualType="secondary">
                    {t('common.cancel')}
                  </Button>
                </Modal.Closer>
                <Button
                  onClick={handleUpload}
                  disabled={!fileToUpload || isUploading}
                  isLoading={isUploading}
                >
                  {t('form.files.uploadBtn')}
                </Button>
              </Modal.Footer>
            </Modal.Content>
          </Modal>
        </div>

        {isLoading ? (
          <Text>{t('common.loading')}</Text>
        ) : files.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeadRow}>
                <th className={styles.th}>{t('form.files.col.name')}</th>
                <th className={styles.th}>{t('form.files.col.uploaded')}</th>
                <th className={styles.th}>{t('form.files.col.status')}</th>
                <th className={styles.thActions} />
              </tr>
            </thead>
            <tbody>
              {files.map((file: FormAttachment) => (
                <tr key={file.id} className={styles.tableRow}>
                  <td className={styles.tdName}>
                    <Text>{file.fileName}</Text>
                  </td>
                  <td className={styles.tdDate}>
                    <Text modifiers="small">{formatDate(file.createdAt)}</Text>
                  </td>
                  <td className={styles.tdStatus}>
                    <StatusBadge
                      color={file.status === 'active' ? 'success' : 'neutral'}
                      status={file.status === 'active' ? 'success' : undefined}
                    >
                      {file.status === 'active'
                        ? t('form.files.status.active')
                        : t('form.files.status.deleted')}
                    </StatusBadge>
                  </td>
                  <td className={styles.tdActions}>
                    <div className={styles.actionButtons}>
                      <Button
                        visualType="secondary"
                        iconLeft="download"
                        onClick={() => handleDownload(file)}
                      >
                        {t('common.download')}
                      </Button>
                      {canEdit && (
                      <Button
                        visualType="secondary"
                        color="danger"
                        iconLeft="delete"
                        onClick={() => setDeleteModalFileId(file.id)}
                      >
                        {t('common.remove')}
                      </Button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Text color="secondary">{t('form.files.empty')}</Text>
        )}

        <Modal
          open={deleteModalFileId !== null}
          onToggle={(open) => {
            if (!open) setDeleteModalFileId(null);
          }}
        >
          <Modal.Content>
            <Modal.Header title={t('form.files.confirmDeleteTitle')} closeButton />
            <Modal.Body>
              <Text>{t('form.files.confirmDelete')}</Text>
              {fileForDeleteModal && (
                <Text modifiers="small" color="secondary">
                  {fileForDeleteModal.fileName}
                </Text>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Modal.Closer>
                <Button visualType="secondary">{t('common.no')}</Button>
              </Modal.Closer>
              <Button
                color="danger"
                onClick={() => {
                  if (fileForDeleteModal) {
                    handleDelete(fileForDeleteModal.id);
                    setDeleteModalFileId(null);
                  }
                }}
                isLoading={fileForDeleteModal ? isDeleting === fileForDeleteModal.id : false}
              >
                {t('common.yes')}
              </Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      </Card.Content>
    </Card>
  );
};
