import { useTranslation } from 'react-i18next';
import { ChoiceGroup } from '@tedi-design-system/react/tedi';

interface NotifyCarrierCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * „Teavita vedajat rikkumisest" linnuke kinnitamise juures. Märge salvestatakse
 * kinnitamisel; vedajale saadetakse raske rikkumise (MSI/VSI/SI) teavitus
 * avalikustamisel, mis võib olla ka automaatne.
 */
export const NotifyCarrierCheckbox = ({
  checked,
  onChange,
}: NotifyCarrierCheckboxProps) => {
  const { t } = useTranslation();
  return (
    <ChoiceGroup
      id="notifyCarrierOnConfirm"
      name="notifyCarrierOnConfirm"
      inputType="checkbox"
      label=""
      value={checked ? ['notifyCarrier'] : []}
      items={[
        {
          id: 'notifyCarrierOnConfirm-item',
          label: t('forms.notifyCarrierOnConfirm'),
          value: 'notifyCarrier',
        },
      ]}
      onChange={(val) => {
        const vals = Array.isArray(val) ? val : [val];
        onChange(vals.includes('notifyCarrier'));
      }}
    />
  );
};
