import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ClientService } from './client.service';
import { LeadService } from './lead.service';
import { TaskParserInput, ParsedTaskDraft, TaskPriority } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskParserService {
  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);

  async parse(input: TaskParserInput): Promise<ParsedTaskDraft> {
    const text = input.text.trim();
    if (!text) {
      return this.emptyDraft(input.source);
    }

    const remote = await this.tryRemoteParse(input);
    if (remote) return this.normalizeDraft(remote, input.source);

    return this.normalizeDraft(this.heuristicParse(text), input.source);
  }

  private async tryRemoteParse(input: TaskParserInput): Promise<Partial<ParsedTaskDraft> | null> {
    const url = environment.taskParserUrl?.trim();
    if (!url) return null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.text }),
      });

      if (!response.ok) return null;
      return await response.json() as Partial<ParsedTaskDraft>;
    } catch {
      return null;
    }
  }

  private heuristicParse(text: string): Partial<ParsedTaskDraft> {
    const related = this.resolveEntity(text);
    return {
      title: this.inferTitle(text),
      description: text,
      dueAt: this.inferDueAt(text),
      priority: this.inferPriority(text),
      assignee: this.inferAssignee(text),
      relatedEntityType: related?.type ?? null,
      relatedEntityId: related?.id ?? '',
      tags: this.inferTags(text),
      status: 'inbox',
      source: 'ai',
    };
  }

  private normalizeDraft(draft: Partial<ParsedTaskDraft>, source: 'manual' | 'voice' | 'ai' | 'automation'): ParsedTaskDraft {
    return {
      title: String(draft.title ?? '').trim() || 'Follow up',
      description: String(draft.description ?? '').trim(),
      dueAt: String(draft.dueAt ?? '').trim(),
      priority: this.normalizePriority(draft.priority),
      assignee: String(draft.assignee ?? '').trim(),
      relatedEntityType: draft.relatedEntityType ?? null,
      relatedEntityId: String(draft.relatedEntityId ?? '').trim(),
      tags: Array.isArray(draft.tags) ? draft.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
      status: draft.status ?? 'inbox',
      source,
    };
  }

  private emptyDraft(source: 'manual' | 'voice' | 'ai' | 'automation'): ParsedTaskDraft {
    return {
      title: '',
      description: '',
      dueAt: '',
      priority: 'medium',
      assignee: '',
      relatedEntityType: null,
      relatedEntityId: '',
      tags: [],
      status: 'inbox',
      source,
    };
  }

  private inferTitle(text: string): string {
    const compact = text.replace(/\s+/g, ' ').trim();
    const split = compact.split(/[,.]/)[0] ?? compact;
    return split.length > 90 ? `${split.slice(0, 87)}…` : split;
  }

  private inferPriority(text: string): TaskPriority {
    const lower = text.toLowerCase();
    if (/(urgent|asap|immediately|today)/.test(lower)) return 'urgent';
    if (/(high priority|important|critical)/.test(lower)) return 'high';
    if (/(low priority|whenever|someday)/.test(lower)) return 'low';
    return 'medium';
  }

  private normalizePriority(priority: unknown): TaskPriority {
    return priority === 'low' || priority === 'medium' || priority === 'high' || priority === 'urgent'
      ? priority
      : 'medium';
  }

  private inferDueAt(text: string): string {
    const lower = text.toLowerCase();
    const now = new Date();

    if (lower.includes('tomorrow')) {
      const date = new Date(now);
      date.setDate(date.getDate() + 1);
      return this.toDateInput(date);
    }

    if (lower.includes('today')) {
      return this.toDateInput(now);
    }

    const weekdayMatch = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (weekdayMatch) {
      return this.nextWeekdayDate(weekdayMatch[1]);
    }

    const dateMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) return dateMatch[1];

    return '';
  }

  private inferAssignee(text: string): string {
    const match = text.match(/(?:assign to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    return match?.[1] ?? '';
  }

  private inferTags(text: string): string[] {
    const tags = new Set<string>();
    const lower = text.toLowerCase();
    if (lower.includes('call')) tags.add('call');
    if (lower.includes('email') || lower.includes('send')) tags.add('follow-up');
    if (lower.includes('contract')) tags.add('contract');
    if (lower.includes('render')) tags.add('design');
    return [...tags];
  }

  private resolveEntity(text: string): { type: 'lead' | 'client'; id: string } | null {
    const lower = text.toLowerCase();

    const client = this.clientService.clients().find(entry => lower.includes(entry.name.toLowerCase()));
    if (client) return { type: 'client', id: client.id };

    const lead = this.leadService.leads().find(entry => lower.includes(entry.name.toLowerCase()));
    if (lead) return { type: 'lead', id: lead.id };

    return null;
  }

  private nextWeekdayDate(name: string): string {
    const map: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const now = new Date();
    const target = map[name];
    let delta = target - now.getDay();
    if (delta <= 0) delta += 7;

    const next = new Date(now);
    next.setDate(now.getDate() + delta);
    return this.toDateInput(next);
  }

  private toDateInput(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
