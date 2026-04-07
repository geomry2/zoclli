import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ActivityService } from './activity.service';
import { toCamelCase, toSnakeCase } from './case.utils';
import { Task, TaskCreateInput, TaskRelatedEntityType } from '../models/task.model';
import { extractTaskTopic, serializeTaskTags, stripTaskMetaTags, toTaskInputDateTime, toTaskStorageDateTime } from '../utils/task.utils';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly activity = inject(ActivityService);

  readonly tasks = signal<Task[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  private async load() {
    if (!this.supabase) { this.error.set('Supabase not configured.'); return; }
    this.loading.set(true);

    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        this.error.set(error.message);
      } else {
        this.error.set(null);
        this.tasks.set((data ?? []).map(row => this.hydrateTask(row)));
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load tasks.');
    } finally {
      this.loading.set(false);
    }
  }

  async add(task: TaskCreateInput): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };

    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .insert(this.serializeTask(task))
        .select()
        .maybeSingle();

      if (error) return { error: error.message };
      if (!data) return { error: 'Create blocked — missing INSERT policy in Supabase RLS.' };

      this.tasks.update(list => [this.hydrateTask(data), ...list]);
      this.activity.log('created', 'task', task.title);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to create task.' };
    }
  }

  async update(task: Task): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };

    try {
      const { id, createdAt, updatedAt, ...rest } = task;
      const { data, error } = await this.supabase
        .from('tasks')
        .update({
          ...this.serializeTask(rest as TaskCreateInput),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) return { error: error.message };
      if (!data) return { error: 'Update blocked — missing UPDATE policy in Supabase RLS.' };

      const hydrated = this.hydrateTask(data);
      this.tasks.update(list => [hydrated, ...list.filter(entry => entry.id !== id)]);
      this.activity.log('updated', 'task', task.title);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to update task.' };
    }
  }

  async remove(id: string): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };

    try {
      const title = this.tasks().find(task => task.id === id)?.title ?? id;
      const { error, count } = await this.supabase.from('tasks').delete({ count: 'exact' }).eq('id', id);

      if (error) return { error: error.message };
      if (count === 0) return { error: 'Delete blocked — missing DELETE policy in Supabase RLS.' };

      this.tasks.update(list => list.filter(task => task.id !== id));
      this.activity.log('deleted', 'task', title);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to delete task.' };
    }
  }

  relatedTasks(entityType: TaskRelatedEntityType, entityId: string): Task[] {
    const cleanId = entityId.trim();
    if (!cleanId) return [];

    return this.tasks().filter(task =>
      task.relatedEntityType === entityType
      && task.relatedEntityId.trim().toLowerCase() === cleanId.toLowerCase()
    );
  }

  private hydrateTask(row: Record<string, unknown>): Task {
    const task = toCamelCase(row) as unknown as Task;
    const rawTags = Array.isArray(task.tags) ? task.tags.map(tag => String(tag)) : [];
    const topic = extractTaskTopic(rawTags) ?? 'office';
    return {
      ...task,
      title: String(task.title ?? ''),
      topic,
      tags: stripTaskMetaTags(rawTags),
      description: String(task.description ?? ''),
      assignee: String(task.assignee ?? ''),
      createdBy: String(task.createdBy ?? ''),
      relatedEntityId: String(task.relatedEntityId ?? ''),
      dueAt: toTaskInputDateTime(String(task.dueAt ?? '')),
    };
  }

  private serializeTask(task: TaskCreateInput): Record<string, unknown> {
    return toSnakeCase({
      ...task,
      title: task.title.trim(),
      description: task.description.trim(),
      dueAt: toTaskStorageDateTime(task.dueAt),
      assignee: task.assignee.trim(),
      createdBy: task.createdBy.trim(),
      relatedEntityId: task.relatedEntityId.trim(),
      tags: serializeTaskTags(task.tags, task.topic),
    } as unknown as Record<string, unknown>);
  }
}
