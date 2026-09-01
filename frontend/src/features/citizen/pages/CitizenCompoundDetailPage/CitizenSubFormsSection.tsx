import { useTranslation } from 'react-i18next';
import { Card, Heading, Tag, Text } from '@tedi-design-system/react/tedi';
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
      <Text color="secondary">
        {subForm.subFormNumber}
        {subForm.resultType && (
          <>
            {' · '}
            {t(
              `citizen.compoundDetail.resultTypes.${subForm.resultType}`,
              subForm.resultType,
            )}
          </>
        )}
      </Text>

      {subForm.violations.length > 0 ? (
        <div className="mt-025">
          <Text modifiers="small" color="secondary">
            {t('citizen.compoundDetail.violationsTitle')}
          </Text>
          <div className={`mt-025 ${styles['violation-tags']}`}>
            {subForm.violations.map((violation, index) => {
              // sp_driver/vehicle/trailer use `severityCode` (MSI/VSI/SI/MI);
              // adr uses `riskCategory` (officer free-text, often MSI/VSI/SI/MI).
              const severityCode = violation.severityCode ?? violation.riskCategory ?? null;
              const severityLabel = severityCode
                ? t(
                    `citizen.compoundDetail.severity.${severityCode}`,
                    severityCode, // fallback = raw code, never "undefined"
                  )
                : null;
              // Reference text: EU regulation (sp_driver) or ADR provision
              const ref =
                violation.regulation
                  ? ` (${violation.regulation})`
                  : violation.adrProvision
                  ? ` (${violation.adrProvision})`
                  : '';
              // Nothing meaningful to show → skip rendering entirely
              if (!severityLabel && !ref) return null;
              return (
                <Tag key={index} color="danger">
                  {severityLabel}
                  {ref}
                </Tag>
              );
            })}
          </div>
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
