import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Card, Heading } from '@tedi-design-system/react/tedi';
import { AppTable } from './AppTable';
import { formatDateTime } from '../../hooks/dateUtils';
import styles from './VersionsTable.module.css';

export interface VersionSnapshot {
  snapshotId: string | number;
  version: number;
  createdAt: string;
  createdBy: string;
  orgName?: string | null;
  status: string;
}

const columnHelper = createColumnHelper<VersionSnapshot>();

export function VersionsTable({
  id,
  snapshots,
  getSnapshotLink,
  getStatusLabel,
}: {
  id: string;
  snapshots: VersionSnapshot[];
  getSnapshotLink: (snapshot: VersionSnapshot) => string;
  getStatusLabel: (status: string) => string;
}) {
  const { t } = useTranslation();
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'rowIndex',
        header: '#',
        cell: (info) => info.row.index + 1,
      }),
      columnHelper.accessor('version', { header: t('forms.versions.version') }),
      columnHelper.accessor('createdAt', {
        header: t('forms.versions.modified'),
        cell: (info) => formatDateTime(info.getValue()),
      }),
      columnHelper.accessor('createdBy', {
        header: t('forms.versions.user'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('orgName', {
        header: t('forms.versions.organisation'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('status', {
        header: t('forms.versions.status'),
        cell: (info) => getStatusLabel(info.getValue()),
      }),
      columnHelper.display({
        id: 'open',
        header: '',
        cell: (info) => (
          <Link to={getSnapshotLink(info.row.original)} className="table-link">
            {t('forms.versions.open')}
          </Link>
        ),
      }),
    ],
    [t, getStatusLabel, getSnapshotLink],
  );

  if (!snapshots.length) return null;
  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h3" className="mb-1" color="primary">
          {t('forms.versions.title')}
        </Heading>
        <AppTable
          id={id}
          className={styles.table}
          data={snapshots}
          columns={columns}
          enableSorting={false}
        />
      </Card.Content>
    </Card>
  );
}
