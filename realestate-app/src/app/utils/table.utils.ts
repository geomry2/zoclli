export type SortDirection = 'asc' | 'desc';

export interface SortState<TKey extends string> {
  key: TKey;
  direction: SortDirection;
}

export interface DateRangeFilter {
  from: string;
  to: string;
}

export interface NumberRangeFilter {
  min: string;
  max: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toggleSelection<T>(current: readonly T[], value: T): T[] {
  return current.includes(value)
    ? current.filter(item => item !== value)
    : [...current, value];
}

export function uniqueValues(values: readonly string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

export function nextSortState<TKey extends string>(
  current: SortState<TKey>,
  key: TKey,
): SortState<TKey> {
  if (current.key !== key) {
    return { key, direction: 'asc' };
  }

  return {
    key,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
}

export function matchesDateRange(value: string | null | undefined, range: DateRangeFilter): boolean {
  const normalizedValue = normalizeDate(value);
  const from = normalizeDate(range.from);
  const to = normalizeDate(range.to);

  if (!from && !to) return true;
  if (!normalizedValue) return false;
  if (from && normalizedValue < from) return false;
  if (to && normalizedValue > to) return false;
  return true;
}

export function matchesNumberRange(value: number | null | undefined, range: NumberRangeFilter): boolean {
  const min = parseNumber(range.min);
  const max = parseNumber(range.max);

  if (min === null && max === null) return true;
  if (value === null || value === undefined || Number.isNaN(value)) return false;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

export function compareValues(left: unknown, right: unknown): number {
  if (isEmptyValue(left) && isEmptyValue(right)) return 0;
  if (isEmptyValue(left)) return 1;
  if (isEmptyValue(right)) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  const leftDate = normalizeDate(left);
  const rightDate = normalizeDate(right);
  if (leftDate && rightDate) {
    return leftDate.localeCompare(rightDate);
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoDate = trimmed.slice(0, 10);
  if (ISO_DATE_RE.test(isoDate)) return isoDate;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
