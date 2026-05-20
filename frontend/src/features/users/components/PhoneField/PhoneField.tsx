import { useTranslation } from 'react-i18next';
import { TextField } from '@tedi-design-system/react/tedi';
import styles from './PhoneField.module.css';

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  helper?: { text: string; type: 'error' };
}

export function PhoneField({ value, onChange, helper }: PhoneFieldProps) {
  const { t } = useTranslation();

  return (
      <div className={styles['phone-field']}>
          <div className={styles['phone-prefix']}>
              <TextField
                  id="phone-prefix"
                  value="+372"
                  label={t('users.phone')}
                  disabled
              />
          </div>
          <div className={styles['phone-input']}>
              <TextField
                  id="phone"
                  label={t('users.phone')}
                  hideLabel
                  value={value}
                  onChange={(v) => {
                      const numericValue = v.replace(/[^\d\s]/g, '').replace(/\s+/g, ' ');
                      onChange(numericValue);
                  }}
                  input={{maxLength: 50}}
                  {...(helper ? {helper} : {})}
              />
          </div>
      </div>
  );
}
