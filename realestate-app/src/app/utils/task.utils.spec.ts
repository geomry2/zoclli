import { extractTaskTopic, normalizeTaskTopic, parseImportedTasks, serializeTaskTags, stripTaskMetaTags, toTaskInputDateTime, toTaskStorageDateTime } from './task.utils';

function formatLocalDateTime(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

describe('task utils', () => {
  it('keeps task form due dates compatible with datetime-local inputs', () => {
    expect(toTaskInputDateTime('2026-04-10')).toBe('2026-04-10T09:00');
    expect(toTaskInputDateTime('2026-04-10T14:30')).toBe('2026-04-10T14:30');

    const isoValue = '2026-04-10T11:45:00.000Z';
    expect(toTaskInputDateTime(isoValue)).toBe(formatLocalDateTime(new Date(isoValue)));
  });

  it('serializes blank due dates as null so Supabase timestamptz inserts do not fail', () => {
    expect(toTaskStorageDateTime('')).toBeNull();
    expect(toTaskStorageDateTime('not-a-date')).toBeNull();

    const localValue = '2026-04-10T14:30';
    expect(toTaskStorageDateTime(localValue)).toBe(new Date(localValue).toISOString());
  });

  it('keeps task topics in tags without leaking meta tags into the UI', () => {
    expect(normalizeTaskTopic('clients')).toBe('clients');
    expect(normalizeTaskTopic('unknown')).toBe('office');

    const serialized = serializeTaskTags(['follow-up', 'topic:old', ' contract '], 'documents');
    expect(serialized).toEqual(['topic:documents', 'follow-up', 'contract']);
    expect(extractTaskTopic(serialized)).toBe('documents');
    expect(stripTaskMetaTags(serialized)).toEqual(['follow-up', 'contract']);
  });

  it('parses markdown checklist imports into task drafts', () => {
    const imported = parseImportedTasks(`
- [x]  Отправить фото счётчиков воды и электричества в папку на Google Drive
- [ ]  Tatiana Zortive: отправить коммунальные платежи всем клиентам с корпоративной почты
- [x]  George Mryasov: проверить и при необходимости загрузить таблицы в KPMG
- [ ]  George Mryasov: исправить ошибку в коде CRM
not a task
`);

    expect(imported).toEqual([
      {
        title: 'Отправить фото счётчиков воды и электричества в папку на Google Drive',
        assignee: '',
        status: 'done',
        topic: 'office',
      },
      {
        title: 'отправить коммунальные платежи всем клиентам с корпоративной почты',
        assignee: 'Tatiana Zortive',
        status: 'todo',
        topic: 'documents',
      },
      {
        title: 'проверить и при необходимости загрузить таблицы в KPMG',
        assignee: 'George Mryasov',
        status: 'done',
        topic: 'documents',
      },
      {
        title: 'исправить ошибку в коде CRM',
        assignee: 'George Mryasov',
        status: 'todo',
        topic: 'it',
      },
    ]);
  });
});
