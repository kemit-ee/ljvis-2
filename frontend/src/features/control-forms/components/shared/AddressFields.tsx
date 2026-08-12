import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, TextField } from '@tedi-design-system/react/tedi';
import { COUNTRIES } from '../../../../constants/constants';
import { useClassifiers } from '../../../classifiers/ClassifierProvider.tsx';

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
  counties: { id: number; name: string }[];
  disabled?: boolean;
  errors?: Partial<Record<keyof AddressFieldsValue, string>>;
}

const asOption = (e: { id: number; name: string }) => ({ value: String(e.id), label: e.name });

export function AddressFields({
  value,
  onChange,
  counties,
  disabled,
  errors,
}: AddressFieldsProps) {
  const { t } = useTranslation();
  const { getChildren } = useClassifiers();

  const countryOptions = COUNTRIES.map((c) => ({
    value: c.value,
    label: t(c.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  const citiesParishes = useMemo(
    () =>
      value.county
        ? getChildren('EHAK', Number(value.county)).map((e) => ({
            id: e.classifierValueKey,
            name: e.name,
          }))
        : [],
    [value.county, getChildren],
  );

  const countyOptions = counties.map(asOption);
  const cityOptions = citiesParishes.map(asOption);
  const isEstonia = value.countryCode === 'EE';

  return (
    <>
      <Select
        id="addressCountryCode"
        label={t('forms.shared.address.country')}
        options={countryOptions}
        value={countryOptions.find((o) => o.value === value.countryCode) ?? null}
        onChange={(val) => {
          const countryCode =
            val && !Array.isArray(val) ? (val as { value: string }).value : '';
          // UC-08/UC-09: switching country always clears county/city — an
          // EHAK id from the dropdown is meaningless as free text and vice
          // versa, so the previous value can never be valid after the switch.
          onChange({ ...value, countryCode, county: '', city: '' });
        }}
        disabled={disabled}
        {...(errors?.countryCode
          ? { helper: { text: errors.countryCode, type: 'error' as const } }
          : {})}
      />
      {isEstonia ? (
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
      ) : (
        <TextField
          id="addressCounty"
          label={t('forms.shared.address.county')}
          value={value.county}
          onChange={(v) => onChange({ ...value, county: v, city: '' })}
          disabled={disabled}
          {...(errors?.county
            ? { helper: { text: errors.county, type: 'error' as const } }
            : {})}
        />
      )}
      {isEstonia ? (
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
      ) : (
        <TextField
          id="addressCity"
          label={t('forms.shared.address.city')}
          value={value.city}
          onChange={(v) => onChange({ ...value, city: v })}
          disabled={disabled}
          {...(errors?.city
            ? { helper: { text: errors.city, type: 'error' as const } }
            : {})}
        />
      )}
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
        input={{ maxLength: 10 }}
        {...(errors?.postalCode
          ? { helper: { text: errors.postalCode, type: 'error' as const } }
          : {})}
      />
    </>
  );
}
