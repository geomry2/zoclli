export type TaskStatus = 'inbox' | 'todo' | 'in_progress' | 'waiting' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRelatedEntityType = 'lead' | 'client' | 'property' | 'deal';
export type TaskSource = 'manual' | 'voice' | 'ai' | 'automation';
export const TASK_TOPICS = ['office', 'clients', 'documents', 'it'] as const;
export type TaskTopic = typeof TASK_TOPICS[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  topic: TaskTopic;
  dueAt: string;
  assignee: string;
  createdBy: string;
  relatedEntityType: TaskRelatedEntityType | null;
  relatedEntityId: string;
  source: TaskSource;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type TaskCreateInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export interface ParsedTaskDraft {
  title: string;
  description: string;
  dueAt: string;
  priority: TaskPriority;
  topic: TaskTopic;
  assignee: string;
  relatedEntityType: TaskRelatedEntityType | null;
  relatedEntityId: string;
  tags: string[];
  status: TaskStatus;
  source: TaskSource;
}

export interface TaskParserInput {
  text: string;
  source: TaskSource;
}
