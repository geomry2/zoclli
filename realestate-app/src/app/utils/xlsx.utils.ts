import * as XLSX from 'xlsx';
import { normalizeRecordForExport } from './record.utils';

export function exportToXlsx(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;

  const filtered = rows.map(row => normalizeRecordForExport(row));
  const ws = XLSX.utils.json_to_sheet(filtered);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
}
