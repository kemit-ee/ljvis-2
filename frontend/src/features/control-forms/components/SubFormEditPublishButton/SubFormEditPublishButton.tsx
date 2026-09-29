import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { hasProceeding, type ProceedingOutcomeForm } from '../../proceedingOutcome';

interface SubFormEditPublishButtonProps {
  form: { id?: unknown; status?: string } & ProceedingOutcomeForm;
  canPublish?: boolean;
  onPublish?: () => Promise<unknown>;
  isDirty: () => boolean;
}

/**
 * „Avalikusta" nupp kinnitatud alamvormi muutmiskaardil. Muutmisrežiim püsib
 * seni, kuni mõni teine alamvorm on „Salvestatud", seega ei jõua kinnitatud
 * alamvorm vaatekaardile — avalikustamine ei tohi sõltuda teiste alamvormide
 * olekust. Väärteomenetlusega alamvormi avalikustatakse vaatekaardilt, kus
 * saab täita menetluse tulemuse.
 */
export function SubFormEditPublishButton({
  form,
  canPublish,
  onPublish,
  isDirty,
}: SubFormEditPublishButtonProps) {
  const { t } = useTranslation();
  const [unsaved, setUnsaved] = useState(false);

  if (!canPublish || !onPublish || form.status !== 'confirmed' || hasProceeding(form)) {
    return null;
  }

  return (
    <>
      {unsaved && (
        <Alert type="warning" size="small" onClose={() => setUnsaved(false)}>
          {t('forms.publishUnsavedChanges')}
        </Alert>
      )}
      <AsyncButton
        type="button"
        onClick={async () => {
          if (isDirty()) {
            setUnsaved(true);
            return;
          }
          setUnsaved(false);
          await onPublish();
        }}
      >
        {t('common.publish')}
      </AsyncButton>
    </>
  );
}
