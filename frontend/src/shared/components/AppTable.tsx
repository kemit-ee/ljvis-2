import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from '@tedi-design-system/react/tedi';
import type { PaginationState, SortingState, ColumnDef } from '@tanstack/react-table';

export interface AppTableProps<TData> {
  id: string;
  data: TData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  className?: string;
  /** Show every row, no pager. */
  hidePagination?: boolean;
  isLoading?: boolean;
  /** Total rows on the server — needed with manualPagination for the pager. */
  totalRows?: number;
  pagination?: PaginationState;
  onPaginationChange?: (state: PaginationState) => void;
  sorting?: SortingState;
  onSortingChange?: (state: SortingState) => void;
  manualPagination?: boolean;
  manualSorting?: boolean;
  /** TEDI row height: `small` = 41px, `medium` = 49px. */
  size?: 'small' | 'medium';
  getRowId?: (row: TData, index: number) => string;
  /** Empty-state content; defaults to the app-wide "no results" text. */
  placeholder?: ReactNode;
  /** Row click handler, receives the row's data. Makes rows keyboard-activatable buttons. */
  onRowClick?: (row: TData) => void;
  /** Drop the outer border (use inside an already bordered card). */
  borderless?: boolean;
  /** Expandable rows: which rows can expand, what they show, and whether all start open. */
  getRowCanExpand?: (row: TData) => boolean;
  renderSubComponent?: (row: TData, index: number) => ReactNode;
  defaultExpanded?: boolean;
  /** Extra class per row (e.g. to colour overdue rows). */
  rowClassName?: (row: TData) => string | undefined;
}

const sameState = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const sortIcon = (direction: false | 'asc' | 'desc') =>
  direction === 'asc' ? 'arrow_upward' : direction === 'desc' ? 'arrow_downward' : 'unfold_more';

/**
 * Wraps tedi's TEDI-Ready `<Table>` and bakes in the app-wide conventions every
 * server-paginated list table needs: the empty-state text, a loading state and the sortable
 * header button. Callers keep the props they had with the community `<Table>` (data/columns,
 * pagination/sorting state with manualPagination/manualSorting, totalRows, isLoading).
 *
 * A column is sortable when it sets `enableSorting: true` and has a plain-text header; the
 * header then becomes a TEDI `Table.HeaderButton`. `manualPagination`/`manualSorting` are
 * left as explicit props since not every table is server-paginated.
 */
export function AppTable<TData>({
  id,
  data,
  columns,
  className,
  hidePagination,
  isLoading,
  totalRows,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  manualPagination,
  manualSorting,
  size,
  getRowId,
  placeholder,
  onRowClick,
  borderless,
  getRowCanExpand,
  renderSubComponent,
  defaultExpanded,
  rowClassName,
}: AppTableProps<TData>) {
  const { t } = useTranslation();

  const tableColumns = useMemo(
    () =>
      columns.map((col) => {
        const label = col.header;
        if (col.enableSorting !== true || typeof label !== 'string') return col;
        return {
          ...col,
          header: ({ column }) => (
            <Table.HeaderButton
              icon={sortIcon(column.getIsSorted())}
              selected={!!column.getIsSorted()}
              onClick={column.getToggleSortingHandler()}
            >
              {label}
            </Table.HeaderButton>
          ),
        } as ColumnDef<TData, unknown>;
      }),
    [columns],
  );

  const pageSize = pagination?.pageSize ?? 10;
  const serverSide = manualPagination ?? !!pagination;

  return (
    <div aria-busy={isLoading || undefined} className={isLoading ? 'app-table--loading' : undefined}>
      {isLoading && data.length > 0 && (
        <span role="status" className="app-table__loading-text">
          {t('common.tableLoading')}
        </span>
      )}
      <Table<TData>
        id={id}
        className={className}
        size={size}
        data={data}
        columns={tableColumns as ColumnDef<TData>[]}
        getRowId={getRowId}
        borderless={borderless}
        onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
        getRowCanExpand={getRowCanExpand ? (row) => getRowCanExpand(row.original) : undefined}
        renderSubComponent={renderSubComponent ? (row) => renderSubComponent(row.original, row.index) : undefined}
        defaultState={defaultExpanded ? { expanded: true } : undefined}
        rowProps={rowClassName ? (row) => ({ className: rowClassName(row.original) }) : undefined}
        emptyState={isLoading ? t('common.tableLoading') : (placeholder ?? t('common.tableIsEmpty'))}
        emptyStateRole="status"
        pagination={hidePagination ? false : { pageSize, pageSizeOptions: PAGE_SIZE_OPTIONS }}
        manualPagination={serverSide}
        manualSorting={manualSorting ?? !!sorting}
        rowCount={serverSide ? totalRows : undefined}
        pageCount={serverSide && totalRows !== undefined ? Math.max(1, Math.ceil(totalRows / pageSize)) : undefined}
        state={{
          ...(pagination ? { pagination } : {}),
          ...(sorting ? { sorting } : {}),
        }}
        onStateChange={(next) => {
          // onStateChange carries the whole state; only forward the slice that really changed,
          // otherwise a page change would also re-fire onSortingChange (which callers use to reset the page).
          if (next.pagination && onPaginationChange && !sameState(next.pagination, pagination)) {
            onPaginationChange(next.pagination);
          }
          if (next.sorting && onSortingChange && !sameState(next.sorting, sorting)) {
            onSortingChange(next.sorting);
          }
        }}
      />
    </div>
  );
}
