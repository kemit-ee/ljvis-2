import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useErrorContext } from '../../shared/errors/ErrorContext';
import { runManualJob } from './api';

/** Töö nimi peab ühtima backendi allowedJobs nimekirjaga (POST/v1/admin/manual-jobs/run.yml). */
const MANUAL_JOBS = [
  'risk-score-recalc-sync',
  'etoimik-decision-sync',
  'etoimik-tram-decision-sync',
  'etoimik-sp-driver-decision-sync',
  'etoimik-sp-teammate-decision-sync',
  'etoimik-technical-check-decision-sync',
] as const;

type ManualJob = (typeof MANUAL_JOBS)[number];

/**
 * Haldus > X-tee logid > Manuaalne käivitamine: käivitab käsitsi samad tööd, mida
 * CronManager käivitab ajastatult (riskiskooride ümberarvutus, e-toimiku sünkroonimised).
 * Nähtav samale õigusele (xroad.log.read), mis X-tee logide vaatamine.
 */
export function ManualJobsCard() {
  const { t } = useTranslation();
  const { showMessage } = useErrorContext();
  const [runningJob, setRunningJob] = useState<ManualJob | null>(null);

  const handleRun = useCallback(
    async (job: ManualJob) => {
      setRunningJob(job);
      try {
        const res = await runManualJob(job);
        showMessage(
          t('xroadLogs.manualJobs.done', {
            job: t(`xroadLogs.manualJobs.jobs.${job}.title`),
            failures: res.failures,
          }),
          res.failures > 0 ? 'warning' : 'info',
        );
      } catch {
        // Vea toast'i näitab API klient ise (handleErrorResponse).
      } finally {
        setRunningJob(null);
      }
    },
    [showMessage, t],
  );

  return (
    <Card className="mt-05">
      <Card.Content>
        <div className="card-main">
          <Heading element="h2">{t('xroadLogs.manualJobs.title')}</Heading>
        </div>
        <Text>{t('xroadLogs.manualJobs.description')}</Text>
        <div className="mt-05">
          {MANUAL_JOBS.map((job) => (
            <div
              key={job}
              className="card-main"
              data-testid={`manual-job-${job}`}
            >
              <div>
                <Text modifierClass="bold">
                  {t(`xroadLogs.manualJobs.jobs.${job}.title`)}
                </Text>
                <Text>{t(`xroadLogs.manualJobs.jobs.${job}.description`)}</Text>
              </div>
              <Button
                id={`manual-job-run-${job}`}
                visualType="secondary"
                onClick={() => handleRun(job)}
                disabled={runningJob !== null}
                loading={runningJob === job}
              >
                {runningJob === job
                  ? t('xroadLogs.manualJobs.running')
                  : t('xroadLogs.manualJobs.run')}
              </Button>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
