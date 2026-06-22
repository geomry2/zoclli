import { TASK_TOPICS, TaskStatus, TaskTopic } from '../models/task.model';

const TASK_TOPIC_TAG_PREFIX = 'topic:';
const CHECKLIST_TASK_PATTERN = /^\s*[-*]\s*\[(x|\s)\]\s+(.+?)\s*$/i;

export interface ImportedTaskDraft {
  title: string;
  status: TaskStatus;
  topic: TaskTopic;
  assignee: string;
}

export interface SplitTaskTitleResult {
  title: string;
  body: string;
}

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

export function normalizeTaskTopic(value: unknown, fallback: TaskTopic = 'office'): TaskTopic {
  const normalized = String(value ?? '').trim().toLowerCase();
  return TASK_TOPICS.find(topic => topic === normalized) ?? fallback;
}

export function extractTaskTopic(tags: readonly string[]): TaskTopic | null {
  const topicTag = tags.find(tag => tag.trim().toLowerCase().startsWith(TASK_TOPIC_TAG_PREFIX));
  if (!topicTag) return null;

  const rawTopic = topicTag.trim().slice(TASK_TOPIC_TAG_PREFIX.length);
  return normalizeTaskTopic(rawTopic);
}

export function stripTaskMetaTags(tags: readonly string[]): string[] {
  return tags
    .map(tag => String(tag).trim())
    .filter(tag => tag && !tag.toLowerCase().startsWith(TASK_TOPIC_TAG_PREFIX));
}

export function serializeTaskTags(tags: readonly string[], topic: TaskTopic): string[] {
  return [`${TASK_TOPIC_TAG_PREFIX}${normalizeTaskTopic(topic)}`, ...stripTaskMetaTags(tags)];
}

export function parseImportedTasks(input: string): ImportedTaskDraft[] {
  return String(input ?? '')
    .split(/\r?\n/)
    .map(line => parseImportedTaskLine(line))
    .filter((task): task is ImportedTaskDraft => task !== null);
}

function parseImportedTaskLine(line: string): ImportedTaskDraft | null {
  const match = line.match(CHECKLIST_TASK_PATTERN);
  if (!match) return null;

  const [, checked, rawText] = match;
  const { assignee, title } = splitImportedTaskAssignee(rawText);
  if (!title) return null;

  return {
    title,
    assignee,
    status: checked.toLowerCase() === 'x' ? 'done' : 'todo',
    topic: inferImportedTaskTopic(`${title} ${assignee}`),
  };
}

function splitImportedTaskAssignee(value: string): { assignee: string; title: string } {
  const normalized = value.trim();
  const separatorIndex = normalized.indexOf(':');
  if (separatorIndex <= 0) return { assignee: '', title: normalized };

  const candidate = normalized.slice(0, separatorIndex).trim();
  const title = normalized.slice(separatorIndex + 1).trim();
  if (!title || candidate.length > 80) return { assignee: '', title: normalized };

  return { assignee: candidate, title };
}

function inferImportedTaskTopic(value: string): TaskTopic {
  const text = value.toLowerCase();

  if (/(crm|код|code|bug|ошибк|сайт|automation|автоматизац)/i.test(text)) return 'it';
  if (/(agreement|contract|договор|документ|kpmg|таблиц|sheet|invoice|инвойс|платеж|payment|почт)/i.test(text)) return 'documents';
  if (/(client|клиент|owner|владел|арендатор|tenant|звон|call|связаться|отправить всем)/i.test(text)) return 'clients';

  return 'office';
}
