import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, StatusBadge, Text } from '@tedi-design-system/react/tedi';
import { fetchOutboundRecipients } from './api';
import type { OutboundRecipient } from './types';

interface OutboundReportModalProps {
  /** Outbound-logi kirje id. `null` = modaal suletud. Kutsuja annab `key={logId}`. */
  logId: string | null;
  onClose: () => void;
}

function recipientName(r: OutboundRecipient): string {
  if (r.personName) {
    return r.personCode ? `${r.personName} (${r.personCode})` : r.personName;
  }
  return r.personCode ?? '—';
}

/** UC-03 — ühe Postkast 2.0 kirja saajate nimekiri + saatmise tulemus. */
export function OutboundReportModal({ logId, onClose }: OutboundReportModalProps) {
  const { t } = useTranslation();
  const [recipients, setRecipients] = useState<OutboundRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!logId) return;
    let alive = true;
    fetchOutboundRecipients(logId)
      .then((r) => alive && setRecipients(r ?? []))
      .catch(() => alive && setRecipients([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [logId]);

  return (
    <Modal open={logId !== null} onToggle={(next) => { if (!next) onClose(); }}>
      <Modal.Content>
        <Modal.Header title={t('notifications.log.report')} closeButton />
        <Modal.Body>
          {loading ? (
            <Text>{t('common.loading')}</Text>
          ) : recipients.length === 0 ? (
            <Text>{t('notifications.empty')}</Text>
          ) : (
            <table className="ljvis-table">
              <thead>
                <tr>
                  <th>{t('notifications.log.name')}</th>
                  <th>{t('notifications.log.email')}</th>
                  <th>{t('notifications.log.sendingResult')}</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id}>
                    <td>{recipientName(r)}</td>
                    <td>{r.personEmail ?? '—'}</td>
                    <td>
                      <StatusBadge
                        color={r.sendingReport === 'ok' ? 'success' : 'danger'}
                      >
                        {r.sendingReport === 'ok'
                          ? t('notifications.log.sent')
                          : r.sendingReport}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Closer>
            <Button visualType="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </Modal.Closer>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
