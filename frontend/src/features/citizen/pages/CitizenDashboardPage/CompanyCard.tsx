import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Row, Text } from '@tedi-design-system/react/tedi';
import { formatDate } from '../../../../hooks/dateUtils';
import { RiskBandBadge } from '../../../risk-scores/pages/RiskScoresListPage/RiskBandBadge';
import { getCompanyRiskScore, getCompanyControlsBreakdown } from '../../api';
import type { CompanyRiskScore, CompanyControlRow } from '../../types';
import { CompanyControlsTable } from './CompanyControlsTable';

interface CompanyCardProps {
  registryCode: string;
  companyName: string;
}

/**
 * "Minu ettevõtted" section: one card per represented company —
 * risk band + "Vaata kontrolle" toggle that expands into a
 * CompanyControlsTable. Independent of the header's "Esindan" role switch —
 * every represented company is shown here at once, not just the active one.
 *
 * "Kontrollide arv" is derived from the live controls breakdown (same rolling
 * 2-year window as the table), NOT from riskScore.totalControls — the saved
 * risk score's total_controls may be from a different window/time, causing a
 * mismatch with the controls rows shown. Fetching controls here also avoids a
 * redundant API call when the user expands the table.
 *
 * riskScore.windowStart/windowEnd ARE shown (as a caption under the risk
 * band badge) — riskBandCode/riskScore come from the last PERSISTED
 * calculation (risk.company_risk_score), which is recalculated only on
 * compound-form confirm or the nightly job, not live on every dashboard
 * load. Without the window dates, a citizen has no way to tell that the
 * badge reflects an earlier snapshot rather than the controls currently
 * visible below it.
 */
export function CompanyCard({ registryCode, companyName }: CompanyCardProps) {
  const { t } = useTranslation();
  const [riskScore, setRiskScore] = useState<CompanyRiskScore | null>(null);
  const [controls, setControls] = useState<CompanyControlRow[]>([]);
  const [controlsLoading, setControlsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCompanyRiskScore(registryCode)
      .then((res) => {
        if (!cancelled) setRiskScore(res);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [registryCode]);

  useEffect(() => {
    let cancelled = false;
    setControlsLoading(true);
    getCompanyControlsBreakdown(registryCode)
      .then((res) => {
        if (!cancelled) setControls(res.controls);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setControlsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [registryCode]);

  return (
    <Card className="mb-1">
      <Card.Content>
        <Row alignItems="center" justifyContent="between">
          <div>
            <Heading element="h3">{companyName}</Heading>
            <Text color="secondary">{registryCode}</Text>
          </div>
          {riskScore && <RiskBandBadge band={riskScore.riskBandCode} />}
        </Row>
        {riskScore && riskScore.windowStart && riskScore.windowEnd && (
          <Text color="secondary" className="mt-05">
            {t(
              'citizen.dashboard.company.riskWindow',
              'Riskitase hinnatud ajavahemikus {{start}}–{{end}}',
              {
                start: formatDate(riskScore.windowStart),
                end: formatDate(riskScore.windowEnd),
              },
            )}
          </Text>
        )}
        {!controlsLoading && (
          <Text color="secondary" className="mt-05">
            {t('citizen.dashboard.company.totalControls', { count: controls.length })}
          </Text>
        )}
        <Button
          visualType="secondary"
          className="mt-1"
          onClick={() => setIsExpanded((v) => !v)}
        >
          {isExpanded
            ? t('citizen.dashboard.company.hideControls')
            : t('citizen.dashboard.company.viewControls')}
        </Button>
        {isExpanded && (
          <div className="mt-1">
            <CompanyControlsTable
              registryCode={registryCode}
              controls={controls}
              isLoading={controlsLoading}
            />
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
