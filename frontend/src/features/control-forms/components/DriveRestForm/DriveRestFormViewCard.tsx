import { Card, Heading } from '@tedi-design-system/react/tedi';
import type { DriveRestForm } from '../../types';
import { useDriveRestForm } from '../../pages/drive-rest-form/useDriveRestForm';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { DriveRestFormFields } from './DriveRestFormFields';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';

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
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

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
      </Card.Content>
    </Card>
  );
}
