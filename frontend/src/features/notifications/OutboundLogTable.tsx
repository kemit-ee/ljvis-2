import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  StatusBadge,
  Text,
} from '@tedi-design-system/react/tedi';
import type { OutboundLogEntry, OutboundRecipient } from './types';
import { fetchOutboundLog, fetchOutboundRecipients, resendNotification } from './api';

interface OutboundReportModalProps {
  logId: string;
  onClose: () => void;
}

function OutboundReportModal({ logId, onClose }: OutboundReportModalProps) {
  const { t } = useTranslation();
  const [recipients, setRecipients] = React.useState<OutboundRecipient[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchOutboundRecipients(logId)
      .then(setRecipients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [logId]);

  return (
    <div style={{ padding: '1rem' }}>
      <Text>{t('notifications.log.report')}</Text>
      {loading ? (
        <Text>{t('common.loading')}</Text>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('notifications.log.addressee')}</th>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('notifications.log.status')}</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: '4px 8px' }}>{r.person_email ?? r.person_name ?? r.person_code ?? '-'}</td>
                <td style={{ padding: '4px 8px' }}>
                  <StatusBadge color={r.sending_report === 'ok' ? 'success' : 'danger'}>
                    {r.sending_report === 'ok' ? t('notifications.log.sent') : r.sending_report}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Button onClick={onClose} style={{ marginTop: '1rem' }}>
        {t('common.close')}
      </Button>
    </div>
  );
}

interface ResendModalProps {
  logId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ResendModal({ logId, onClose, onSuccess }: ResendModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const handleResend = async () => {
    if (!email) return;
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
    <div style={{ padding: '1rem' }}>
      <Text>{t('notifications.log.resend')}</Text>
      <div style={{ marginTop: '0.5rem' }}>
        <label>
          <Text>{t('notifications.log.addressee')}</Text>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px' }}
          />
        </label>
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
        <Button onClick={() => void handleResend()} disabled={sending || !email}>
          {t('notifications.log.resend')}
        </Button>
        <Button visualType="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

export function OutboundLogTable(): React.ReactElement {
  const { t } = useTranslation();
  const [entries, setEntries] = React.useState<OutboundLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reportLogId, setReportLogId] = React.useState<string | null>(null);
  const [resendLogId, setResendLogId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetchOutboundLog()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  if (loading) return <Text>{t('common.loading')}</Text>;

  if (reportLogId)
    return (
      <OutboundReportModal
        logId={reportLogId}
        onClose={() => setReportLogId(null)}
      />
    );

  if (resendLogId)
    return (
      <ResendModal
        logId={resendLogId}
        onClose={() => setResendLogId(null)}
        onSuccess={load}
      />
    );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px' }}>{t('notifications.log.sendDate')}</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>{t('notifications.log.messageType')}</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>{t('notifications.log.status')}</th>
            <th style={{ padding: '8px' }} />
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '16px', textAlign: 'center' }}>
                <Text>{t('notifications.empty')}</Text>
              </td>
            </tr>
          ) : entries.map((entry) => (
            <tr key={entry.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>
                {new Date(entry.send_date).toLocaleDateString('et-EE')}
              </td>
              <td style={{ padding: '8px' }}>
                {t(`notifications.types.${entry.message_type}`, { defaultValue: entry.message_type })}
              </td>
              <td style={{ padding: '8px' }}>
                <StatusBadge color={entry.status === 'sent' ? 'success' : 'danger'}>
                  {t(`notifications.log.${entry.status}`)}
                </StatusBadge>
              </td>
              <td style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                <Button
                  visualType="secondary"
                  size="small"
                  onClick={() => setReportLogId(entry.id)}
                >
                  {t('notifications.log.report')}
                </Button>
                {entry.status === 'sent_error' && (
                  <Button
                    size="small"
                    onClick={() => setResendLogId(entry.id)}
                  >
                    {t('notifications.log.resend')}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
