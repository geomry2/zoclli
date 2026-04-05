export function flattenValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(item => flattenValue(item)).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    if (isTimelineNote(value)) {
      const date = typeof value.createdAt === 'string' && value.createdAt ? `[${value.createdAt.slice(0, 10)}] ` : '';
      return `${date}${value.body}`.trim();
    }

    return Object.values(value as Record<string, unknown>)
      .map(item => flattenValue(item))
      .filter(Boolean)
      .join(' ');
  }

  return String(value);
}

export function normalizeRecordForExport<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => key !== 'id')
      .map(([key, value]) => [key, normalizeExportValue(value)])
  );
}

function normalizeExportValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return flattenValue(value).trim();
  }

  return value;
}

function isTimelineNote(value: unknown): value is { body: string; createdAt?: string } {
  return typeof value === 'object'
    && value !== null
    && 'body' in value
    && typeof value.body === 'string';
}
