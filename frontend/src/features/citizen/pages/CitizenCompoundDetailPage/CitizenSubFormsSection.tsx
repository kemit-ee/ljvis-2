import { useTranslation } from 'react-i18next';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import type {
  CitizenSubForm,
  CitizenSubFormType,
} from '../../types';
import styles from './CitizenSubFormsSection.module.css';

const SUB_FORM_TYPE_ORDER: CitizenSubFormType[] = [
  'sp_driver',
  'sp_teammate',
  'vehicle_technical',
  'trailer_technical',
  'adr',
  'kv',
];

/**
 * Read-only rendering of every published sub-form attached to a citizen's
 * koondvorm (GET/v1/citizen/forms/compound/sub-forms.yml). Before this
 * component existed, the citizen detail page showed only the koondvorm's
 * own general/company/drivers fields — a control with e.g. a vehicle
 * technical inspection or an ADR check looked, to the citizen, like it had
 * no further detail at all, even when sub-forms with violations existed.
 */
export function CitizenSubFormsSection({
  subForms,
}: {
  subForms: CitizenSubForm[];
}) {
  const { t } = useTranslation();

  const grouped = SUB_FORM_TYPE_ORDER.map((formType) => ({
    formType,
    items: subForms.filter((sf) => sf.formType === formType),
  })).filter((group) => group.items.length > 0);

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h3">
          {t('citizen.compoundDetail.subFormsSection')}
        </Heading>
        {grouped.length === 0 && (
          <Text color="secondary" className="mt-05">
            {t('citizen.compoundDetail.subFormsEmpty')}
          </Text>
        )}
        {grouped.map(({ formType, items }) => (
          <div key={formType} className="mt-1">
            <Text modifiers="bold">
              {t(`citizen.compoundDetail.subFormType.${formType}`)}
            </Text>
            {items.map((subForm) => (
              <SubFormCard key={`${formType}-${subForm.formKey}`} subForm={subForm} />
            ))}
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}

function SubFormCard({ subForm }: { subForm: CitizenSubForm }) {
  const { t } = useTranslation();

  return (
    <div className={`mt-05 ${styles['sub-form-card']}`}>
      <Text color="secondary">{subForm.subFormNumber}</Text>
      {subForm.resultType && (
        <Text color="secondary">
          {t('citizen.compoundDetail.resultLabel')}:{' '}
          {t(
            `citizen.compoundDetail.resultTypes.${subForm.resultType}`,
            subForm.resultType,
          )}
        </Text>
      )}
      {subForm.resultType === 'misdemeanor_proceedings' &&
        subForm.enforcementDecision && (
          <Text color="secondary">
            {t('citizen.compoundDetail.penaltyBasisLabel')}:{' '}
            {subForm.enforcementDecision}
          </Text>
        )}

      {subForm.violations.length > 0 ? (
        <div className="mt-025">
          <Text modifiers="small" color="secondary">
            {t('citizen.compoundDetail.violationsTitle')}
          </Text>
          <ul className="mt-025">
            {subForm.violations.map((violation, index) => {
              const reference = [violation.regulation, violation.article]
                .filter(Boolean)
                .join(' ');
              return (
                <li key={`${violation.code}-${index}`}>
                  {violation.description || violation.code} ({violation.severity})
                  {reference && ` – ${reference}`}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        subForm.resultType !== 'ok' && (
          <Text modifiers="small" color="secondary" className="mt-025">
            {t('citizen.compoundDetail.noViolations')}
          </Text>
        )
      )}

      {subForm.notes && (
        <Text modifiers="small" color="secondary" className="mt-025">
          {t('citizen.compoundDetail.notes')}: {subForm.notes}
        </Text>
      )}
    </div>
  );
}
