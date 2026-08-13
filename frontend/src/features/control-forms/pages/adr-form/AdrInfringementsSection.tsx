import { useTranslation } from 'react-i18next';
import { ChoiceGroup, TextField, TextArea } from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { AdrInfringementEntry } from '../../types';
import { GroupedClassifierChecklist } from '../../components/shared/GroupedClassifierChecklist';

const CHECK_STATUS_OPTIONS = ['checked', 'not_possible', 'not_applicable'] as const;

interface AdrInfringementsSectionProps {
  items: ClassifierEntry[];
  getInfringement: (classifierValueKey: number) => AdrInfringementEntry;
  setInfringement: (
    classifierValueKey: number,
    patch: Partial<AdrInfringementEntry>,
  ) => void;
  disabled?: boolean;
}

/**
 * LJVIS2-141 §4.10: grouped static checklist from classifier
 * DANGEROUS_GOODS_INFRINGEMENTS_NEW (3 groups, 19 rows). NOTE: the classifier
 * itself is not yet seeded in this environment — `items` will be empty until
 * the classifier values are added, at which point this section renders
 * without any further code changes.
 */
export function AdrInfringementsSection({
  items,
  getInfringement,
  setInfringement,
  disabled,
}: AdrInfringementsSectionProps) {
  const { t } = useTranslation();

  return (
    <GroupedClassifierChecklist
      items={items}
      renderRow={(item) => {
        const entry = getInfringement(item.classifierValueKey);
        return (
          <div key={item.classifierValueKey} className="mb-1">
            <p>
              {item.code} — {item.name}
            </p>
            <ChoiceGroup
              id={`infringement-${item.classifierValueKey}`}
              name={`infringement-${item.classifierValueKey}`}
              label={t('forms.adr.infringements.checkStatus')}
              hideLabel
              inputType="radio"
              value={entry.checkStatus}
              onChange={(val) => {
                if (disabled) return;
                setInfringement(item.classifierValueKey, {
                  checkStatus: (val as AdrInfringementEntry['checkStatus']) ?? '',
                });
              }}
              items={CHECK_STATUS_OPTIONS.map((opt) => ({
                id: `infringement-${item.classifierValueKey}-${opt}`,
                value: opt,
                label: t(`forms.adr.infringements.status.${opt}`),
                disabled,
              }))}
            />
            {entry.checkStatus && (
              <>
                <TextField
                  id={`infringement-${item.classifierValueKey}-riskCategory`}
                  label={t('forms.adr.infringements.riskCategory')}
                  value={entry.riskCategory ?? ''}
                  onChange={(v) =>
                    setInfringement(item.classifierValueKey, { riskCategory: v })
                  }
                  disabled={disabled}
                />
                <TextField
                  id={`infringement-${item.classifierValueKey}-adrProvision`}
                  label={t('forms.adr.infringements.adrProvision')}
                  value={entry.adrProvision ?? ''}
                  onChange={(v) =>
                    setInfringement(item.classifierValueKey, { adrProvision: v })
                  }
                  input={{ maxLength: 100 }}
                  disabled={disabled}
                />
                <TextArea
                  id={`infringement-${item.classifierValueKey}-notes`}
                  label={t('forms.adr.infringements.notes')}
                  value={entry.notes ?? ''}
                  onChange={(v) =>
                    setInfringement(item.classifierValueKey, { notes: v })
                  }
                  disabled={disabled}
                />
              </>
            )}
          </div>
        );
      }}
    />
  );
}
