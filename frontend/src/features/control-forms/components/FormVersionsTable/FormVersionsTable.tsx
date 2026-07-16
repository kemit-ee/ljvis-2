import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import { Card, Heading } from '@tedi-design-system/react/tedi';
import { getFormSnapshots } from '../../api.ts';
import type { FormSnapshot } from '../../types.ts';
import { formatDateTime } from '../../../../hooks/dateUtils.ts';
import { Link } from 'react-router-dom';
import { FORM_STATUS_KEY } from '../../../../constants/constants.ts';
import '../FormVersionsTable/FormVersionsTable.module.css';

interface FormVersionsTableProps {
  formId: string;
  formType: string;
}

const columnHelper = createColumnHelper<FormSnapshot>();

export function FormVersionsTable({
  formId,
  formType,
}: FormVersionsTableProps) {
  const { t } = useTranslation();
  const [snapshots, setSnapshots] = useState<FormSnapshot[]>([]);

  useEffect(() => {
    getFormSnapshots(formId, formType)
      .then((res) => setSnapshots(Array.isArray(res) ? res : []))
      .catch(console.error);
  }, [formId]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'rowIndex',
        header: '#',
        cell: (info) => info.row.index + 1,
        enableSorting: false,
      }),
      columnHelper.accessor('version', {
        header: t('forms.versions.version'),
        enableSorting: false,
      }),
      columnHelper.accessor('createdAt', {
        header: t('forms.versions.modified'),
        cell: (info) => formatDateTime(info.getValue()),
        enableSorting: false,
      }),
      columnHelper.accessor('createdBy', {
        header: t('forms.versions.user'),
        enableSorting: false,
      }),
      columnHelper.accessor('orgName', {
        header: t('forms.versions.organisation'),
        enableSorting: false,
      }),
      columnHelper.accessor('status', {
        header: t('forms.versions.status'),
        cell: (info) => {
          const s = info.getValue();
          return FORM_STATUS_KEY[s] ? t(FORM_STATUS_KEY[s]) : s;
        },
        enableSorting: false,
      }),
      columnHelper.display({
        id: 'open',
        header: '',
        cell: (info) => {
          if (info.row.index === info.table.getRowModel().rows.length - 1)
            return null;
          const formPath = formType.replace(/-form$/, '');
          return (
            <Link
              to={`/control-forms/${formPath}/${formId}/${info.row.original.snapshotId}`}
              className="table-link"
            >
              {t('forms.versions.open')}
            </Link>
          );
        },
        enableSorting: false,
      }),
    ],
    [t, formId],
  );

  if (snapshots.length === 0) return null;

  return (
    <Card className="mb-1">
      <Card.Content>
        <Heading element="h3" className="mb-1" color="primary">
          {t('forms.versions.title')}
        </Heading>
        <Table
          id="form-versions-table"
          data={snapshots}
          columns={columns}
          placeholder={{ children: t('common.tableIsEmpty') }}
        />
      </Card.Content>
    </Card>
  );
}
