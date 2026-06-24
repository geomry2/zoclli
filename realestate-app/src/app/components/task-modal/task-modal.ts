import { AfterViewInit, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TASK_TOPICS, MaintenanceTaskMetadata, Task, TaskBoardType, TaskCreateInput, TaskPriority, TaskRelatedEntityType, TaskSource, TaskStatus, TaskTopic } from '../../models/task.model';
import { TaskParserService } from '../../services/task-parser.service';
import { TaskService } from '../../services/task.service';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { extractMaintenanceMetadata } from '../../utils/maintenance-task.utils';
import { normalizeTaskTopic, toTaskInputDateTime } from '../../utils/task.utils';
import { FancyDateInput } from '../fancy-date-input/fancy-date-input';

interface TaskDraft {
  title: string;
  description: string;
  status: TaskStatus;
  board: TaskBoardType;
  priority: TaskPriority;
  topic: TaskTopic;
  dueAt: string;
  assignee: string;
  createdBy: string;
  relatedEntityType: TaskRelatedEntityType | null;
  relatedEntityId: string;
  source: TaskSource;
  tagsInput: string;
  maintenance: MaintenanceTaskMetadata;
  metadata: Record<string, unknown>;
}

interface TaskAssigneeOption {
  value: string;
  label: string;
}

