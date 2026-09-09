import { useTranslation } from 'react-i18next';
import type { FormikProps } from 'formik';
import {
  Card,
  Heading,
  Select,
  TextField,
  TextArea,
} from '@tedi-design-system/react/tedi';

/**
 * ADR-002: sõidukijuhi kontrolli sisu ühel TRAM kontrollkaardi vormil.
 * 2. faasis kuvatakse põhiväljad; sõidu-/puhkeaja, massi/mõõtmete ja ATP
 * sektsioonid on peidetud ja salvestatakse vaikeväärtustega (vt
 * DSL/Resql/ljvis/POST/control-forms/tram-card/insert.sql).
 */
interface DriverControlValues {
  transportType: string;
  resultType: string;
  proceedingType: string;
  proceedingReferenceNumber: string;
  notes: string;
  driverNotApplicable?: boolean;
}

interface Props {
  formik: FormikProps<DriverControlValues>;
}

type Opt = { value: string; label: string };

export function TramDriverControlSection({ formik }: Props) {
  const { t } = useTranslation();

  if (formik.values.driverNotApplicable) return null;

  const opt = (value: string, label: string): Opt => ({ value, label });

  const transportOptions: Opt[] = [
    opt('', ' '),
    opt('Sõitjatevedu', t('forms.sp_form.transportTypePassenger')),
    opt('Veosevedu', t('forms.sp_form.transportTypeCargo')),
  ];
  const resultOptions: Opt[] = [
    opt('ok', t('forms.sp_form.controlResultKorras')),
    opt('warning', t('forms.sp_form.controlResultHoiatus')),
    opt('misdemeanor_proceedings', t('forms.sp_form.controlResultAlustati')),
  ];
  const proceedingOptions: Opt[] = [
    opt('none', t('forms.tram_control_card.proceedingNone')),
    opt('LYHI', t('forms.sp_form.proceedingTypeLyhi')),
    opt('KIIR', t('forms.sp_form.proceedingTypeKiir')),
    opt('YLD', t('forms.sp_form.proceedingTypeYld')),
  ];

  const find = (opts: Opt[], v: string) =>
    opts.find((o) => o.value === v) ?? null;

  const selectValue = (v: unknown): string =>
    v && !Array.isArray(v) && typeof v === 'object' && 'value' in v
      ? String((v as { value: unknown }).value)
      : '';

  const proceedingActive =
    !!formik.values.proceedingType && formik.values.proceedingType !== 'none';

  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h2" className="mb-1" color="primary">
          {t('forms.tram_control_card.driverControlTitle')}
        </Heading>

        <Select
          id="transportType"
          label={t('forms.sp_form.transportType')}
          options={transportOptions}
          value={find(transportOptions, formik.values.transportType) as never}
          onChange={(v) =>
            formik.setFieldValue('transportType', selectValue(v))
          }
        />

        <Select
          id="resultType"
          label={t('forms.sp_form.controlResultLabel')}
          options={resultOptions}
          value={find(resultOptions, formik.values.resultType || 'ok') as never}
          onChange={(v) => {
            const val = selectValue(v) || 'ok';
            if (val === 'ok') {
              formik.setFieldValue('proceedingType', 'none');
              formik.setFieldValue('proceedingReferenceNumber', '');
            }
            formik.setFieldValue('resultType', val);
          }}
        />

        {formik.values.resultType !== 'ok' && (
          <Select
            id="proceedingType"
            label={t('forms.sp_form.proceedingType')}
            options={proceedingOptions}
            value={
              find(
                proceedingOptions,
                formik.values.proceedingType || 'none',
              ) as never
            }
            onChange={(v) => {
              const val = selectValue(v) || 'none';
              formik.setFieldValue('proceedingType', val);
              if (val === 'none') {
                formik.setFieldValue('proceedingReferenceNumber', '');
              }
            }}
          />
        )}

        {proceedingActive && (
          <TextField
            id="proceedingReferenceNumber"
            label={t('forms.sp_form.proceedingReferenceNumber')}
            value={formik.values.proceedingReferenceNumber}
            onChange={(v) =>
              formik.setFieldValue('proceedingReferenceNumber', v)
            }
            {...(formik.touched.proceedingReferenceNumber &&
            formik.errors.proceedingReferenceNumber
              ? {
                  helper: {
                    text: formik.errors.proceedingReferenceNumber as string,
                    type: 'error' as const,
                  },
                }
              : {})}
          />
        )}

        <TextArea
          id="notes"
          label={t('forms.sp_form.notes')}
          value={formik.values.notes}
          onChange={(v) => formik.setFieldValue('notes', v)}
        />
      </Card.Content>
    </Card>
  );
}
