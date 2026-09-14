import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Heading,
  Text,
  TextField,
} from '@tedi-design-system/react/tedi';
import { MaskedDateField } from '../../../control-forms/components/shared/MaskedDateField.tsx';
import { formatDate, toIsoDate } from '../../../../hooks/dateUtils';
import { searchNuSources } from '../../api';
import type { NuSourceCandidate } from '../../types';
import { createColumnHelper } from '@tanstack/react-table';
import { AppTable } from '../../../../shared/components/AppTable';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';

const columnHelper = createColumnHelper<NuSourceCandidate>();

export function NuSourcePicker({
  onSelect,
}: {
  onSelect: (candidate: NuSourceCandidate) => void;
}) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const columns = useMemo(
    () => [
      columnHelper.accessor('firstName', {
        header: t('erru.nu.form.tmFirstName'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('lastName', {
        header: t('erru.nu.form.tmFamilyName'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('dateOfBirth', {
        header: t('erru.nu.form.tmDateOfBirth'),
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('certificateNumber', {
        header: t('erru.nu.form.certificateNumber'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <Button
            type="button"
            size="small"
            visualType="secondary"
            onClick={() => onSelect(info.row.original)}
          >
            {t('common.select')}
          </Button>
        ),
      }),
    ],
    [t, onSelect],
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [results, setResults] = useState<NuSourceCandidate[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const canSearch =
    (!!firstName && !!lastName && !!dateOfBirth) || !!certificateNumber;

  const handleSearch = async () => {
    if (!canSearch || isSearching) return;
    setSearchError(null);
    setResults(null);
    setIsSearching(true);
    try {
      const res = await searchNuSources({
        firstName,
        lastName,
        dateOfBirth,
        certificateNumber,
      });
      setResults(res.content);
    } catch {
      setSearchError(t('erru.nu.source.searchFailed'));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2" className="mb-1">
          {t('erru.nu.source.title')}
        </Heading>
        <Text className="mb-1">{t('erru.nu.source.hint')}</Text>

        <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
          <TextField
            id="nu-source-first-name"
            label={t('erru.nu.form.tmFirstName')}
            value={firstName}
            onChange={setFirstName}
          />
          <TextField
            id="nu-source-last-name"
            label={t('erru.nu.form.tmFamilyName')}
            value={lastName}
            onChange={setLastName}
          />
          <MaskedDateField
            id="nu-source-date-of-birth"
            label={t('erru.nu.form.tmDateOfBirth')}
            selected={dateOfBirth ? new Date(dateOfBirth) : undefined}
            onSelect={(v) =>
              setDateOfBirth(toIsoDate(v as Date | undefined) ?? '')
            }
            monthYearSelectType="grid"
            disableFuture
          />
          <TextField
            id="nu-source-certificate-number"
            label={t('erru.nu.form.certificateNumber')}
            value={certificateNumber}
            onChange={setCertificateNumber}
          />
        </div>

        <div className="mt-1">
          <div className="filter-actions">
            <Button
              type="button"
              onClick={handleSearch}
              disabled={!canSearch || isSearching}
              isLoading={isSearching}
            >
              {t('common.search')}
            </Button>
          </div>
        </div>

        {searchError && (
          <Alert type="danger" size="small" className="mt-1">
            {searchError}
          </Alert>
        )}

        {results && results.length === 0 && (
          <Alert type="info" size="small" className="mt-1">
            {t('erru.nu.source.noResults')}
          </Alert>
        )}

        {results && results.length > 0 && (
          <div className="mt-1">
            <AppTable
              id="nu-source-results"
              data={results}
              columns={columns}
              hidePagination
              enableSorting={false}
            />
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
