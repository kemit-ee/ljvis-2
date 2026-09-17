import { useTranslation } from 'react-i18next';
import { Button, Modal, Text } from '@tedi-design-system/react/tedi';

interface XroadLogContentModalProps {
  title: string;
  /** X-tee päringu/vastuse sisu (JSON string). `null` = modaal suletud. */
  content: string | null;
  onClose: () => void;
}

function prettyPrint(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

/** Näitab väljuva päringu (`requestXml`) või saabunud vastuse (`responseXml`) täissisu. */
export function XroadLogContentModal({
  title,
  content,
  onClose,
}: XroadLogContentModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open={content !== null} onToggle={(next) => { if (!next) onClose(); }}>
      <Modal.Content>
        <Modal.Header title={title} closeButton />
        <Modal.Body>
          {content ? (
            <pre className="xroad-log-content">{prettyPrint(content)}</pre>
          ) : (
            <Text>{t('xroadLogs.empty')}</Text>
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
