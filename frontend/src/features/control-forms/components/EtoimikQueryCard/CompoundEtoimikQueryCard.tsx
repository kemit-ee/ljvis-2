import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../auth/AuthContext';
import type { Driver } from '../../types';
import { PUNISHMENT_REGISTER_PERMISSION } from '../../proceedingOutcome';
import { EtoimikQueryCard } from './EtoimikQueryCard';

type FormWithReference =
  | { subFormNumber?: string; proceedingReferenceNumber?: string }
  | null
  | undefined;

interface CompoundEtoimikQueryCardProps {
  compoundForm: { drivers?: unknown } | null | undefined;
  compoundFormKey: number | undefined;
  vehicle?: FormWithReference;
  trailers?: FormWithReference[];
  driver?: FormWithReference;
  teammate?: FormWithReference;
  adr?: FormWithReference;
}

const parseDrivers = (drivers: unknown): Driver[] => {
  if (Array.isArray(drivers)) return drivers as Driver[];
  if (typeof drivers === 'string') {
    try {
      const parsed: unknown = JSON.parse(drivers);
      return Array.isArray(parsed) ? (parsed as Driver[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * E-toimiku päringukaart koondvormi alamvormide lehtedel (koondvorm, juht, kaasjuht,
 * sõiduk/haagis, ADR, transpordi katkestus). Kaart on nähtav ainult karistusregistri
 * õigusega kasutajale ja sõltub ainult sellest, et mõnel alamvormil on menetluse
 * viitenumber; e-toimikust tulnud otsus seda ei peida.
 */
export function CompoundEtoimikQueryCard({
  compoundForm,
  compoundFormKey,
  vehicle,
  trailers = [],
  driver,
  teammate,
  adr,
}: CompoundEtoimikQueryCardProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  if (!compoundForm || !compoundFormKey || !hasPermission(PUNISHMENT_REGISTER_PERMISSION)) {
    return null;
  }

  const entries: { label: string; form: FormWithReference }[] = [
    { label: t('forms.technical_check.vehicleTitle'), form: vehicle },
    ...trailers.map((form) => ({ label: t('forms.technical_check.trailerTitle'), form })),
    { label: t('forms.driver_drive_rest_form'), form: driver },
    { label: t('forms.teammate_drive_rest_form'), form: teammate },
    { label: t('forms.adr.title'), form: adr },
  ];
  const referenceNumberOptions = entries.flatMap(({ label, form }) =>
    form?.proceedingReferenceNumber
      ? [
          {
            label: `${label} ${form.subFormNumber ?? ''} — ${form.proceedingReferenceNumber}`,
            value: form.proceedingReferenceNumber,
          },
        ]
      : [],
  );

  return (
    <EtoimikQueryCard
      drivers={parseDrivers(compoundForm.drivers)}
      referenceNumberOptions={referenceNumberOptions}
      compoundFormKey={compoundFormKey}
    />
  );
}
