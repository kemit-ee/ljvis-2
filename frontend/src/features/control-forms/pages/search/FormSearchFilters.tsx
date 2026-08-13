import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Select,
  TextField,
  DateField,
} from '@tedi-design-system/react/tedi';
import { toIsoDate } from '../../../../hooks/dateUtils';
import type { FormSearchFilters as Filters } from '../../types';
import { FORM_TYPE_META, FORM_TYPE_ORDER } from './formSearchMeta';
import styles from './FormSearch.module.css';

interface Option {
  value: string;
  label: string;
}

interface Props {
  draft: Filters;
  setField: (key: keyof Filters, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

const pick = (options: Option[], value: string): Option | null =>
  options.find((o) => o.value === value) ?? null;

const selected = (val: unknown): string =>
  val && !Array.isArray(val) ? (val as { value: string }).value : '';

export function FormSearchFilters({
  draft,
  setField,
  onSearch,
  onClear,
}: Props) {
  const { t } = useTranslation();

  const formTypeOptions = useMemo<Option[]>(
    () =>
      FORM_TYPE_ORDER.map((code) => ({
        value: code,
        label: t(FORM_TYPE_META[code].labelKey),
      })),
    [t],
  );

  const statusOptions = useMemo<Option[]>(
    () => [
      { value: 'saved', label: t('search.status.saved') },
      { value: 'confirmed', label: t('search.status.confirmed') },
      { value: 'published', label: t('search.status.published') },
    ],
    [t],
  );

  const violationOptions = useMemo<Option[]>(
    () => [
      { value: 'true', label: t('common.yes') },
      { value: 'false', label: t('common.no') },
    ],
    [t],
  );

  return (
    <div>
      <div className={styles['filter-grid']}>
        <DateField
          id="search-date-from"
          label={t('search.filters.dateFrom')}
          selected={draft.dateFrom ? new Date(draft.dateFrom) : undefined}
          onSelect={(v) => setField('dateFrom', toIsoDate(v))}
          placeholder={t('common.dateFieldPlaceholder')}
        />
        <DateField
          id="search-date-to"
          label={t('search.filters.dateTo')}
          selected={draft.dateTo ? new Date(draft.dateTo) : undefined}
          onSelect={(v) => setField('dateTo', toIsoDate(v))}
          placeholder={t('common.dateFieldPlaceholder')}
        />
        <Select
          id="search-form-type"
          label={t('search.filters.formType')}
          options={formTypeOptions}
          value={pick(formTypeOptions, draft.formType)}
          onChange={(val) => setField('formType', selected(val))}
        />
        <TextField
          id="search-vehicle-reg-nr"
          label={t('search.filters.vehicleRegNr')}
          value={draft.vehicleRegNr}
          onChange={(v) => setField('vehicleRegNr', v)}
        />
        <TextField
          id="search-company-reg-code"
          label={t('search.filters.companyRegCode')}
          value={draft.companyRegCode}
          onChange={(v) => setField('companyRegCode', v)}
        />
        <TextField
          id="search-company-name"
          label={t('search.filters.companyName')}
          value={draft.companyName}
          onChange={(v) => setField('companyName', v)}
        />
        <TextField
          id="search-driver"
          label={t('search.filters.driver')}
          value={draft.driver}
          onChange={(v) => setField('driver', v)}
        />
        <TextField
          id="search-county"
          label={t('search.filters.county')}
          value={draft.county}
          onChange={(v) => setField('county', v)}
        />
        <Select
          id="search-has-violation"
          label={t('search.filters.hasViolation')}
          options={violationOptions}
          value={pick(violationOptions, draft.hasViolation)}
          onChange={(val) => setField('hasViolation', selected(val))}
        />
        <Select
          id="search-status"
          label={t('search.filters.status')}
          options={statusOptions}
          value={pick(statusOptions, draft.status)}
          onChange={(val) => setField('status', selected(val))}
        />
      </div>
      <div className={styles['filter-actions']}>
        <Button onClick={onSearch}>{t('common.search')}</Button>
        <Button visualType="secondary" onClick={onClear}>
          {t('search.clear')}
        </Button>
      </div>
    </div>
  );
}
