import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../../constants/constants';
import { downloadHubWsdl, fetchHubWsdlList, type HubWsdlItem } from '../api';

/** Haldus > ERRU: Hubi WSDL-id, mida tõmmatakse taustal sTESTA kaudu ja pakutakse allalaadimiseks. */
export function ErruHubWsdlPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const allowed = hasPermission(PERMISSIONS.XROAD_LOG_READ);
  const [items, setItems] = useState<HubWsdlItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    fetchHubWsdlList()
      .then(setItems)
      .catch(() => {
        // Vea toast'i näitab API klient ise.
      });
  }, [allowed]);

  const handleDownload = useCallback(async (name: string) => {
    setBusy(name);
    try {
      const file = await downloadHubWsdl(name);
      const url = URL.createObjectURL(
        new Blob([file.content], { type: file.contentType }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Vea toast'i näitab API klient ise.
    } finally {
      setBusy(null);
    }
  }, []);

  if (!allowed) return <Text>{t('common.forbidden')}</Text>;

  return (
    <Card className="mt-05">
      <Card.Content>
        <div className="card-main">
          <Heading element="h1">{t('erruHubWsdl.title')}</Heading>
        </div>
        <Text>{t('erruHubWsdl.description')}</Text>
        <div className="mt-05">
          {items.map((item) => (
            <div
              key={item.name}
              className="card-main"
              data-testid={`hub-wsdl-${item.name}`}
            >
              <div>
                <Text modifiers="bold">{item.label}</Text>
                <Text>{item.url}</Text>
              </div>
              <Button
                id={`hub-wsdl-download-${item.name}`}
                visualType="secondary"
                onClick={() => handleDownload(item.name)}
                disabled={busy !== null}
                isLoading={busy === item.name}
              >
                {t('erruHubWsdl.download')}
              </Button>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
