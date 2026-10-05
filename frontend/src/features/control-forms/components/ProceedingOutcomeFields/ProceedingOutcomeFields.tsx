import { Card, Heading, TextArea } from '@tedi-design-system/react/tedi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../auth/AuthContext';
import { PUNISHMENT_REGISTER_PERMISSION } from '../../proceedingOutcome';

interface Props {
  status?: string;
  enforcementDecision?: string;
  proceedingClosureBasis?: string;
  onChange: (field: 'enforcementDecision' | 'proceedingClosureBasis', value: string) => void;
  titleKey?: string;
}

export function ProceedingOutcomeFields({
  status,
  enforcementDecision,
  proceedingClosureBasis,
  onChange,
  titleKey = 'forms.shared.proceedingOutcome.title',
}: Props) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const editable = status === 'confirmed' && hasPermission(PUNISHMENT_REGISTER_PERMISSION);

  if (status !== 'confirmed' && status !== 'published') return null;

  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h3" className="mb-1">{t(titleKey)}</Heading>
        <TextArea
          id="enforcementDecision"
          label={t('forms.shared.proceedingOutcome.enforcementDecision')}
          value={enforcementDecision ?? ''}
          onChange={(value) => onChange('enforcementDecision', value)}
          disabled={!editable}
        />
        <TextArea
          id="proceedingClosureBasis"
          label={t('forms.shared.proceedingOutcome.proceedingClosureBasis')}
          value={proceedingClosureBasis ?? ''}
          onChange={(value) => onChange('proceedingClosureBasis', value)}
          disabled={!editable}
        />
      </Card.Content>
    </Card>
  );
}
