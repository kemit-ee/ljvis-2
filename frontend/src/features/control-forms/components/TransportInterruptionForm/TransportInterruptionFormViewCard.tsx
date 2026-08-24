import { Card, Heading } from '@tedi-design-system/react/tedi';
import type { TransportInterruptionForm } from '../../types';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import { useTransportInterruptionForm } from '../../pages/transport-interruption-form/useTransportInterruptionForm';
import { TransportInterruptionFormFields } from '../../pages/transport-interruption-form/TransportInterruptionFormFields';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';

interface TransportInterruptionFormViewCardProps {
  form: TransportInterruptionForm;
  canEdit: boolean;
  onEdit: () => void;
  formType: string;
}

export function TransportInterruptionFormViewCard({ form, formType }: TransportInterruptionFormViewCardProps) {
  const { formik, counties, addressValue, setAddressValue, toggleLegalBasis } =
    useTransportInterruptionForm(
      form,
      () => {},
      form.compoundFormKey ? Number(form.compoundFormKey) : undefined,
    );

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

        <TransportInterruptionFormFields
          formik={formik}
          counties={counties}
          addressValue={addressValue}
          setAddressValue={setAddressValue}
          toggleLegalBasis={toggleLegalBasis}
          canEdit={false}
          isDesktop={isDesktop}
        />

        {form.id && <FormVersionsTable formId={form.id} formType={formType} />}
      </Card.Content>
    </Card>
  );
}
