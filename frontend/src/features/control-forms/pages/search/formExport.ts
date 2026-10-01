import type { FormSearchExportRow } from '../../types';

export type ExportCell = string | number | boolean;

export interface ExportTable {
  headers: string[];
  rows: ExportCell[][];
}

/** Excel'i lahtri tähemärgipiir. */
const MAX_CELL_LENGTH = 32767;

const cellOf = (value: unknown): ExportCell => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_CELL_LENGTH ? text.slice(0, MAX_CELL_LENGTH) : text;
};

/**
 * Üks rida vormi kohta, üks veerg andmevälja kohta. Veergude järjekord on
 * esmakordse esinemise järgi, nii et vana ja uus versioon sama tabeli ridu ei sega.
 * Pesastatud väärtused (rikkumised, juhid jms) pannakse lahtrisse JSON-tekstina.
 */
export function buildExportTable(rows: FormSearchExportRow[]): ExportTable {
  const records = rows.map((r) => JSON.parse(r.data) as Record<string, unknown>);
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const rec of records) {
    for (const key of Object.keys(rec)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }
  return {
    headers,
    rows: records.map((rec) => headers.map((h) => cellOf(rec[h]))),
  };
}

/** CSV-s ei tohi tekst alata valemi märgiga (CSV-/valemisüst Excelis). */
const csvSafe = (cell: ExportCell): string => {
  const text = String(cell);
  return typeof cell === 'string' && /^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))
    ? `'${text}`
    : text;
};

export function toCsv(table: ExportTable): string {
  const escape = (cell: ExportCell) => {
    const text = csvSafe(cell);
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [table.headers, ...table.rows]
    .map((row) => row.map(escape).join(';'))
    .join('\r\n');
}

export function exportFilename(formType: string, ext: 'xlsx' | 'csv'): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `vormid_${formType}_${stamp}.${ext}`;
}

const saveBlob = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export function downloadCsv(table: ExportTable, filename: string) {
  saveBlob(
    new Blob(['﻿' + toCsv(table)], { type: 'text/csv;charset=utf-8;' }),
    filename,
  );
}

export async function downloadXlsx(table: ExportTable, filename: string) {
  // exceljs on suur — laaditakse alles allalaadimisel
  const { Workbook } = await import('exceljs');
  const wb = new Workbook();
  const ws = wb.addWorksheet('Vormid');
  ws.addRow(table.headers).font = { bold: true };
  table.rows.forEach((r) => ws.addRow(r));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await wb.xlsx.writeBuffer();
  saveBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  );
}
