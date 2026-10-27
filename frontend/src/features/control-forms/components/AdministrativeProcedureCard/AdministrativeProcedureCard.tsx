import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Card,
  ChoiceGroup,
  Heading,
  Textarea,
} from '@tedi-design-system/react/tedi';
import { useCanUseAdministrativeProcedure } from '../../../../hooks/useCanUseAdministrativeProcedure';
import { toIsoDate } from '../../../../hooks/dateUtils';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { MaskedDateField } from '../shared/MaskedDateField';
import {
  getAdministrativeProcedure,
  saveAdministrativeProcedure,
  type AdministrativeProcedure,
  type AdministrativeProcedureFormType,
} from '../../api';

interface Props {
  formType: AdministrativeProcedureFormType;
  /** Vormi võti (*_key); plokk ilmub alles siis, kui vorm on salvestatud. */
  formKey?: string | number | null;
  /**
   * Vaatamisrežiimis laeb lehe pärast salvestust uuesti, et päis näitaks uut versiooni.
   * Muutmisrežiimis ei laeta (poolelioleva vormi muudatused ei tohi kaduda).
   */
  reloadAfterSave?: boolean;
}

type DateField =
  | 'klimClarificationDate'
  | 'carrierExplanationDate'
  | 'penaltyValidUntil'
  | 'akvkNextMeetingDate'
  | 'commissionLastDecisionDate';

const DATE_FIELDS: { name: DateField; labelKey: string }[] = [
  {
    name: 'klimClarificationDate',
    labelKey: 'forms.foreign_violation.adminProc.klimDate',
  },
  {
    name: 'carrierExplanationDate',
    labelKey: 'forms.foreign_violation.adminProc.carrierDate',
  },
  {
    name: 'penaltyValidUntil',
    labelKey: 'forms.foreign_violation.adminProc.penaltyUntil',
  },
  {
    name: 'akvkNextMeetingDate',
    labelKey: 'forms.foreign_violation.adminProc.akvkDate',
  },
  {
    name: 'commissionLastDecisionDate',
    labelKey: 'forms.foreign_violation.adminProc.commissionDate',
  },
];

/**
 * Haldusmenetluse andmeplokk PPA andmevormidel ja Transpordiameti kontrollkaardil.
 * Nähtav ja täidetav ainult Transpordiameti ametnikule (ja administraatorile);
 * laeb ja salvestab ise (sõltumatu vormi enda salvestusest ja versioonidest).
 */
export const FORM_VERSION_SAVED_EVENT = 'ljvis:form-version-saved';

export function AdministrativeProcedureCard({
  formType,
  formKey,
  reloadAfterSave,
}: Props) {
  const { t } = useTranslation();
  const allowed = useCanUseAdministrativeProcedure();
  const [values, setValues] = useState<AdministrativeProcedure>({});
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'saved' | 'saveFailed' | 'loadFailed'
  >('idle');

  useEffect(() => {
    if (!allowed || !formKey) return;
    let cancelled = false;
    getAdministrativeProcedure(formType, formKey)
      .then((res) => {
        if (!cancelled) setValues(res ?? {});
      })
      .catch(() => {
        if (!cancelled) setStatus('loadFailed');
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, formType, formKey]);

  if (!allowed || !formKey) return null;

  const update = (patch: AdministrativeProcedure) => {
    setStatus('idle');
    setValues((prev) => ({ ...prev, ...patch }));
  };

  const save = async () => {
    try {
      const res = await saveAdministrativeProcedure(formType, formKey, values);
      setSavedVersion(res?.[0]?.version ?? null);
      setStatus('saved');
      window.dispatchEvent(
        new CustomEvent(FORM_VERSION_SAVED_EVENT, {
          detail: { formType, formKey: String(formKey) },
        }),
      );
      if (reloadAfterSave) setTimeout(() => window.location.reload(), 900);
    } catch {
      setStatus('saveFailed');
    }
  };

  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h3" className="mb-1">
          {t('forms.admin_procedure_form')}
        </Heading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
            gap: '1rem',
          }}
        >
          {DATE_FIELDS.map(({ name, labelKey }) => (
            <MaskedDateField
              key={name}
              id={name}
              label={t(labelKey)}
              monthYearSelectType="grid"
              selected={
                values[name] ? new Date(values[name] as string) : undefined
              }
              onSelect={(v) => update({ [name]: toIsoDate(v) })}
              placeholder={t('common.dateFieldPlaceholder')}
            />
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea
              id="adminProcedureDecision"
              label={t('forms.foreign_violation.adminProc.decision')}
              value={values.adminProcedureDecision ?? ''}
              placeholder={t('common.enterNotesPlaceholder')}
              maxHeight="8rem"
              onChange={(v) => update({ adminProcedureDecision: v })}
            />
          </div>
        </div>
        <ChoiceGroup
          id="adminProcCheckboxes"
          name="adminProcCheckboxes"
          inputType="checkbox"
          label=""
          value={
            values.penaltyExpiredOrProcessed
              ? ['penaltyExpiredOrProcessed']
              : []
          }
          items={[
            {
              id: 'penaltyExpiredOrProcessed',
              label: t('forms.foreign_violation.adminProc.expired'),
              value: 'penaltyExpiredOrProcessed',
            },
          ]}
          onChange={(val) => {
            const vals = Array.isArray(val) ? val : [val];
            update({
              penaltyExpiredOrProcessed: vals.includes(
                'penaltyExpiredOrProcessed',
              ),
            });
          }}
        />
        {status !== 'idle' && (
          <Alert
            className="mt-1"
            type={status === 'saved' ? 'success' : 'danger'}
            size="small"
          >
            {status === 'saved' && savedVersion != null
              ? t('forms.shared.administrativeProcedure.savedVersion', {
                  version: savedVersion,
                })
              : t(`forms.shared.administrativeProcedure.${status}`)}
          </Alert>
        )}
        <div className="mt-1">
          <AsyncButton onClick={save}>
            {t('forms.shared.administrativeProcedure.save')}
          </AsyncButton>
        </div>
      </Card.Content>
    </Card>
  );
}
