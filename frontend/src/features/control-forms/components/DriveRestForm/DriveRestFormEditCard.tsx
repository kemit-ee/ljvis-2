import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading } from '@tedi-design-system/react/tedi';
import type { DriveRestForm } from '../../types';
import { DriveRestFormCreatePage } from '../../pages/drive-rest-form/DriveRestFormCreatePage';
import type { FormAuthority } from '../../pages/drive-rest-form/useDriveRestForm';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';
import { SubFormEditPublishButton } from '../SubFormEditPublishButton/SubFormEditPublishButton';
import { FormPrintButton } from '../FormPrintButton/FormPrintButton';
import { NotifyCarrierCheckbox } from '../shared/NotifyCarrierCheckbox';

interface DriveRestFormRef {
  formElement: HTMLFormElement;
  handleSubmit: (overrideCompoundFormKey?: number) => void;
  getFormData?: () => Partial<DriveRestForm>;
  setFormData?: (data: Partial<DriveRestForm>) => void;
  hasErrors: () => boolean;
  isDirty: () => boolean;
  validateForm?: () => void;
  confirm?: (notifyCarrier?: boolean) => void;
}

export interface DriveRestFormEditCardRef {
  save: () => void;
  isDirty: () => boolean;
  validateForm?: () => void;
  setFormData?: (data: Partial<DriveRestForm>) => void;
}

interface DriveRestFormEditCardProps {
  scope: 'driver' | 'teammate';
  form: DriveRestForm;
  compoundFormKey: number;
  onSaved: (id?: string, confirmed?: boolean) => void;
  onCancel: () => void;
  canConfirm: boolean;
  canPublish?: boolean;
  onPublish?: () => Promise<unknown>;
  onConfirm: () => void;
  formType: string;
  onValuesChange?: (values: Partial<DriveRestForm>) => void;
  initialValidate?: boolean;
  authority?: FormAuthority;
}

export const DriveRestFormEditCard = forwardRef<DriveRestFormEditCardRef, DriveRestFormEditCardProps>(function DriveRestFormEditCard({
  scope,
  form,
  compoundFormKey,
  onSaved,
  canConfirm,
  canPublish,
  onPublish,
  formType,
  onValuesChange,
  initialValidate,
  authority = 'PPA',
}, ref) {
  const { t } = useTranslation();
  const formRef = useRef<DriveRestFormRef | null>(null);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [notifyCarrier, setNotifyCarrier] = useState(false);


  useImperativeHandle(ref, () => ({
    save: () => formRef.current?.handleSubmit(),
    isDirty: () => formRef.current?.isDirty() ?? false,
    validateForm: () => formRef.current?.validateForm?.(),
    setFormData: (data) => formRef.current?.setFormData?.(data),
  }));

  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h1" className="mb-1" color="primary">
          {form.subFormNumber}
        </Heading>
        <DriveRestFormCreatePage
          type={scope}
          authority={authority}
          initialData={form}
          compoundFormKey={compoundFormKey}
          onSaved={(id, confirmed) => {
            setVersionsRefreshKey((k) => k + 1);
            onSaved(id, confirmed);
          }}
          onValuesChange={onValuesChange}
          initialValidate={initialValidate}
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
          <div className="page-actions-buttons">
            <FormPrintButton
              endpoint={`/v1/control-forms/drive-rest-form/${scope}/read/print`}
              id={form.id}
            />
            {canConfirm && (
              <>
                <NotifyCarrierCheckbox
                  checked={notifyCarrier}
                  onChange={setNotifyCarrier}
                />
                <Button
                  type="button"
                  onClick={() => formRef.current?.confirm?.(notifyCarrier)}
                >
                  {t('common.confirm')}
                </Button>
              </>
            )}
            <SubFormEditPublishButton
              form={form}
              canPublish={canPublish}
              onPublish={onPublish}
              isDirty={() => formRef.current?.isDirty() ?? false}
            />
          </div>
        </div>
      </Card.Content>
    </Card>
  );
});

DriveRestFormEditCard.displayName = 'DriveRestFormEditCard';
