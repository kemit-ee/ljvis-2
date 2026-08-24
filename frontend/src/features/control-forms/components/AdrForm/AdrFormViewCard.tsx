import { Card, Heading } from '@tedi-design-system/react/tedi';
import type { AdrForm } from '../../types';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import { useAdrForm } from '../../pages/adr-form/useAdrForm';
import { AdrFormFields } from '../../pages/adr-form/AdrFormFields';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';

interface AdrFormViewCardProps {
  form: AdrForm;
  canEdit: boolean;
  onEdit: () => void;
  formType: string;
}

export function AdrFormViewCard({ form, formType }: AdrFormViewCardProps) {
  const {
    formik,
    counties,
    setDriverAssistant,
    setLastLoadAddress,
    setNextLoadAddress,
    addDangerousGood,
    updateDangerousGood,
    removeDangerousGood,
    toggleCorrectiveMeasure,
    setInfringement,
    getInfringement,
  } = useAdrForm(form, () => {}, form.compoundFormKey ? Number(form.compoundFormKey) : undefined);

  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

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

        <AdrFormFields
          formik={formik}
          counties={counties}
          setDriverAssistant={setDriverAssistant}
          setLastLoadAddress={setLastLoadAddress}
          setNextLoadAddress={setNextLoadAddress}
          addDangerousGood={addDangerousGood}
          updateDangerousGood={updateDangerousGood}
          removeDangerousGood={removeDangerousGood}
          toggleCorrectiveMeasure={toggleCorrectiveMeasure}
          setInfringement={setInfringement}
          getInfringement={getInfringement}
          canEdit={false}
          isDesktop={isDesktop}
        />

        {form.id && <FormVersionsTable formId={form.id} formType={formType} />}
      </Card.Content>
    </Card>
  );
}
