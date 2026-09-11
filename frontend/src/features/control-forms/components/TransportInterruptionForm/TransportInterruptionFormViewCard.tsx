import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { printTransportInterruptionForm } from '../../api';
import type { TransportInterruptionForm } from '../../types';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import { useTransportInterruptionForm } from '../../pages/transport-interruption-form/useTransportInterruptionForm';
import { TransportInterruptionFormFields } from '../../pages/transport-interruption-form/TransportInterruptionFormFields';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';

interface TransportInterruptionFormViewCardProps {
  form: TransportInterruptionForm;
  formType: string;
  canPublish?: boolean;
  onPublish?: () => Promise<unknown>;
}

export function TransportInterruptionFormViewCard({ form, formType, canPublish, onPublish }: TransportInterruptionFormViewCardProps) {
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [printing, setPrinting] = useState(false);
  const { t } = useTranslation();

  const handlePrint = async () => {
    if (!form.id || printing) return;
    setPrinting(true);
    try {
      const result = await printTransportInterruptionForm(String(form.id));
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

        {form.id && <FormVersionsTable formId={form.id} formType={formType} refreshKey={versionsRefreshKey} />}
        <div className="confirm-button">
          <div>
            {form.id && (
              <Button type="button" visualType="secondary" isLoading={printing} disabled={printing} onClick={() => void handlePrint()}>
                {t('common.print')}
              </Button>
            )}
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
