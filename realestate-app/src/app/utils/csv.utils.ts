import { flattenValue, normalizeRecordForExport } from './record.utils';

export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;

  const normalizedRows = rows.map(row => normalizeRecordForExport(row));
  const headers = Object.keys(normalizedRows[0]);
  const escape = (val: unknown): string => {
    const s = String(val ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };

  const lines = [
    headers.join(','),
    ...normalizedRows.map(row => headers.map(h => escape(row[h])).join(','))
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function applySearch<T extends Record<string, unknown>>(items: T[], query: string): T[] {
  const q = query.toLowerCase().trim();
  if (!q) return items;
  const words = q.split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const haystack = Object.values(item).map(v => flattenValue(v)).join(' ').toLowerCase();
    return words.every(w => haystack.includes(w));
  });
}
