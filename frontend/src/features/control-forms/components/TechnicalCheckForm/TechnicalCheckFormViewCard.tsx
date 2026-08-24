import { Card, Heading } from '@tedi-design-system/react/tedi';
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
}

export function TechnicalCheckFormViewCard({
  scope,
  form,
  formType,
}: TechnicalCheckFormViewCardProps) {
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
        {form.id && <FormVersionsTable formId={form.id} formType={formType} />}
      </Card.Content>
    </Card>
  );
}
