import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading } from '@tedi-design-system/react/tedi';
import type { DriveRestForm } from '../../types';
import { DriveRestFormCreatePage } from '../../pages/drive-rest-form/DriveRestFormCreatePage';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';

interface DriveRestFormRef {
  formElement: HTMLFormElement;
  handleSubmit: (overrideCompoundFormKey?: number) => void;
  getFormData?: () => Partial<DriveRestForm>;
  setFormData?: (data: Partial<DriveRestForm>) => void;
  hasErrors: () => boolean;
  isDirty: () => boolean;
  validateForm?: () => void;
  confirm?: () => void;
}

export interface DriveRestFormEditCardRef {
  save: () => void;
  isDirty: () => boolean;
  validateForm?: () => void;
}

interface DriveRestFormEditCardProps {
  scope: 'driver' | 'teammate';
  form: DriveRestForm;
  compoundFormKey: number;
  onSaved: (id?: string) => void;
  onCancel: () => void;
  canConfirm: boolean;
  onConfirm: () => void;
  formType: string;
  onValuesChange?: (values: Partial<DriveRestForm>) => void;
  initialValidate?: boolean;
}

export const DriveRestFormEditCard = forwardRef<DriveRestFormEditCardRef, DriveRestFormEditCardProps>(function DriveRestFormEditCard({
  scope,
  form,
  compoundFormKey,
  onSaved,
  canConfirm,
  formType,
  onValuesChange,
  initialValidate,
}, ref) {
  const { t } = useTranslation();
  const formRef = useRef<DriveRestFormRef | null>(null);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);

  useImperativeHandle(ref, () => ({
    save: () => formRef.current?.handleSubmit(),
    isDirty: () => formRef.current?.isDirty() ?? false,
    validateForm: () => formRef.current?.validateForm?.(),
  }));

  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h1" className="mb-1" color="primary">
          {form.subFormNumber}
        </Heading>
        <DriveRestFormCreatePage
          type={scope}
          initialData={form}
          compoundFormKey={compoundFormKey}
          onSaved={(id) => { setVersionsRefreshKey((k) => k + 1); onSaved(id); }}
          onValuesChange={onValuesChange}
          initialValidate={initialValidate}
          ref={(ref) => {
            formRef.current = ref;
          }}
        />
        {form.id && <FormVersionsTable formId={form.id} formType={formType} refreshKey={versionsRefreshKey} />}
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

DriveRestFormEditCard.displayName = 'DriveRestFormEditCard';
