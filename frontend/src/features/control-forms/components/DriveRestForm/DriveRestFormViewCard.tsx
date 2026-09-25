import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import type { DriveRestForm } from '../../types';
import { useDriveRestForm } from '../../pages/drive-rest-form/useDriveRestForm';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { DriveRestFormFields } from './DriveRestFormFields';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';
import { FormPrintButton } from '../FormPrintButton/FormPrintButton';
import { useAuth } from '../../../auth/AuthContext';
import { NcrBuildModal } from '../../../erru/components/Ncr/NcrBuildModal';
import { saveProceedingOutcome } from '../../api';
import { canPublishWithProceedingOutcome, hasProceeding } from '../../proceedingOutcome';

interface DriveRestFormViewCardProps {
  scope: 'driver' | 'teammate';
  form: DriveRestForm;
  formType: string;
  canPublish?: boolean;
  onPublish?: () => Promise<unknown>;
  snapshotId?: string;
  /**
   * Peidab TRAM-kaardil kolm sektsiooni: sõidu- ja puhkeaeg, mass/mõõtmed,
   * ATP. Sünkroonis DriveRestFormCreatePage hideDriveRestExtras-ega.
   */
  hideDriveRestExtras?: boolean;
}

export function DriveRestFormViewCard({
  scope,
  form,
  formType,
  canPublish,
  onPublish,
  snapshotId,
  hideDriveRestExtras,
}: DriveRestFormViewCardProps) {
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasAnyPermission } = useAuth();
  const [ncrModalOpen, setNcrModalOpen] = useState(false);

  // "Lisa NCR vorm" (LJVIS2-64 §4.1 eeltäitmine) — builds a new outgoing NCR draft from
  // this SP sub-form's control data. Requires a saved sub-form (form.id = spFormKey).
  const canBuildNcr = hasAnyPermission(['ncr.create']) && !!form.id;

  const {
    formik,
    cargoCabotageViolations,
    passengerCabotageViolations,
    transportClasses: transportClassItems,
    docRightChecks,
    docRightOtherDocs,
    tachographTypes,
    drivingViolations,
    drivingViolationsMain,
    rooma1Violations,
    postingViolations,
    massDimensions,
  } = useDriveRestForm(
    form,
    () => {},
    scope,
    form.compoundFormKey ? Number(form.compoundFormKey) : undefined,
  );

  return (
    <Card className="mb-1">
      <Card.Content>
        <div className="mb-1">
          <div className="page-header-title">
            <Heading element="h1" color="primary">
              {form.subFormNumber}
            </Heading>
            {canBuildNcr && (
              <Button
                visualType="secondary"
                onClick={() => setNcrModalOpen(true)}
              >
                {t('erru.ncr.buildModal.button')}
              </Button>
            )}
          </div>
        </div>

        <DriveRestFormFields
          type={scope}
          formik={formik}
          isDesktop={isDesktop}
          transportClassItems={transportClassItems}
          cargoCabotageViolations={cargoCabotageViolations}
          passengerCabotageViolations={passengerCabotageViolations}
          docRightChecks={docRightChecks}
          docRightOtherDocs={docRightOtherDocs}
          tachographTypes={tachographTypes}
          drivingViolations={drivingViolations}
          drivingViolationsMain={drivingViolationsMain}
          rooma1Violations={rooma1Violations}
          postingViolations={postingViolations}
          massDimensions={massDimensions}
          hideDriveRestExtras={hideDriveRestExtras}
          readOnly
        />
        {form.id && (
          <FormVersionsTable
            formId={form.id}
            formType={formType}
            refreshKey={versionsRefreshKey}
          />
        )}
        <div className="confirm-button">
          <div className="page-actions-buttons">
            <FormPrintButton
              endpoint={`/v1/control-forms/drive-rest-form/${scope}/read/print`}
              id={form.id}
              snapshotId={snapshotId}
            />
            {canPublish && onPublish && canPublishWithProceedingOutcome(formik.values) && (
              <AsyncButton
                type="button"
                onClick={async () => {
                  if (hasProceeding(formik.values)) {
                    await saveProceedingOutcome(scope === 'driver' ? 'sp_driver' : 'sp_teammate', form.id!, formik.values.enforcementDecision, formik.values.proceedingClosureBasis);
                  }
                  await onPublish();
                  setVersionsRefreshKey((k) => k + 1);
                }}
              >
                {t('common.publish')}
              </AsyncButton>
            )}
          </div>
        </div>
        {canBuildNcr && form.id && (
          <NcrBuildModal
            spFormKey={form.id}
            spFormType={scope}
            compoundFormKey={form.compoundFormKey}
            open={ncrModalOpen}
            onClose={() => setNcrModalOpen(false)}
          />
        )}
      </Card.Content>
    </Card>
  );
}
