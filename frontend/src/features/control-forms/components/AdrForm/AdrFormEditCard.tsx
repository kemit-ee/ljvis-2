import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading } from '@tedi-design-system/react/tedi';
import type { AdrForm } from '../../types';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import { AdrFormCreatePage, type AdrFormCreatePageRef } from '../../pages/adr-form/AdrFormCreatePage';

export interface AdrFormEditCardRef {
  save: () => void;
  isDirty: () => boolean;
  hasErrors: () => boolean;
  validateForm?: () => void;
}

interface AdrFormEditCardProps {
  form: AdrForm;
  compoundFormKey: number;
  onSaved: (id?: string) => void;
  onCancel: () => void;
  canConfirm: boolean;
  onConfirm: () => void;
  formType: string;
  onValuesChange?: (values: Partial<AdrForm>) => void;
  initialValidate?: boolean;
}

export const AdrFormEditCard = forwardRef<AdrFormEditCardRef, AdrFormEditCardProps>(
  function AdrFormEditCard(
    { form, compoundFormKey, onSaved, canConfirm, formType, onValuesChange, initialValidate },
    ref,
  ) {
    const { t } = useTranslation();
    const formRef = useRef<AdrFormCreatePageRef | null>(null);
    const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);

    useImperativeHandle(ref, () => ({
      save: () => formRef.current?.handleSubmit(),
      isDirty: () => formRef.current?.isDirty() ?? false,
      hasErrors: () => formRef.current?.hasErrors() ?? false,
      validateForm: () => formRef.current?.validateForm?.(),
    }));

    return (
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h1" className="mb-1" color="primary">
            {form.subFormNumber}
          </Heading>
          <AdrFormCreatePage
            initialData={form}
            compoundFormKey={compoundFormKey}
            onSaved={(id) => {
              setVersionsRefreshKey((k) => k + 1);
              onSaved(id);
            }}
            onValuesChange={onValuesChange}
            initialValidate={initialValidate}
            ref={(r) => { formRef.current = r; }}
          />
          {form.id && (
            <FormVersionsTable
              formId={form.id}
              formType={formType}
              refreshKey={versionsRefreshKey}
            />
          )}
          <div className="confirm-button">
            <div>
              {canConfirm && (
                <Button
                  type="button"
                  onClick={() => formRef.current?.confirm?.()}
                >
                  {t('common.confirm')}
                </Button>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  },
);

AdrFormEditCard.displayName = 'AdrFormEditCard';
