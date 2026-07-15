import { useTranslation } from 'react-i18next';
import { Button, Heading, Text } from '@tedi-design-system/react/tedi';
import { Modal, ModalCloser, ModalProvider, ModalTrigger, CardContent } from '@tedi-design-system/react/community';

interface DeleteConfirmModalProps {
  onDelete: () => void;
}

export function DeleteConfirmModal({ onDelete }: DeleteConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <ModalProvider>
      <ModalTrigger>
        <Button type="button" color="danger">
          {t('common.delete')}
        </Button>
      </ModalTrigger>
      <Modal aria-labelledby="delete-confirm-title">
        <CardContent>
          <Heading element="h2" id="delete-confirm-title">
            {t('common.deleteConfirmTitle')}
          </Heading>
          <div className="mt-1">
            <Text>{t('common.deleteConfirm')}</Text>
          </div>
          <div className="modal-actions">
            <ModalCloser>
              <Button visualType="secondary">
                {t('common.cancel')}
              </Button>
            </ModalCloser>
            <ModalCloser>
              <Button color="danger" onClick={onDelete}>
                {t('common.delete')}
              </Button>
            </ModalCloser>
          </div>
        </CardContent>
      </Modal>
    </ModalProvider>
  );
}
