import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Heading } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import type { TechnicalCheckForm } from '../../types';
import { useTechnicalCheckForm } from '../../pages/technical-check-form/useTechnicalCheckForm';
import { TechnicalCheckFormFields } from '../../pages/technical-check-form/TechnicalCheckFormFields';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';

interface TechnicalCheckFormViewCardProps {
  scope: 'vehicle' | 'trailer';
  form: TechnicalCheckForm;
  canEdit: boolean;
  onEdit: () => void;
  formType: string;
  canPublish?: boolean;
  onPublish?: () => Promise<unknown>;
}

export function TechnicalCheckFormViewCard({
  scope,
  form,
  formType,
  canPublish,
  onPublish,
}: TechnicalCheckFormViewCardProps) {
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const { t } = useTranslation();
  const {
    formik,
    parts,
    defectsByPartKey,
    euViolations,
    applyPartDefects,
    setPartStatus,
    removeDefect,
    setResultType,
    toggleViolation,
  } = useTechnicalCheckForm(
    scope,
    form,
    () => {},
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

        <TechnicalCheckFormFields
          variant={scope}
          formik={formik}
          parts={parts}
          defectsByPartKey={defectsByPartKey}
          euViolations={euViolations}
          applyPartDefects={applyPartDefects}
          setPartStatus={setPartStatus}
          removeDefect={removeDefect}
          setResultType={setResultType}
          toggleViolation={toggleViolation}
          canEdit={false}
          canEditXroadFields={false}
          isEditLocked={false}
          xroadBlockVisible={false}
        />
        {form.id && <FormVersionsTable formId={form.id} formType={formType} refreshKey={versionsRefreshKey} />}
        <div className="confirm-button">
          <div>
            {canPublish && onPublish && (
              <AsyncButton type="button" onClick={() => onPublish().then(() => setVersionsRefreshKey((k) => k + 1))}>
                {t('common.publish')}
              </AsyncButton>
            )}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
