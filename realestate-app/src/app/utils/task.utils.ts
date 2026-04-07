function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function formatLocalDateTime(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function toTaskInputDateTime(value: string | null | undefined, fallbackTime = '09:00'): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T${fallbackTime}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';

  return formatLocalDateTime(parsed);
}

export function toTaskStorageDateTime(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}
