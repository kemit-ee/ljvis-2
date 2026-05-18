import { useTranslation } from 'react-i18next';
import { TextField } from '@tedi-design-system/react/tedi';

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  helper?: { text: string; type: 'error' };
}

export function PhoneField({ value, onChange, helper }: PhoneFieldProps) {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '3.5rem' }}>
        <TextField
          id="phone-prefix"
          value="+372"
          label={t('users.phone')}
          disabled
        />
      </div>
      <div style={{ flex: 1 }}>
        <TextField
          id="phone"
          value={value}
          onChange={(v) => {
            const numericValue = v.replace(/[^\d\s]/g, '').replace(/\s+/g, ' ');
            onChange(numericValue);
          }}
          input={{ maxLength: 50 }}
          {...(helper ? { helper } : {})}
        />
      </div>
    </div>
  );
}
