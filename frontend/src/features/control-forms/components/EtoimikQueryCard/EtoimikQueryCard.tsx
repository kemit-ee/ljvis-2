import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Select, Text } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { queryEtoimikQualifications } from '../../../xroad/api';
import type { EtoimikCase } from '../../../xroad/types';
import type { Driver } from '../../types';

export interface EtoimikReferenceOption {
  /** Display label, e.g. "Vehicle technical check th-2026-00001 — REF-123". */
  label: string;
  /** The bare "Menetluse viitenumber" value to send as referenceNumber. */
  value: string;
}

interface EtoimikQueryCardProps {
  /** From compound_form.drivers[] — up to 2 entries (primary + second/teammate). */
  drivers: Driver[];
  /** Built by the caller by scanning loaded sub-forms for a non-empty proceedingReferenceNumber. */
  referenceNumberOptions: EtoimikReferenceOption[];
  compoundFormKey: number;
}

/**
 * LJVIS2-56: manual, read-only "query e-Toimik" card on the koondvorm case
 * page. All input data (driver identification, proceeding reference number)
 * already exists on the compound form / its sub-forms — nothing is
 * persisted back; this only displays the query result. See the plan's §3/§5
 * for the full reasoning.
 */
export function EtoimikQueryCard({
  drivers,
  referenceNumberOptions,
  compoundFormKey,
}: EtoimikQueryCardProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const [selectedReference, setSelectedReference] = useState<string | null>(
    referenceNumberOptions.length === 1 ? referenceNumberOptions[0].value : null,
  );
  const [selectedDriverIndex, setSelectedDriverIndex] = useState<number | null>(
    drivers.length === 1 ? 0 : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // undefined = not queried yet; null = queried, no matching case; object = found.
  const [result, setResult] = useState<EtoimikCase | null | undefined>(undefined);

  // View-only action — no dedicated permission (LJVIS2-56 §3).
  if (!hasPermission('compound_form.read')) return null;
  // Nothing to query against yet — hide entirely rather than show broken empty selects.
  if (referenceNumberOptions.length === 0) return null;

  const driverOptions = drivers.map((d, i) => ({
    label: `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || t('etoimik.unnamedDriver'),
    value: String(i),
  }));
  const selectedDriver = selectedDriverIndex != null ? drivers[selectedDriverIndex] : null;

  const handleQuery = async () => {
    if (!selectedReference || !selectedDriver) return;
    setLoading(true);
    setError(false);
    setResult(undefined);
    const isEeCitizen = !!selectedDriver.personalCodeEe;
    try {
      const data = await queryEtoimikQualifications({
        caseNumber: '',
        referenceNumber: selectedReference,
        personalCode: isEeCitizen ? selectedDriver.personalCodeEe : '',
        firstName: isEeCitizen ? '' : (selectedDriver.firstName ?? ''),
        lastName: isEeCitizen ? '' : (selectedDriver.lastName ?? ''),
        birthDate: isEeCitizen ? '' : (selectedDriver.birthDate ?? ''),
        sourceType: 'compound_form',
        sourceRecordId: String(compoundFormKey),
      });
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h3" className="mb-1">
          {t('etoimik.title')}
        </Heading>
        <div className="form-grid-desktop">
          <Select
            id="etoimikReferenceNumber"
            label={t('etoimik.referenceNumber')}
            options={referenceNumberOptions}
            value={referenceNumberOptions.find((o) => o.value === selectedReference) ?? null}
            onChange={(val) => {
              setResult(undefined);
              setSelectedReference(val && !Array.isArray(val) ? (val as { value: string }).value : null);
            }}
          />
          <Select
            id="etoimikDriver"
            label={t('etoimik.person')}
            options={driverOptions}
            value={
              selectedDriverIndex != null
                ? (driverOptions.find((o) => o.value === String(selectedDriverIndex)) ?? null)
                : null
            }
            onChange={(val) => {
              setResult(undefined);
              setSelectedDriverIndex(
                val && !Array.isArray(val) ? Number((val as { value: string }).value) : null,
              );
            }}
          />
        </div>
        <Button
          type="button"
          className="mt-1"
          onClick={() => void handleQuery()}
          disabled={!selectedReference || !selectedDriver || loading}
        >
          {t('etoimik.queryButton')}
        </Button>

        {error && (
          <Alert type="danger" size="small" className="mt-1">
            {t('etoimik.queryFailed')}
          </Alert>
        )}
        {result === null && (
          <Alert type="info" size="small" className="mt-1">
            {t('etoimik.notFound')}
          </Alert>
        )}
        {result && (
          <div className="mt-1">
            {result.proceedings.map((proceeding, pIdx) => (
              <Card key={proceeding.objectId ?? pIdx} className="mb-1">
                <Card.Content>
                  <Text modifiers="bold">
                    {t('etoimik.proceedingNumber')}: {proceeding.proceedingNumber}
                  </Text>
                  {proceeding.actions.map((action, aIdx) => (
                    <div key={action.objectId ?? aIdx} className="mt-1 ml-1">
                      <Text modifiers="bold">
                        {t('etoimik.actionTypeCode')}: {action.typeCode}
                        {action.subTypeCode != null ? ` / ${action.subTypeCode}` : ''}
                      </Text>
                      {action.legalBasis.length > 0 && (
                        <ul>
                          {action.legalBasis.map((lb, lbIdx) => (
                            <li key={lb.objectId ?? lbIdx}>
                              {lb.text || `${lb.paragraph ?? ''} ${lb.subsection ?? ''}`.trim()}
                            </li>
                          ))}
                        </ul>
                      )}
                      {action.participants.map((participant, partIdx) => (
                        <div key={partIdx} className="mt-1 ml-1">
                          <Text>
                            {t('etoimik.participant')}: {participant.person.firstName}{' '}
                            {participant.person.lastName}
                          </Text>
                          {participant.sanctions.map((sanction, sIdx) => (
                            <div key={sanction.objectId ?? sIdx} className="ml-1">
                              <Text modifiers={['small']}>
                                {t('etoimik.sanctionTypeCode')}: {sanction.typeCode}
                              </Text>
                              <ul>
                                {sanction.convictionPoints.map((cp, cpIdx) => (
                                  <li key={cp.objectId ?? cpIdx}>
                                    {cp.reference || t('etoimik.convictionPoint')}
                                    {cp.qualificationParagraphs.length > 0 && (
                                      <ul>
                                        {cp.qualificationParagraphs.map((qp, qpIdx) => (
                                          <li key={qp.objectId ?? qpIdx}>
                                            {qp.text || `${qp.paragraph ?? ''} ${qp.subsection ?? ''}`.trim()}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
