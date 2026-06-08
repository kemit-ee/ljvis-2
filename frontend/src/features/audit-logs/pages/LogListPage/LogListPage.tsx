import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import { Card, Heading, Search, Text, Button } from '@tedi-design-system/react/tedi';
import type { AuditLog } from '../../types.ts';
import { useLogList } from './useLogList.ts';
import { useLogListCsv } from './useLogListCsv.ts';
import { useAuth } from '../../../auth/AuthContext.tsx';
import './LogListPage.module.css';
import { formatDateTime } from '../../../../hooks/dateUtils.ts';
import { buildSortString } from '../../../../hooks/stringUtils.ts';


const columnHelper = createColumnHelper<AuditLog>();

export function LogListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const forbidden = !hasPermission('classifier.list');

  const {
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
  } = useLogList();

  const { exportCsv } = useLogListCsv();

  const handleExportCsv = useCallback(() => {
    exportCsv({
      search: searchInput,
      sorting: buildSortString(sorting, 'createdAt desc'),
    });
  }, [exportCsv, searchInput, sorting]);

  const handleRowClick = useCallback(
    (row: AuditLog) => {
      navigate(`/logs/${row.id}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        header: t('logs.date'),
        cell: (info) => {
          return formatDateTime(info.getValue());
        },
      }),
      columnHelper.accessor('actorName', {
        id: 'actor',
        header: t('logs.person'),
        cell: (info) => {
          const actorName = info.row.original.actorName;
          const actorPersonalCode = info.row.original.actorPersonalCode;
          
          if (actorName && actorPersonalCode) {
            return `${actorName} (${actorPersonalCode})`;
          }
          if (actorPersonalCode) {
            return actorPersonalCode;
          }
          if (actorName) {
            return actorName;
          }
          return '-';
        },
      }),
      columnHelper.accessor('eventCategory', {
          header: t('logs.eventCategory'),
          cell: (info) => {
              return info.getValue();
          },
      }),
      columnHelper.accessor('eventType', {
        header: t('logs.eventType'),
        cell: (info) => {
          return info.getValue();
        },
        enableSorting: false
      }),
      columnHelper.accessor('description', {
          header: t('logs.description'),
          cell: (info) => {
              return info.getValue();
          },
          enableSorting: false
      }),
      columnHelper.display({
        id: 'viewDetails',
        header: '',
        cell: (info) => {
          return (
            <div className="cell-center">
              <a
                href={`/logs/${info.row.original.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRowClick(info.row.original);
                }}
                className="table-link"
              >
                {t('logs.viewDetails')}
              </a>
            </div>
          );
        },
      }),
    ],
    [t, handleRowClick],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('logs.title')}</Heading>
              <Button onClick={handleExportCsv}>
                  {t('logs.exportCsv')}
              </Button>
          </div>
          <div className="grid-2col">
            <div className="search-wrapper">
              <Search
                id="log-search"
                label={t('common.search')}
                hideLabel
                value={searchInput}
                onIconClick={() => handleSearch(searchInput)}
                onChange={setSearchInput}
                onSearch={handleSearch}
                onClear={clearSearch}
                placeholder={t('common.search')}
              />
            </div>
          </div>
          <Table
            id="logs-table"
            data={data}
            columns={columns}
            isLoading={isLoading}
            totalRows={totalRows}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            manualPagination
            manualSorting
            placeholder={{
              children: t('common.tableIsEmpty'),
            }}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
