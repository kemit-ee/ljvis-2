import { Button, Checkbox, Dropdown, useTableContext } from '@tedi-design-system/react/tedi';

/**
 * Column picker for AppTable. Same look and behaviour as TEDI's `Table.ColumnsMenu`
 * ("Kohanda" dropdown with a checkbox per column), but the label comes from `meta.label`
 * first — AppTable turns sortable headers into buttons, and TEDI's own menu would then fall
 * back to the raw column id. Columns with `enableHiding: false` are not listed (always shown).
 */
export function AppColumnsMenu({ label }: { label: string }) {
  const { table, id } = useTableContext();
  const columns = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const visibleCount = columns.filter((c) => c.getIsVisible()).length;

  const labelOf = (c: (typeof columns)[number]) => {
    const meta = c.columnDef.meta as { label?: string } | undefined;
    const header = c.columnDef.header;
    return meta?.label ?? (typeof header === 'string' ? header : c.id);
  };

  if (columns.length === 0) return null;

  return (
    <Dropdown placement="bottom-end">
      <Dropdown.Trigger>
        <Button type="button" visualType="neutral" iconLeft="tune">
          {label}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        {columns.map((c) => {
          const checked = c.getIsVisible();
          const inputId = `${id}-columns-menu-${c.id}`;
          return (
            <Dropdown.Item key={c.id} asChild closeOnSelect={false}>
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  id={inputId}
                  name={inputId}
                  label={labelOf(c)}
                  value={c.id}
                  checked={checked}
                  disabled={checked && visibleCount === 1}
                  onChange={() => c.toggleVisibility()}
                />
              </div>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Content>
    </Dropdown>
  );
}

