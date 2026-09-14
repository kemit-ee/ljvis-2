import { Button, Heading } from '@tedi-design-system/react/tedi';
import { useTranslation } from 'react-i18next';

interface Props {
  tabIds: string[];
  labels: Record<string, string>;
  onSelect: (tabId: string) => void;
}

export function SelectedFormsNavigation({ tabIds, labels, onSelect }: Props) {
  const { t } = useTranslation();
  if (tabIds.length === 0) return null;

  return (
    <nav className="mt-2" aria-label={t('forms.compound.selectedForms')}>
      <Heading element="h3" className="mb-1">
        {t('forms.compound.selectedForms')}
      </Heading>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {tabIds.map((tabId) => (
          <Button
            key={tabId}
            type="button"
            visualType="secondary"
            onClick={() => {
              onSelect(tabId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {labels[tabId] ?? tabId}
          </Button>
        ))}
      </div>
    </nav>
  );
}
