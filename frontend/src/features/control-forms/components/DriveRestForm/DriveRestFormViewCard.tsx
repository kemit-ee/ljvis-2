import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Dropdown, Heading } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import type { DriveRestForm } from '../../types';
import { useDriveRestForm } from '../../pages/drive-rest-form/useDriveRestForm';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { DriveRestFormFields } from './DriveRestFormFields';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';
import { useAuth } from '../../../auth/AuthContext';
import { NcrBuildModal } from '../../../erru/components/Ncr/NcrBuildModal';
import { printDriveRestForm } from '../../api';

interface DriveRestFormViewCardProps {
  scope: 'driver' | 'teammate';
  form: DriveRestForm;
  formType: string;
  canPublish?: boolean;
  onPublish?: () => Promise<unknown>;
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
  hideDriveRestExtras,
}: DriveRestFormViewCardProps) {
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [printing, setPrinting] = useState(false);
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasAnyPermission } = useAuth();
  const [ncrModalOpen, setNcrModalOpen] = useState(false);

  const handlePrint = async (blank: boolean) => {
    if (!form.id || printing) return;
    setPrinting(true);
    try {
      const result = await printDriveRestForm(String(form.id), scope, blank);
      const bytes = Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: result.contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setPrinting(false);
    }
  };
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
          hideDriveRestExtras={hideDriveRestExtras}
          readOnly
        />
        {form.id && <FormVersionsTable formId={form.id} formType={formType} refreshKey={versionsRefreshKey} />}
        <div className="confirm-button">
          <div>
            {form.id && (
              <Dropdown width="max-content">
                <Dropdown.Trigger>
                  <Button type="button" visualType="secondary" iconRight="keyboard_arrow_down" isLoading={printing} disabled={printing}>
                    {t('common.print')}
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Content>
                  <Dropdown.Item index={0} onClick={() => void handlePrint(false)}>
                    {t('common.printFilled')}
                  </Dropdown.Item>
                  <Dropdown.Item index={1} onClick={() => void handlePrint(true)}>
                    {t('common.printBlank')}
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown>
            )}
            {canPublish && onPublish && (
              <AsyncButton type="button" onClick={() => onPublish().then(() => setVersionsRefreshKey((k) => k + 1))}>
                {t('common.publish')}
              </AsyncButton>
            )}
          </div>
        </div>
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
