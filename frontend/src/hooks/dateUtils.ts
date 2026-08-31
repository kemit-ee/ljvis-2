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
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
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

const ESTONIAN_CODE_CENTURY: Record<string, string> = {
  '1': '18', '2': '18',
  '3': '19', '4': '19',
  '5': '20', '6': '20',
  '7': '21', '8': '21',
};

/** Extracts the ISO birth date (YYYY-MM-DD) from an 11-digit Estonian personal code.
 *  Returns null if the code is not exactly 11 digits or the century digit is unrecognised. */
export function birthDateFromEstonianCode(code: string): string | null {
  if (!/^\d{11}$/.test(code)) return null;
  const century = ESTONIAN_CODE_CENTURY[code[0]];
  if (!century) return null;
  const year  = century + code.slice(1, 3);
  const month = code.slice(3, 5);
  const day   = code.slice(5, 7);
  return `${year}-${month}-${day}`;
}

export function toIsoTime(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}:00`;
  }
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
