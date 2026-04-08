import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ClientService } from './client.service';
import { LeadService } from './lead.service';
import { TaskParserInput, ParsedTaskDraft, TaskPriority, TaskRelatedEntityType, TaskTopic } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskParserService {
  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);

  async parse(input: TaskParserInput): Promise<ParsedTaskDraft> {
    const text = input.text.trim();
    if (!text) {
      return this.emptyDraft(input.source);
    }

    const heuristic = this.heuristicParse(text);
    const remote = await this.tryRemoteParse(input);
    if (remote) return this.normalizeDraft(this.mergeDrafts(heuristic, remote), input.source);

    return this.normalizeDraft(heuristic, input.source);
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
      topic: this.inferTopic(text, related?.type ?? null),
      assignee: this.inferAssignee(text),
      relatedEntityType: related?.type ?? null,
      relatedEntityId: related?.id ?? '',
      tags: this.inferTags(text),
      status: 'inbox',
      source: 'ai',
    };
  }

  private mergeDrafts(base: Partial<ParsedTaskDraft>, incoming: Partial<ParsedTaskDraft>): Partial<ParsedTaskDraft> {
    const merged: Partial<ParsedTaskDraft> = { ...base };
    const mergedRecord = merged as Record<keyof ParsedTaskDraft, ParsedTaskDraft[keyof ParsedTaskDraft] | undefined>;

    for (const [key, value] of Object.entries(incoming) as Array<[keyof ParsedTaskDraft, ParsedTaskDraft[keyof ParsedTaskDraft]]>) {
      if (typeof value === 'string') {
        if (value.trim()) {
          mergedRecord[key] = value;
        }
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          mergedRecord[key] = value;
        }
        continue;
      }

      if (value !== null && value !== undefined) {
        mergedRecord[key] = value;
      }
    }

    return merged;
  }

  private normalizeDraft(draft: Partial<ParsedTaskDraft>, source: 'manual' | 'voice' | 'ai' | 'automation'): ParsedTaskDraft {
    return {
      title: String(draft.title ?? '').trim() || 'Follow up',
      description: String(draft.description ?? '').trim(),
      dueAt: String(draft.dueAt ?? '').trim(),
      priority: this.normalizePriority(draft.priority),
      topic: this.normalizeTopic(draft.topic),
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
      topic: 'office',
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

  private normalizeTopic(topic: unknown): TaskTopic {
    return topic === 'office' || topic === 'clients' || topic === 'documents' || topic === 'it'
      ? topic
      : 'office';
  }

  private inferDueAt(text: string): string {
    const lower = text.toLowerCase();
    const now = new Date();
    const timeOfDay = this.inferTimeOfDay(lower);

    const dateMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) {
      return this.withOptionalTime(dateMatch[1], timeOfDay);
    }

    const weekday = this.matchWeekday(lower);
    const referencesNextWeek = /(?:next week|следующ(?:ая|ей)\s+недел(?:я|е))/u.test(lower);

    if (referencesNextWeek && weekday) {
      return this.withOptionalTime(this.nextCalendarWeekWeekdayDate(weekday), timeOfDay);
    }

    if (/(?:^|[^\p{L}])(day after tomorrow|послезавтра)(?=$|[^\p{L}])/u.test(lower)) {
      const date = new Date(now);
      date.setDate(date.getDate() + 2);
      return this.withOptionalTime(this.toDateInput(date), timeOfDay);
    }

    if (/(?:^|[^\p{L}])(tomorrow|завтра)(?=$|[^\p{L}])/u.test(lower)) {
      const date = new Date(now);
      date.setDate(date.getDate() + 1);
      return this.withOptionalTime(this.toDateInput(date), timeOfDay);
    }

    if (/(?:^|[^\p{L}])(today|сегодня)(?=$|[^\p{L}])/u.test(lower)) {
      return this.withOptionalTime(this.toDateInput(now), timeOfDay);
    }

    if (/(?:end of (?:the )?week|by end of (?:the )?week|к концу недели|до конца недели)/u.test(lower)) {
      return this.withOptionalTime(this.endOfWeekDate(), timeOfDay ?? '18:00');
    }

    if (weekday) {
      return this.withOptionalTime(this.nextWeekdayDate(weekday), timeOfDay);
    }

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

  private inferTopic(text: string, relatedEntityType: TaskRelatedEntityType | null): TaskTopic {
    if (relatedEntityType === 'lead' || relatedEntityType === 'client') return 'clients';

    const lower = text.toLowerCase();
    if (/(contract|document|passport|invoice|agreement|scan|pdf|doc)/.test(lower)) return 'documents';
    if (/(website|site|bug|crm|it|tech|server|domain|email|render|integration|login)/.test(lower)) return 'it';
    return 'office';
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

  private nextCalendarWeekWeekdayDate(name: string): string {
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
    const startOfCurrentWeek = new Date(now);
    const day = startOfCurrentWeek.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + diffToMonday);

    const startOfNextWeek = new Date(startOfCurrentWeek);
    startOfNextWeek.setDate(startOfCurrentWeek.getDate() + 7);

    const target = map[name];
    const deltaFromMonday = target === 0 ? 6 : target - 1;
    startOfNextWeek.setDate(startOfNextWeek.getDate() + deltaFromMonday);
    return this.toDateInput(startOfNextWeek);
  }

  private endOfWeekDate(): string {
    const now = new Date();
    const friday = new Date(now);
    let delta = 5 - friday.getDay();
    if (delta < 0) delta += 7;
    friday.setDate(friday.getDate() + delta);
    return this.toDateInput(friday);
  }

  private matchWeekday(text: string): string | null {
    const weekdayPatterns: Array<{ name: string; pattern: RegExp }> = [
      { name: 'monday', pattern: /(?:^|[^\p{L}])(monday|понедельник(?:а|у|ом)?)(?=$|[^\p{L}])/u },
      { name: 'tuesday', pattern: /(?:^|[^\p{L}])(tuesday|вторник(?:а|у|ом)?)(?=$|[^\p{L}])/u },
      { name: 'wednesday', pattern: /(?:^|[^\p{L}])(wednesday|сред(?:а|у|ы|е))(?=$|[^\p{L}])/u },
      { name: 'thursday', pattern: /(?:^|[^\p{L}])(thursday|четверг(?:а|у|ом)?)(?=$|[^\p{L}])/u },
      { name: 'friday', pattern: /(?:^|[^\p{L}])(friday|пятниц(?:а|у|ы|е))(?=$|[^\p{L}])/u },
      { name: 'saturday', pattern: /(?:^|[^\p{L}])(saturday|суббот(?:а|у|ы|е))(?=$|[^\p{L}])/u },
      { name: 'sunday', pattern: /(?:^|[^\p{L}])(sunday|воскресень(?:е|я|ю|ем))(?=$|[^\p{L}])/u },
    ];

    return weekdayPatterns.find(({ pattern }) => pattern.test(text))?.name ?? null;
  }

  private inferTimeOfDay(text: string): string | null {
    if (/(?:morning|утром)/u.test(text)) return '09:00';
    if (/(?:afternoon|дн[её]м|после обеда)/u.test(text)) return '14:00';
    if (/(?:evening|вечером|к вечеру)/u.test(text)) return '18:00';
    if (/(?:night|ночью)/u.test(text)) return '21:00';
    return null;
  }

  private withOptionalTime(date: string, time: string | null): string {
    return time ? `${date}T${time}` : date;
  }

  private toDateInput(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
