import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import type { XRoadCompany } from '../../xroad/types';

interface CompanyPickerModalProps {
  companies: XRoadCompany[];
  onSelect: (company: XRoadCompany) => void;
  onClose: () => void;
}

export function CompanyPickerModal({
  companies,
  onSelect,
  onClose,
}: CompanyPickerModalProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{ maxWidth: 660, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
      <Card>
        <Card.Content>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <Heading element="h3">{t('xroad.companyPicker.title')}</Heading>
            <Button type="button" visualType="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
          {companies.map((company) => (
            <div
              key={company.registryCode}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 0',
                borderBottom: '1px solid #ddd',
              }}
            >
              <div>
                <Text element="p" modifiers="bold">
                  {company.companyName}
                  {company.legalForm ? ` (${company.legalForm})` : ''}
                  {company.status === 'K' && (
                    <span style={{ marginLeft: '0.5rem', color: '#c0392b', fontSize: '0.8em', fontWeight: 'normal' }}>
                      {company.statusText}
                    </span>
                  )}
                </Text>
                <Text element="p">
                  {company.registryCode}
                  {company.address ? ` · ${company.address}` : ''}
                </Text>
              </div>
              <Button type="button" onClick={() => onSelect(company)}>
                {t('xroad.companyPicker.select')}
              </Button>
            </div>
          ))}
        </Card.Content>
      </Card>
      </div>
    </div>
  );
}
