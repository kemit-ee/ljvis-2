import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, TextField } from '@tedi-design-system/react/tedi';
import { COUNTRIES } from '../../../../constants/constants';
import { listEhakCitiesParishes } from '../../../ehak/api';
import type { Ehak } from '../../../ehak/types';

export interface AddressFieldsValue {
  countryCode: string;
  county: string;
  city: string;
  street: string;
  postalCode: string;
}

interface AddressFieldsProps {
  value: AddressFieldsValue;
  onChange: (value: AddressFieldsValue) => void;
  counties: Ehak[];
  disabled?: boolean;
  errors?: Partial<Record<keyof AddressFieldsValue, string>>;
}

const asOption = (e: Ehak) => ({ value: String(e.id), label: e.name });

export function AddressFields({
  value,
  onChange,
  counties,
  disabled,
  errors,
}: AddressFieldsProps) {
  const { t } = useTranslation();
  const [citiesParishes, setCitiesParishes] = useState<Ehak[]>([]);

  const countryOptions = COUNTRIES.map((c) => ({
    value: c.value,
    label: t(c.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  useEffect(() => {
    if (value.county) {
      listEhakCitiesParishes(Number(value.county))
        .then((data) => setCitiesParishes(Array.isArray(data) ? data : []))
        .catch(() => setCitiesParishes([]));
    } else {
      setCitiesParishes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.county]);

  const countyOptions = counties.map(asOption);
  const cityOptions = citiesParishes.map(asOption);

  return (
    <>
      <Select
        id="addressCountryCode"
        label={t('forms.shared.address.country')}
        options={countryOptions}
        value={countryOptions.find((o) => o.value === value.countryCode) ?? null}
        onChange={(val) =>
          onChange({
            ...value,
            countryCode: val && !Array.isArray(val) ? (val as { value: string }).value : '',
          })
        }
        disabled={disabled}
        {...(errors?.countryCode
          ? { helper: { text: errors.countryCode, type: 'error' as const } }
          : {})}
      />
      <Select
        id="addressCounty"
        label={t('forms.shared.address.county')}
        options={countyOptions}
        value={countyOptions.find((o) => o.value === value.county) ?? null}
        onChange={(val) => {
          const v = val && !Array.isArray(val) ? (val as { value: string }).value : '';
          onChange({ ...value, county: v, city: '' });
        }}
        disabled={disabled}
        {...(errors?.county
          ? { helper: { text: errors.county, type: 'error' as const } }
          : {})}
      />
      <Select
        id="addressCity"
        label={t('forms.shared.address.city')}
        options={cityOptions}
        value={cityOptions.find((o) => o.value === value.city) ?? null}
        onChange={(val) =>
          onChange({
            ...value,
            city: val && !Array.isArray(val) ? (val as { value: string }).value : '',
          })
        }
        disabled={disabled || !value.county}
        {...(errors?.city
          ? { helper: { text: errors.city, type: 'error' as const } }
          : {})}
      />
      <TextField
        id="addressStreet"
        label={t('forms.shared.address.street')}
        value={value.street}
        onChange={(v) => onChange({ ...value, street: v })}
        disabled={disabled}
        {...(errors?.street
          ? { helper: { text: errors.street, type: 'error' as const } }
          : {})}
      />
      <TextField
        id="addressPostalCode"
        label={t('forms.shared.address.postalCode')}
        value={value.postalCode}
        onChange={(v) => onChange({ ...value, postalCode: v })}
        disabled={disabled}
        {...(errors?.postalCode
          ? { helper: { text: errors.postalCode, type: 'error' as const } }
          : {})}
      />
    </>
  );
}
