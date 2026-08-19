import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading } from '@tedi-design-system/react/tedi';
import type { DriveRestForm } from '../../types';
import { useDriveRestForm } from '../../pages/drive-rest-form/useDriveRestForm';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { DriveRestFormFields } from './DriveRestFormFields';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';
import { useAuth } from '../../../auth/AuthContext';
import { NcrBuildModal } from '../../../erru/components/Ncr/NcrBuildModal';

interface DriveRestFormViewCardProps {
  scope: 'driver' | 'teammate';
  form: DriveRestForm;
  canEdit: boolean;
  onEdit: () => void;
  formType: string;
}

export function DriveRestFormViewCard({
  scope,
  form,
  formType,
}: DriveRestFormViewCardProps) {
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
          massDimensions={massDimensions}
          readOnly
        />
        {form.id && <FormVersionsTable formId={form.id} formType={formType} />}
        {canBuildNcr && form.id && (
          <NcrBuildModal
            spFormKey={form.id}
            spFormType={scope}
            open={ncrModalOpen}
            onClose={() => setNcrModalOpen(false)}
          />
        )}
      </Card.Content>
    </Card>
  );
}
