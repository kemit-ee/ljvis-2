import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Text } from '@tedi-design-system/react/tedi';

interface DeleteConfirmModalProps {
  onDelete: () => void;
  subForm?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function DeleteConfirmModal({ onDelete, subForm, isOpen, onClose }: DeleteConfirmModalProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const titleKey = subForm ? 'common.deleteSubConfirmTitle' : 'common.deleteConfirmTitle';
  const bodyKey = subForm ? 'common.deleteSubConfirm' : 'common.deleteConfirm';

  const controlled = isOpen !== undefined;
  const open = controlled ? isOpen : internalOpen;
  const handleToggle = (next: boolean) => {
    if (!next) {
      if (controlled) onClose?.();
      else setInternalOpen(false);
    }
  };

  return (
    <>
      {!controlled && (
        <Button type="button" color="danger" onClick={() => setInternalOpen(true)}>
          {t('common.delete')}
        </Button>
      )}
      <Modal open={open} onToggle={handleToggle}>
        <Modal.Content>
          <Modal.Header title={t(titleKey)} closeButton />
          <Modal.Body>
            <Text>{t(bodyKey)}</Text>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Closer>
              <Button visualType="secondary" onClick={() => handleToggle(false)}>
                {t('common.cancel')}
              </Button>
            </Modal.Closer>
            <Button color="danger" onClick={onDelete}>
              {t('common.delete')}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
}
