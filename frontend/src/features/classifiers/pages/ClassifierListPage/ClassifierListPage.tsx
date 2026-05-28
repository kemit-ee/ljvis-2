import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import { Card, Heading, Search, Text} from '@tedi-design-system/react/tedi';
import type { Classifier } from '../../types';
import { useClassifierList } from '../../hooks';
import { useAuth } from '../../../auth/AuthContext';
import './ClassifierListPage.module.css';

const columnHelper = createColumnHelper<Classifier>();

export function ClassifierListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const forbidden = !hasPermission('classifier.list');

  const {
    data, totalRows, isLoading,
    pagination, setPagination,
    sorting, setSorting,
    searchInput, setSearchInput, handleSearch, clearSearch
  } = useClassifierList();

  const handleRowClick = useCallback(
    (row: Classifier) => {
      navigate(`/classifiers/${row.id}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('code', {
        header: t('classifiers.code'),
        cell: (info) => {
          return info.getValue();
        },
      }),
      columnHelper.accessor('name', {
          header: t('classifiers.name'),
          cell: (info) => {
              return info.getValue();
          },
      }),
      columnHelper.accessor('description', {
        header: t('classifiers.description'),
        cell: (info) => {
          return info.getValue() || '—';
        },
      }),
      columnHelper.display({
          id: 'viewDetails',
          header: '',
          cell: (info) => {
              return (
                  <div className="cell-center">
                      <a
                          href={`/classifiers/${info.row.original.id}`}
                          onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRowClick(info.row.original);
                          }}
                          className="table-link"
                      >
                          {t('classifiers.viewDetails')}
                      </a>
                  </div>
              );
          },
      })
    ],
    [t, handleRowClick],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
        <Card className="mt-05">
            <Card.Content>
                <div className="card-main">
                    <Heading element="h1">{t('classifiers.title')}</Heading>
                </div>
                <div className="grid-2col">
                    <div className="search-wrapper">
                        <Search
                            id="classifier-search"
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
                    id="classifiers-table"
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
                        children: t('common.tableIsEmpty')
                    }}
                />
            </Card.Content>
        </Card>
    </div>
  );
}
