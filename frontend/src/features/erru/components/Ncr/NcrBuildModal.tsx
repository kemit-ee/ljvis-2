import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Modal, Select } from '@tedi-design-system/react/tedi';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { useOrganisations } from '../../../organisations/hooks';
import { classifierOptions, pickOptionValue, selectedClassifierOption } from '../../utils/fieldHelpers';
import { buildNcrRequest } from '../../api';
import { ApiError } from '../../../../shared/api/client';

interface NcrBuildModalProps {
  spFormKey: string;
  spFormType: 'driver' | 'teammate';
  open: boolean;
  onClose: () => void;
}

/**
 * "Lisa NCR vorm" (LJVIS2-64 §4.1 eeltäitmine) modal — collects the four envelope fields
 * the SP/TH control card cannot supply (ncrTo, originatingAuthority, requestSource,
 * requestPurpose) and calls POST /v1/erru/ncr/request/build. Only ncrTo is mandatory here;
 * everything else the build derives from the control form (checkDate, transportUndertakingName,
 * communityLicenceNumber, vehicleRegistrationNumber/-Country, seriousInfringements incl. the
 * M1 302 exception) is NOT re-entered — the officer only supplies what the control card
 * cannot know. On success, navigates to the freshly created NCR draft in edit mode.
 */
export function NcrBuildModal({ spFormKey, spFormType, open, onClose }: NcrBuildModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getByCode } = useClassifiers();
  const { organisations } = useOrganisations();

  // Only currently-valid (non-expired) classifier values may be selected for
  // a new NCR request; already-recorded (possibly since-expired) values are
  // still rendered correctly elsewhere via the unfiltered classifier list.
  const countries = useMemo(
    () => getByCode('COUNTRY').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const requestSources = useMemo(
    () => getByCode('NCR_REQUEST_SOURCE').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const requestPurposes = useMemo(
    () => getByCode('NCR_REQUEST_PURPOSE').filter((c) => c.isValid !== false),
    [getByCode],
  );

  const [ncrTo, setNcrTo] = useState('');
  const [originatingAuthority, setOriginatingAuthority] = useState('');
  const [requestSource, setRequestSource] = useState('');
  const [requestPurpose, setRequestPurpose] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;

  const reset = () => {
    setNcrTo('');
    setOriginatingAuthority('');
    setRequestSource('');
    setRequestPurpose('');
    setTouched(false);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!ncrTo) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await buildNcrRequest({
        spFormKey,
        spFormType,
        ncrTo,
        originatingAuthority,
        requestSource,
        requestPurpose,
      });
      reset();
      navigate(`/erru/ncr/${result.businessCaseId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setError(t('erru.ncr.buildModal.forbidden'));
      } else if (e instanceof ApiError && e.status === 404) {
        setError(t('erru.ncr.buildModal.notFound'));
      } else {
        setError(t('erru.ncr.buildModal.failed'));
        console.error('NCR build failed', e);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onToggle={(next) => { if (!next) handleClose(); }}>
      <Modal.Content>
        <Modal.Header title={t('erru.ncr.buildModal.title')} closeButton />
        <Modal.Body>
          {error && (
            <Alert type="danger" size="small" className="mb-1">
              {error}
            </Alert>
          )}
          <Select
            id="ncr-build-ncr-to"
            label={t('erru.ncr.form.ncrTo')}
            required
            options={opts(countries)}
            value={selected(countries, ncrTo)}
            onChange={(o) => setNcrTo(pick(o))}
            helper={
              touched && !ncrTo
                ? { text: t('erru.ncr.validation.required'), type: 'error' }
                : undefined
            }
          />
          <Select
            id="ncr-build-originating-authority"
            label={t('erru.ncr.form.originatingAuthority')}
            options={opts(organisations)}
            value={selected(organisations, originatingAuthority)}
            onChange={(o) => setOriginatingAuthority(pick(o))}
          />
          <Select
            id="ncr-build-request-source"
            label={t('erru.ncr.form.requestSource')}
            options={opts(requestSources)}
            value={selected(requestSources, requestSource)}
            onChange={(o) => setRequestSource(pick(o))}
          />
          <Select
            id="ncr-build-request-purpose"
            label={t('erru.ncr.form.requestPurpose')}
            options={opts(requestPurposes)}
            value={selected(requestPurposes, requestPurpose)}
            onChange={(o) => setRequestPurpose(pick(o))}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button visualType="secondary" onClick={handleClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {t('erru.ncr.buildModal.submit')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
