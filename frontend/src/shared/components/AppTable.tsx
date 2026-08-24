import { useTranslation } from 'react-i18next';
import { Table } from '@tedi-design-system/react/community';
import type { DefaultTData, TableProps } from '@tedi-design-system/react/community';

/**
 * Thin wrapper over tedi's community `<Table>` that bakes in the app-wide conventions
 * every server-paginated list table needs: the `ljvis-table` cell styling class and the
 * empty-state placeholder text. Without this wrapper, `ljvis-table` has repeatedly been
 * forgotten on new list pages (it was missing from 3 of 4 ERRU lists at one point).
 * `manualPagination`/`manualSorting` are left as explicit props since not every table is
 * server-paginated.
 */
export function AppTable<TData extends DefaultTData<TData>>({
  className,
  placeholder,
  ...props
}: TableProps<TData>) {
  const { t } = useTranslation();
  return (
    <Table
      className={className ? `ljvis-table ${className}` : 'ljvis-table'}
      placeholder={placeholder ?? { children: t('common.tableIsEmpty') }}
      {...props}
    />
  );
}