interface MaintenanceMediaItem {
  url: string;
  type: 'image' | 'video' | 'file';
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
  readonly taskBoard = input<TaskBoardType>('operations');
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
  private readonly auth = inject(AuthService);

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
  readonly activeTaskBoard = computed<TaskBoardType>(() => this.editTask()?.board ?? this.taskBoard());
  readonly isMaintenanceBoard = computed(() => this.activeTaskBoard() === 'maintenance');
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
    if (existingId) return `${this.isMaintenanceBoard() ? 'MNT' : 'TASK'}-${existingId.slice(0, 4).toUpperCase()}`;
    return this.ts.t(this.isMaintenanceBoard() ? 'maintenance.newIssueKey' : 'tasks.newIssueKey');
  });
  readonly modalCrumbLabel = computed(() => this.ts.t(this.isMaintenanceBoard() ? 'maintenance.title' : 'tasks.title'));
  readonly titlePlaceholder = computed(() => this.ts.t(this.isMaintenanceBoard() ? 'maintenance.modalTitle' : 'tasks.fieldTitle'));
  readonly mediaGalleryItems = computed<MaintenanceMediaItem[]>(() =>
    this.draft().maintenance.filesMedia
      .map(url => this.toMediaGalleryItem(url))
      .filter((item): item is MaintenanceMediaItem => item !== null)
  );
  readonly submitLabel = computed(() => {
    if (this.saving()) return this.ts.t('btn.saving');
    if (this.editTask()) return this.ts.t('btn.saveChanges');
    return this.ts.t(this.isMaintenanceBoard() ? 'maintenance.createAction' : 'tasks.createAction');
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
          board: editing.board,
          priority: editing.priority,
          topic: normalizeTaskTopic(editing.topic),
          dueAt: toTaskInputDateTime(editing.dueAt),
          assignee: editing.assignee,
          createdBy: editing.createdBy || this.currentAuthorName(),
          relatedEntityType: editing.relatedEntityType,
          relatedEntityId: editing.relatedEntityId,
          source: editing.source,
          tagsInput: editing.tags.join(', '),
          maintenance: this.maintenanceFromMetadata(editing.metadata),
          metadata: editing.metadata,
        });
        this.pendingDueTime.set(this.extractDueTime(toTaskInputDateTime(editing.dueAt)) || '09:00');
        return;
      }

      const prefill = this.relationPrefill();
      this.draft.update(current => ({
        ...current,
        board: this.taskBoard(),
      }));

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
    const draft = { ...this.draft(), board: this.activeTaskBoard() };
    const title = this.resolveTitle(draft);
    if (!title) {
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
      board: this.activeTaskBoard(),
      topic: draft.topic,
      dueAt: draft.dueAt,
      assignee: draft.assignee.trim(),
      createdBy: draft.createdBy.trim() || this.currentAuthorName(),
      relatedEntityType: draft.relatedEntityType,
      relatedEntityId: draft.relatedEntityId.trim(),
      source: draft.source,
      tags: draft.tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
      metadata: this.buildMetadata(draft),
    };

    payload.title = title;
    payload.description = this.resolveDescription(draft);

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
      createdBy: this.currentAuthorName(),
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
      board: this.taskBoard(),
      topic: 'office',
      dueAt: '',
      assignee: '',
      createdBy: this.currentAuthorName(),
      relatedEntityType: null,
      relatedEntityId: '',
      source: 'manual',
      tagsInput: '',
      maintenance: this.emptyMaintenanceMetadata(),
      metadata: {},
    };
  }

  private currentAuthorName(): string {
    return this.auth.currentTaskName() || 'Current user';
  }

  updateMaintenance<K extends keyof MaintenanceTaskMetadata>(key: K, value: MaintenanceTaskMetadata[K]) {
    this.draft.update(current => ({
      ...current,
      maintenance: {
        ...current.maintenance,
        [key]: value,
      },
    }));
  }

  updateFilesMedia(value: string) {
    this.updateMaintenance(
      'filesMedia',
      value
        .split(/\r?\n|,/)
        .map(entry => entry.trim())
        .filter(Boolean),
    );
  }

  filesMediaInput(): string {
    return this.draft().maintenance.filesMedia.join('\n');
  }

  private toMediaGalleryItem(value: string): MaintenanceMediaItem | null {
    const url = String(value ?? '').trim();
    if (!url) return null;

    const pathname = this.mediaPathname(url);
    const label = decodeURIComponent(pathname.split('/').pop() || 'media');
    const extension = (pathname.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();
    const imageExtensions = new Set(['apng', 'avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']);
    const videoExtensions = new Set(['mov', 'mp4', 'm4v', 'ogg', 'ogv', 'webm']);

    return {
      url,
      label,
      type: imageExtensions.has(extension)
        ? 'image'
        : videoExtensions.has(extension)
          ? 'video'
          : 'file',
    };
  }

  private mediaPathname(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url.split('?')[0] ?? url;
    }
  }

  private buildMetadata(draft: TaskDraft): Record<string, unknown> {
    if (draft.board !== 'maintenance') return draft.metadata;

    return {
      ...draft.metadata,
      maintenance: {
        ...draft.maintenance,
      },
    };
  }

  private resolveTitle(draft: TaskDraft): string {
    const explicitTitle = draft.title.trim();
    if (explicitTitle) return explicitTitle;
    if (draft.board !== 'maintenance') return '';

    const issue = draft.maintenance.issue.trim();
    const location = [draft.maintenance.building, draft.maintenance.apartment]
      .map(value => value.trim())
      .filter(Boolean)
      .join(' ');

    return [issue || this.ts.t('maintenance.fallbackTitle'), location].filter(Boolean).join(' - ').trim();
  }

  private resolveDescription(draft: TaskDraft): string {
    if (draft.board !== 'maintenance') return draft.description.trim();

    return draft.description.trim() || draft.maintenance.moreDetails.trim() || draft.maintenance.issue.trim();
  }

  private maintenanceFromMetadata(metadata: Record<string, unknown>): MaintenanceTaskMetadata {
    const task = this.editTask();
    if (!task) return this.emptyMaintenanceMetadata();
    return extractMaintenanceMetadata(task);
  }

  private emptyMaintenanceMetadata(): MaintenanceTaskMetadata {
    return {
      requesterName: '',
      email: '',
      phone: '',
      city: '',
      building: '',
      apartment: '',
      maintenanceType: '',
      issue: '',
      moreDetails: '',
      filesMedia: [],
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
