export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parts = value.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return value;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
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

export function toIsoTime(value: unknown): string {
  if (!value) return '';
  if (
    typeof value === 'object' &&
    value !== null &&
    '$isDayjsObject' in value
  ) {
    const hours = (value as unknown as { hour: () => number }).hour();
    const minutes = (value as unknown as { minute: () => number }).minute();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  }
  return String(value);
}
