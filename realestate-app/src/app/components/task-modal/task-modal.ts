import { AfterViewInit, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TASK_TOPICS, Task, TaskCreateInput, TaskPriority, TaskRelatedEntityType, TaskSource, TaskStatus, TaskTopic } from '../../models/task.model';
import { TaskParserService } from '../../services/task-parser.service';
import { TaskService } from '../../services/task.service';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';
import { normalizeTaskTopic, toTaskInputDateTime } from '../../utils/task.utils';
import { FancyDateInput } from '../fancy-date-input/fancy-date-input';

interface TaskDraft {
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
  tagsInput: string;
}

interface TaskAssigneeOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe, FancyDateInput],
  templateUrl: './task-modal.html',
  styleUrl: './task-modal.scss'
})
export class TaskModal implements AfterViewInit {
  readonly editTask = input<Task | null>(null);
  readonly relationPrefill = input<{ type: TaskRelatedEntityType; id: string; sourceLabel?: string } | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  readonly commentInput = viewChild<ElementRef<HTMLTextAreaElement>>('commentInput');

  readonly ts = inject(TranslationService);
  private readonly taskParser = inject(TaskParserService);
  private readonly taskService = inject(TaskService);
  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);

  readonly draft = signal<TaskDraft>(this.defaultDraft());
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly freeformInput = signal('');
  readonly parsing = signal(false);
  readonly parserPreview = signal<TaskDraft | null>(null);

  readonly voiceSupported = typeof window !== 'undefined'
    && Boolean((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
  readonly isRecording = signal(false);
  readonly transcriptPreview = signal('');

  readonly statuses: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'waiting', 'done'];
  readonly priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  readonly topics = [...TASK_TOPICS];
  readonly sources: TaskSource[] = ['manual', 'voice', 'ai', 'automation'];
  readonly assigneeOptions = computed<TaskAssigneeOption[]>(() => {
    this.ts.lang();

    return [
      { value: 'Agis', label: this.ts.t('tasks.assignee.agis') },
      { value: 'Tanya', label: this.ts.t('tasks.assignee.tanya') },
      { value: 'Julia', label: this.ts.t('tasks.assignee.julia') },
      { value: 'George', label: this.ts.t('tasks.assignee.george') },
    ];
  });
  readonly customAssigneeOption = computed<TaskAssigneeOption | null>(() => {
    const value = this.draft().assignee.trim();
    if (!value) return null;

    const knownValues = new Set(this.assigneeOptions().map(option => option.value));
    if (knownValues.has(value)) return null;

    return { value, label: value };
  });
  readonly pendingDueTime = signal('09:00');
  readonly dueTimeOptions = Array.from({ length: 24 * 4 }, (_, index) => {
    const hour = Math.floor(index / 4);
    const minute = (index % 4) * 15;
    return `${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;
  });
  readonly dueDateValue = computed(() => this.extractDueDate(this.draft().dueAt));
  readonly dueTimeValue = computed(() => this.extractDueTime(this.draft().dueAt) || this.pendingDueTime());
  readonly taskKey = computed(() => {
    const existingId = this.editTask()?.id;
    if (existingId) return `TASK-${existingId.slice(0, 4).toUpperCase()}`;
    return this.ts.t('tasks.newIssueKey');
  });
  readonly taskInitial = computed(() => {
    const title = this.draft().title.trim();
    return (title[0] || 'T').toUpperCase();
  });
  readonly linkedContext = computed(() => {
    this.ts.lang();

    const draft = this.draft();
    if (!draft.relatedEntityType || !draft.relatedEntityId) return '';

    let entityLabel = draft.relatedEntityId;
    if (draft.relatedEntityType === 'lead') {
      entityLabel = this.leadService.leads().find(lead => lead.id === draft.relatedEntityId)?.name ?? entityLabel;
    } else if (draft.relatedEntityType === 'client') {
      entityLabel = this.clientService.clients().find(client => client.id === draft.relatedEntityId)?.name ?? entityLabel;
    }

    return this.ts.t('tasks.linkedTo', {
      type: this.ts.t(`tasks.related.${draft.relatedEntityType}`),
      label: entityLabel,
    });
  });

  constructor() {
    queueMicrotask(() => {
      this.pendingDueTime.set(this.extractDueTime(this.draft().dueAt) || '09:00');
    });

    queueMicrotask(() => {
      const editing = this.editTask();
      if (editing) {
        this.draft.set({
          title: editing.title,
          description: editing.description,
          status: editing.status,
          priority: editing.priority,
          topic: normalizeTaskTopic(editing.topic),
          dueAt: toTaskInputDateTime(editing.dueAt),
          assignee: editing.assignee,
          createdBy: editing.createdBy,
          relatedEntityType: editing.relatedEntityType,
          relatedEntityId: editing.relatedEntityId,
          source: editing.source,
          tagsInput: editing.tags.join(', '),
        });
        this.pendingDueTime.set(this.extractDueTime(toTaskInputDateTime(editing.dueAt)) || '09:00');
        return;
      }

      const prefill = this.relationPrefill();
      if (prefill) {
        this.draft.update(current => ({
          ...current,
          topic: prefill.type === 'lead' || prefill.type === 'client' ? 'clients' : current.topic,
          relatedEntityType: prefill.type,
          relatedEntityId: prefill.id,
          description: prefill.sourceLabel ? `${prefill.sourceLabel}\n` : current.description,
        }));
      }
    });
  }

  ngAfterViewInit() {
    queueMicrotask(() => {
      this.titleInput()?.nativeElement.focus({ preventScroll: true });
    });
  }

  close() {
    this.closed.emit();
  }

  focusTitle() {
    this.titleInput()?.nativeElement.focus({ preventScroll: true });
  }

  focusComment() {
    this.commentInput()?.nativeElement.focus({ preventScroll: false });
  }

  async submit() {
    const draft = this.draft();
    if (!draft.title.trim()) {
      this.error.set(this.ts.t('tasks.errorTitleRequired'));
      return;
    }

    this.error.set(null);
    this.saving.set(true);

    const payload: TaskCreateInput = {
      title: '',
      shortTitle: '',
      description: '',
      status: draft.status,
      priority: draft.priority,
      topic: draft.topic,
      dueAt: draft.dueAt,
      assignee: draft.assignee.trim(),
      createdBy: draft.createdBy.trim() || 'Current user',
      relatedEntityType: draft.relatedEntityType,
      relatedEntityId: draft.relatedEntityId.trim(),
      source: draft.source,
      tags: draft.tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
    };

    payload.title = draft.title.trim();
    payload.description = draft.description.trim();

    try {
      const editTask = this.editTask();
      const result = editTask
        ? await this.taskService.update({ ...editTask, ...payload, updatedAt: new Date().toISOString() })
        : await this.taskService.add(payload);

      if (result.error) {
        this.error.set(result.error);
        return;
      }

      this.saved.emit();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : this.ts.t('tasks.errorSaveFailed'));
    } finally {
      this.saving.set(false);
    }
  }

  async parseFreeform(source: TaskSource = 'ai') {
    const text = this.freeformInput().trim() || this.transcriptPreview().trim();
    if (!text) return;

    this.parsing.set(true);
    const parsed = await this.taskParser.parse({ text, source });
    this.parserPreview.set({
      ...this.defaultDraft(),
      ...parsed,
      dueAt: toTaskInputDateTime(parsed.dueAt),
      createdBy: 'Current user',
      tagsInput: parsed.tags.join(', '),
    });
    this.parsing.set(false);
  }

  applyParserPreview() {
    const preview = this.parserPreview();
    if (!preview) return;

    this.draft.set(preview);
    this.pendingDueTime.set(this.extractDueTime(preview.dueAt) || '09:00');
    this.parserPreview.set(null);
  }

  async startVoiceCapture() {
    const recognitionCtor = (window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

    if (!recognitionCtor) return;

    this.isRecording.set(true);
    this.transcriptPreview.set('');

    const recognition = new recognitionCtor();
    recognition.lang = this.ts.lang() === 'ru' ? 'ru-RU' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      this.transcriptPreview.set(transcript.trim());
      this.isRecording.set(false);
      await this.parseFreeform('voice');
    };

    recognition.onerror = () => {
      this.isRecording.set(false);
    };

    recognition.onend = () => {
      this.isRecording.set(false);
    };

    recognition.start();
  }

  formatDate(value: string | undefined): string {
    if (!value) return this.ts.t('tasks.none');

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString(this.ts.lang() === 'ru' ? 'ru-RU' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private defaultDraft(): TaskDraft {
    return {
      title: '',
      description: '',
      status: 'inbox',
      priority: 'medium',
      topic: 'office',
      dueAt: '',
      assignee: '',
      createdBy: 'Current user',
      relatedEntityType: null,
      relatedEntityId: '',
      source: 'manual',
      tagsInput: '',
    };
  }

  setDueDate(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      this.draft.update(current => ({ ...current, dueAt: '' }));
      return;
    }

    const time = this.extractDueTime(this.draft().dueAt) || this.pendingDueTime();
    this.draft.update(current => ({ ...current, dueAt: `${normalized}T${time}` }));
  }

  setDueTime(value: string) {
    const normalized = value.trim() || '09:00';
    this.pendingDueTime.set(normalized);

    const date = this.extractDueDate(this.draft().dueAt);
    if (!date) return;

    this.draft.update(current => ({ ...current, dueAt: `${date}T${normalized}` }));
  }

  private extractDueDate(value: string): string {
    const normalized = String(value ?? '').trim();
    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] ?? '';
  }

  private extractDueTime(value: string): string {
    const normalized = String(value ?? '').trim();
    const match = normalized.match(/T(\d{2}:\d{2})/);
    return match?.[1] ?? '';
  }
}
