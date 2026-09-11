import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Dropdown, Heading } from '@tedi-design-system/react/tedi';
import type { DriveRestForm } from '../../types';
import { DriveRestFormCreatePage } from '../../pages/drive-rest-form/DriveRestFormCreatePage';
import type { FormAuthority } from '../../pages/drive-rest-form/useDriveRestForm';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable.tsx';
import { printDriveRestForm } from '../../api';

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
  authority?: FormAuthority;
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
  authority = 'PPA',
}, ref) {
  const { t } = useTranslation();
  const formRef = useRef<DriveRestFormRef | null>(null);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [printing, setPrinting] = useState(false);

  const handlePrint = async (blank: boolean) => {
    if (printing) return;
    setPrinting(true);
    try {
      const result = form.id
        ? await printDriveRestForm(String(form.id), scope, blank)
        : await printDriveRestForm('', scope, true);
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
          authority={authority}
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
            {form.id ? (
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
            ) : (
              <Button type="button" visualType="secondary" isLoading={printing} disabled={printing} onClick={() => void handlePrint(true)}>
                {t('common.printBlank')}
              </Button>
            )}
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
