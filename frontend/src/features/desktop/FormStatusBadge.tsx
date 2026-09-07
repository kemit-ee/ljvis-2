import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@tedi-design-system/react/tedi';
import type { StatusBadgeColor, StatusBadgeVariant } from '@tedi-design-system/react/tedi';

// LJVIS2-37 mock: "Salvestatud" is a light-green filled+bordered badge,
// "Kinnitatud" light-blue filled+bordered, "Avalikustatud" a plain grey
// outline (no fill) and "Kustutatud" plain danger.
const STATUS_COLOR: Record<string, StatusBadgeColor> = {
  saved: 'success',
  confirmed: 'brand',
  published: 'neutral',
  deleted: 'danger',
};
const STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  saved: 'filled-bordered',
  confirmed: 'filled-bordered',
  published: 'bordered',
  deleted: 'filled-bordered',
};

interface FormStatusBadgeProps {
  status: string;
  /**
   * LJVIS2-37 AC (row 120): overdue kiirmenetlus/üldmenetlus deadlines force
   * the badge into the red "error" look regardless of the underlying status
   * (mock: a red-bordered "Salvestatud" badge with an error icon).
   */
  overdue?: boolean;
}

export function FormStatusBadge({ status, overdue }: FormStatusBadgeProps) {
  const { t } = useTranslation();
  const label = t(`dashboard.status.${status}`, status);
  if (overdue) {
    return (
      <StatusBadge color="danger" variant="filled-bordered" icon="error">
        {label}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge color={STATUS_COLOR[status] ?? 'neutral'} variant={STATUS_VARIANT[status] ?? 'bordered'}>
      {label}
    </StatusBadge>
  );
}
