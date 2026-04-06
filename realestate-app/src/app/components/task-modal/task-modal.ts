import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Task, TaskCreateInput, TaskPriority, TaskRelatedEntityType, TaskSource, TaskStatus } from '../../models/task.model';
import { TaskParserService } from '../../services/task-parser.service';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';

interface TaskRelationOption {
  id: string;
  label: string;
}

interface TaskDraft {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string;
  assignee: string;
  createdBy: string;
  relatedEntityType: TaskRelatedEntityType | null;
  relatedEntityId: string;
  source: TaskSource;
  tagsInput: string;
}

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './task-modal.html',
  styleUrl: './task-modal.scss'
})
export class TaskModal {
  readonly editTask = input<Task | null>(null);
  readonly relationPrefill = input<{ type: TaskRelatedEntityType; id: string; sourceLabel?: string } | null>(null);
  readonly closed = output<void>();
  readonly saved = output<TaskCreateInput | Task>();

  readonly ts = inject(TranslationService);
  private readonly taskParser = inject(TaskParserService);
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
  readonly sources: TaskSource[] = ['manual', 'voice', 'ai', 'automation'];
  readonly relatedTypes: TaskRelatedEntityType[] = ['lead', 'client', 'property', 'deal'];

  readonly relationOptions = computed(() => {
    const type = this.draft().relatedEntityType;
    if (type === 'lead') {
      return this.leadService.leads().map(lead => ({ id: lead.id, label: lead.name }));
    }
    if (type === 'client') {
      return this.clientService.clients().map(client => ({ id: client.id, label: client.name }));
    }
    return [];
  });

  constructor() {
    queueMicrotask(() => {
      const editing = this.editTask();
      if (editing) {
        this.draft.set({
          title: editing.title,
          description: editing.description,
          status: editing.status,
          priority: editing.priority,
          dueAt: editing.dueAt,
          assignee: editing.assignee,
          createdBy: editing.createdBy,
          relatedEntityType: editing.relatedEntityType,
          relatedEntityId: editing.relatedEntityId,
          source: editing.source,
          tagsInput: editing.tags.join(', '),
        });
        return;
      }

      const prefill = this.relationPrefill();
      if (prefill) {
        this.draft.update(current => ({
          ...current,
          relatedEntityType: prefill.type,
          relatedEntityId: prefill.id,
          description: prefill.sourceLabel ? `${prefill.sourceLabel}\n` : current.description,
        }));
      }
    });
  }

  close() {
    this.closed.emit();
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
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: draft.status,
      priority: draft.priority,
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

    const editTask = this.editTask();
    if (editTask) {
      this.saved.emit({ ...editTask, ...payload, updatedAt: new Date().toISOString() });
    } else {
      this.saved.emit(payload);
    }

    this.saving.set(false);
  }

  async parseFreeform(source: TaskSource = 'ai') {
    const text = this.freeformInput().trim() || this.transcriptPreview().trim();
    if (!text) return;

    this.parsing.set(true);
    const parsed = await this.taskParser.parse({ text, source });
    this.parserPreview.set({
      ...this.defaultDraft(),
      ...parsed,
      createdBy: 'Current user',
      tagsInput: parsed.tags.join(', '),
    });
    this.parsing.set(false);
  }

  applyParserPreview() {
    const preview = this.parserPreview();
    if (!preview) return;

    this.draft.set(preview);
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

  setRelatedType(value: string) {
    const type = (value || null) as TaskRelatedEntityType | null;
    this.draft.update(current => ({
      ...current,
      relatedEntityType: type,
      relatedEntityId: '',
    }));
  }

  relationDisplayName(option: TaskRelationOption): string {
    return option.label;
  }

  private defaultDraft(): TaskDraft {
    return {
      title: '',
      description: '',
      status: 'inbox',
      priority: 'medium',
      dueAt: '',
      assignee: '',
      createdBy: 'Current user',
      relatedEntityType: null,
      relatedEntityId: '',
      source: 'manual',
      tagsInput: '',
    };
  }
}
