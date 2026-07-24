import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Heading,
  Text,
  StatusBadge,
} from '@tedi-design-system/react/tedi';
import {
  Modal,
  ModalCloser,
  ModalProvider,
  ModalTrigger,
  CardContent,
} from '@tedi-design-system/react/community';
import { useFormFiles } from '../hooks/useFormFiles';
import type { FormAttachment } from '../types/files';
import styles from './FormFiles.module.css';

interface FormFilesProps {
  formType: string;
  formNumber: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' })
  );
}

export const FormFiles = ({ formType, formNumber }: FormFilesProps) => {
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
  } = useFormFiles(formType, formNumber);

  if (!formNumber) return null;

  return (
    <Card>
      <Card.Content>
        <div className={styles.header}>
          <Heading element="h3">{t('form.files.title')}</Heading>
          <ModalProvider open={uploadModalOpen} onToggle={handleUploadModalToggle}>
            <ModalTrigger>
              <Button iconLeft="add">
                {t('form.files.addBtn')}
              </Button>
            </ModalTrigger>
            <Modal aria-labelledby="upload-modal-title">
              <CardContent>
                <Heading element="h2" id="upload-modal-title">
                  {t('form.files.uploadTitle')}
                </Heading>
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
                <div className="modal-actions">
                  <ModalCloser>
                    <Button visualType="secondary">
                      {t('common.cancel')}
                    </Button>
                  </ModalCloser>
                  <Button
                    onClick={handleUpload}
                    disabled={!fileToUpload || isUploading}
                    isLoading={isUploading}
                  >
                    {t('form.files.uploadBtn')}
                  </Button>
                </div>
              </CardContent>
            </Modal>
          </ModalProvider>
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
                      <ModalProvider>
                        <ModalTrigger>
                          <Button visualType="secondary" color="danger" iconLeft="delete">
                            {t('common.remove')}
                          </Button>
                        </ModalTrigger>
                        <Modal aria-labelledby={`delete-file-title-${file.id}`}>
                          <CardContent>
                            <Heading element="h2" id={`delete-file-title-${file.id}`}>
                              {t('form.files.confirmDeleteTitle')}
                            </Heading>
                            <Text>
                              {t('form.files.confirmDelete')}
                            </Text>
                            <Text modifiers="small" color="secondary">
                              {file.fileName}
                            </Text>
                            <div className="modal-actions">
                              <ModalCloser>
                                <Button visualType="secondary">
                                  {t('common.no')}
                                </Button>
                              </ModalCloser>
                              <ModalCloser>
                                <Button
                                  color="danger"
                                  onClick={() => handleDelete(file.id)}
                                  isLoading={isDeleting === file.id}
                                >
                                  {t('common.yes')}
                                </Button>
                              </ModalCloser>
                            </div>
                          </CardContent>
                        </Modal>
                      </ModalProvider>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Text color="secondary">{t('form.files.empty')}</Text>
        )}
      </Card.Content>
    </Card>
  );
};
