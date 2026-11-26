import { Card, Heading } from '@tedi-design-system/react/tedi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../auth/AuthContext';
import { PUNISHMENT_REGISTER_PERMISSION } from '../../proceedingOutcome';
import { Textarea } from '../../../../shared/components/Textarea';
import { PROCEEDING_OUTCOME_MAX_LENGTH } from '../../../../shared/textLimits';

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
        <Textarea
          id="enforcementDecision"
          input={{ maxLength: PROCEEDING_OUTCOME_MAX_LENGTH }}
          label={t('forms.shared.proceedingOutcome.enforcementDecision')}
          value={enforcementDecision ?? ''}
          onChange={(value) => onChange('enforcementDecision', value)}
          disabled={!editable}
        />
        <Textarea
          id="proceedingClosureBasis"
          input={{ maxLength: PROCEEDING_OUTCOME_MAX_LENGTH }}
          label={t('forms.shared.proceedingOutcome.proceedingClosureBasis')}
          value={proceedingClosureBasis ?? ''}
          onChange={(value) => onChange('proceedingClosureBasis', value)}
          disabled={!editable}
        />
      </Card.Content>
    </Card>
  );
}
