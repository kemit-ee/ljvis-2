import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading } from '@tedi-design-system/react/tedi';
import type { TechnicalCheckForm, Trailer } from '../../types';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';
import { TechnicalCheckFormCreatePage, type TechnicalCheckFormCreatePageRef } from '../../pages/technical-check-form/TechnicalCheckFormCreatePage.tsx';

export interface TechnicalCheckFormEditCardRef {
  save: () => void;
  isDirty: () => boolean;
  hasErrors: () => boolean;
  validateForm?: () => void;
}

interface TechnicalCheckFormEditCardProps {
  scope: 'vehicle' | 'trailer';
  form: TechnicalCheckForm;
  compoundFormKey: number;
  onSaved: (id?: string) => void;
  onCancel: () => void;
  canConfirm: boolean;
  onConfirm: () => void;
  formType: string;
  onValuesChange?: (values: Partial<TechnicalCheckForm>) => void;
  initialValidate?: boolean;
  compoundTrailers?: Trailer[];
  trailerIndex?: number;
}

export const TechnicalCheckFormEditCard = forwardRef<
  TechnicalCheckFormEditCardRef,
  TechnicalCheckFormEditCardProps
>(function TechnicalCheckFormEditCard(
  {
    scope,
    form,
    compoundFormKey,
    onSaved,
    canConfirm,
    formType,
    onValuesChange,
    initialValidate,
    compoundTrailers,
    trailerIndex,
  },
  ref,
) {
  const { t } = useTranslation();
  const formRef = useRef<TechnicalCheckFormCreatePageRef | null>(null);
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
        <TechnicalCheckFormCreatePage
          type={scope}
          initialData={form}
          compoundFormKey={compoundFormKey}
          onSaved={(id) => {
            setVersionsRefreshKey((k) => k + 1);
            onSaved(id);
          }}
          onValuesChange={onValuesChange}
          initialValidate={initialValidate}
          compoundTrailers={compoundTrailers}
          trailerIndex={trailerIndex}
          ref={(ref) => {
            formRef.current = ref;
          }}
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
});

TechnicalCheckFormEditCard.displayName = 'TechnicalCheckFormEditCard';
