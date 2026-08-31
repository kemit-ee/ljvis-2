import { useTranslation } from 'react-i18next';
import { StatusBadge, type StatusBadgeColor } from '@tedi-design-system/react/tedi';
import type { RiskBandCode } from '../../types';

const BAND_COLOR: Record<RiskBandCode, StatusBadgeColor> = {
  Hall: 'neutral',
  Roheline: 'success',
  Kollane: 'warning',
  Punane: 'danger',
};

const BAND_LABEL_KEY: Record<RiskBandCode, string> = {
  Hall: 'riskScores.bandHall',
  Roheline: 'riskScores.bandRoheline',
  Kollane: 'riskScores.bandKollane',
  Punane: 'riskScores.bandPunane',
};

interface RiskBandBadgeProps {
  band: RiskBandCode;
}

export function RiskBandBadge({ band }: RiskBandBadgeProps) {
  const { t } = useTranslation();
  return (
    <StatusBadge color={BAND_COLOR[band] ?? 'neutral'}>
      {t(BAND_LABEL_KEY[band] ?? 'riskScores.bandHall')}
    </StatusBadge>
  );
}
