import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import type { Classifier } from '../../types';

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`field-name ${className || ''}`}>
      <Text modifiers="bold" color="secondary">{label}</Text>
      <div className="mt-025">{children}</div>
    </div>
  );
}

interface ClassifierInfoCardProps {
  classifier: Classifier;
  canEditClassifier: boolean;
  onEdit: () => void;
}

export function ClassifierInfoCard({ classifier, canEditClassifier, onEdit }: ClassifierInfoCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="mb-1">
      <Card.Content>
        <div className="card-main">
          <Heading element="h3">
            {t('classifiers.data')}
          </Heading>
          {canEditClassifier &&
            <Button
              iconLeft="edit"
              visualType="secondary"
              size="small"
              onClick={onEdit}
            >
              {t('users.edit')}
            </Button>}
        </div>
        <div>
          <Field label={t('classifiers.name')} className="mb-1">{classifier.name}</Field>
          <Field label={t('classifiers.description')}>{classifier.description || '—'}</Field>
        </div>
      </Card.Content>
    </Card>
  );
}
