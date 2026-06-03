export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parts = value.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return value;
}

export function toIsoDate(value: unknown): string {
  if (!value) return '';
  if (
    typeof value === 'object' &&
    value !== null &&
    '$isDayjsObject' in value
  ) {
    return (value as unknown as { format: (fmt: string) => string }).format(
      'YYYY-MM-DD',
    );
  }
  return String(value);
}
