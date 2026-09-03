import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  ChoiceGroup,
  TextField,
  Select,
  Text,
} from '@tedi-design-system/react/tedi';
import type { AdrInfringementRecord, AdrParticipant, AdrRiskCategory } from '../../types';

export const RISK_CATEGORIES: AdrRiskCategory[] = ['I', 'II', 'III'];
export const PARTICIPANTS: AdrParticipant[] = ['Ci', 'C', 'Ce', 'L', 'P', 'F', 'To', 'U'];
export const REG_CODE_NONE = 'NONE';

export interface RegCodeOption {
  /** 2016/403 rikkumisliigi number ("10") või REG_CODE_NONE. */
  value: string;
  label: string;
  severity: string | null;
}

interface AdrInfringementRecordCardProps {
  index: number;
  record: AdrInfringementRecord;
  regCodeOptions: RegCodeOption[];
  onChange: (patch: Partial<AdrInfringementRecord>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

/**
 * Üks tuvastatud rikkumine (kliimaministri määruse lisa 1 / "ADR Kontrollkaardi
 * tehniline suunis" rea 17 näidis). Kasutatakse nii kontrollkaardi punkti kui
 * "muu rikkumise" all.
 */
export function AdrInfringementRecordCard({
  index,
  record,
  regCodeOptions,
  onChange,
  onRemove,
  disabled,
}: AdrInfringementRecordCardProps) {
  const { t } = useTranslation();
  const idp = `adr-record-${index}`;

  const regEnabled = record.responsibleParticipants.includes('C');
  const participantOptions = PARTICIPANTS.map((p) => ({
    value: p,
    label: t(`forms.adr.infringements.participantOptions.${p}`),
  }));
  const selectedRegOption =
    regCodeOptions.find((o) => o.value === (record.reg2016403Code ?? '')) ?? null;

  return (
    <Card className="mb-1">
      <Card.Content>
        <Text modifiers="bold" className="mb-1">
          {t('forms.adr.infringements.record', { n: index + 1 })}
        </Text>

        <ChoiceGroup
          id={`${idp}-risk`}
          name={`${idp}-risk`}
          label={t('forms.adr.infringements.riskCategory')}
          inputType="radio"
          direction="row"
          className="mb-1"
          value={record.riskCategory}
          onChange={(v) =>
            disabled
              ? undefined
              : onChange({ riskCategory: (v as AdrRiskCategory) ?? '' })
          }
          items={RISK_CATEGORIES.map((rc) => ({
            id: `${idp}-risk-${rc}`,
            value: rc,
            label: t(`forms.adr.infringements.riskCategoryOptions.${rc}`),
            disabled,
          }))}
        />

        <TextField
          id={`${idp}-adr`}
          label={t('forms.adr.infringements.adrReference')}
          className="mb-1"
          value={record.adrReference}
          required={!disabled}
          onChange={(v) => (disabled ? undefined : onChange({ adrReference: v }))}
          disabled={disabled}
          input={disabled ? undefined : { maxLength: 200 }}
        />

        <ChoiceGroup
          id={`${idp}-participants`}
          name={`${idp}-participants`}
          label={t('forms.adr.infringements.participants')}
          inputType="checkbox"
          className="mb-1"
          value={record.responsibleParticipants}
          onChange={(val) => {
            if (disabled) return;
            const arr = (Array.isArray(val) ? val : []) as AdrParticipant[];
            onChange({ responsibleParticipants: arr });
          }}
          items={participantOptions.map((o) => ({
            id: `${idp}-participant-${o.value}`,
            value: o.value,
            label: o.label,
            disabled,
          }))}
        />

        <Select
          id={`${idp}-reg`}
          label={t('forms.adr.infringements.regCode')}
          className="mb-1"
          options={regCodeOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={
            selectedRegOption
              ? { value: selectedRegOption.value, label: selectedRegOption.label }
              : null
          }
          onChange={(val) => {
            if (disabled) return;
            const code =
              val && !Array.isArray(val) ? (val as { value: string }).value : '';
            const opt = regCodeOptions.find((o) => o.value === code);
            onChange({
              reg2016403Code: code || null,
              reg2016403Severity:
                code && code !== REG_CODE_NONE
                  ? (opt?.severity as AdrInfringementRecord['reg2016403Severity']) ?? null
                  : null,
            });
          }}
          disabled={disabled || !regEnabled}
          helper={
            !regEnabled
              ? { text: t('forms.adr.infringements.regCodeDisabledHint'), type: 'hint' }
              : undefined
          }
        />

        {record.reg2016403Severity && (
          <Text className="mb-1">
            {t('forms.adr.infringements.regSeverityAuto', {
              severity: record.reg2016403Severity,
            })}
          </Text>
        )}

        {!disabled && (
          <Button
            type="button"
            visualType="neutral"
            color="danger"
            size="small"
            icon="delete"
            onClick={onRemove}
          >
            {t('forms.adr.infringements.removeRecord')}
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}
