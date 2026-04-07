import { TASK_TOPICS, TaskTopic } from '../models/task.model';

const TASK_TOPIC_TAG_PREFIX = 'topic:';

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
