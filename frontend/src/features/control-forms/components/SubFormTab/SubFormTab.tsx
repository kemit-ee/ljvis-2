import { Tabs, Text } from '@tedi-design-system/react/tedi';
import { useTranslation } from 'react-i18next';
import type { SubFormHandle } from '../../hooks/useSubForm';

interface SubFormTabProps<T, Ref = unknown> {
  id: string;
  open: boolean;
  subForm: SubFormHandle<T, Ref>;
  renderView: (form: T) => React.ReactNode;
  renderEdit: (form: T, editCardRef: React.MutableRefObject<Ref | null>) => React.ReactNode;
}

export function SubFormTab<T, Ref = unknown>({
  id,
  open,
  subForm,
  renderView,
  renderEdit,
}: SubFormTabProps<T, Ref>) {
  const { t } = useTranslation();
  const { form, loaded, editActive, editCardRef } = subForm;

  if (!open) return null;

  return (
    <Tabs.Content id={id} className="p-1">
      {!loaded ? (
        <Text>{t('common.loading')}</Text>
      ) : form && !editActive ? (
        renderView(form)
      ) : (
        renderEdit((form ?? {}) as T, editCardRef)
      )}
    </Tabs.Content>
  );
}
