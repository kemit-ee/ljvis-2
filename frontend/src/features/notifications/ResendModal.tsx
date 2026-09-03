import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, TextField } from '@tedi-design-system/react/tedi';
import { resendNotification } from './api';

interface ResendModalProps {
  /** Outbound-logi kirje id, mida uuesti saata. `null` = modaal suletud. */
  logId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * UC-04 — ebaõnnestunud Postkast 2.0 kirja uuesti saatmine uuele (või samale)
 * e-posti aadressile. "Saada uuesti" on mitteaktiivne kuni e-post on sisestatud.
 * Kutsuja annab `key={logId}`, nii et iga avamine alustab puhtalt.
 */
export function ResendModal({ logId, onClose, onSuccess }: ResendModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    if (!logId || !email) return;
    setSending(true);
    try {
      await resendNotification(logId, email);
      onSuccess();
      onClose();
    } catch {
      setSending(false);
    }
  };

  return (
    <Modal open={logId !== null} onToggle={(next) => { if (!next) onClose(); }}>
      <Modal.Content>
        <Modal.Header title={t('notifications.log.resendTitle')} closeButton />
        <Modal.Body>
          <TextField
            id="resend-email"
            input={{ type: 'email' }}
            label={t('notifications.log.email')}
            value={email}
            onChange={setEmail}
          />
        </Modal.Body>
        <Modal.Footer>
          <Modal.Closer>
            <Button visualType="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </Modal.Closer>
          <Button onClick={() => void handleResend()} disabled={sending || !email}>
            {t('notifications.log.resend')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
