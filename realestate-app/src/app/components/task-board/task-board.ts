import { Component, computed, effect, inject, input, output, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TASK_TOPICS, Task, TaskStatus, TaskTopic } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { TranslationService } from '../../services/translation.service';
import { applySearch } from '../../utils/csv.utils';

interface TaskColumn {
  topic: TaskTopic;
  status: TaskStatus;
  tasks: Task[];
}

interface TaskSection {
  topic: TaskTopic;
  taskCount: number;
  columns: TaskColumn[];
}

type TaskTopicFilter = 'all' | TaskTopic;
type TaskAssigneeFilter = 'all' | 'unassigned' | 'Agis' | 'Tanya' | 'Julia' | 'George';

interface TaskAssigneeOption {
  value: TaskAssigneeFilter;
  label: string;
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './task-board.html',
  styleUrl: './task-board.scss'
})
export class TaskBoard implements OnDestroy {
  readonly ts = inject(TranslationService);
  readonly searchQuery = input<string>('');
  readonly focusTaskId = input<string | null>(null);
  readonly createRequest = output<void>();
  readonly importRequest = output<void>();
  readonly editRequest = output<Task>();

  private readonly taskService = inject(TaskService);

  readonly topics = [...TASK_TOPICS];
  readonly statuses: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'waiting', 'done'];
  readonly draggedTaskId = signal<string | null>(null);
  readonly selectedTopic = signal<TaskTopicFilter>('all');
  readonly selectedAssignee = signal<TaskAssigneeFilter>('all');
  readonly dropTargetKey = signal<string | null>(null);
  private readonly compactViewport = signal(this.isCompactViewport());
  private readonly updateViewportState = () => this.compactViewport.set(this.isCompactViewport());
  readonly dragEnabled = computed(() => !this.compactViewport());
  readonly taskError = computed(() => this.taskService.error());

  constructor() {
    effect(() => {
      const id = this.focusTaskId();
      if (!id) return;

      const task = this.taskService.tasks().find(entry => entry.id === id && entry.board !== 'maintenance');
      if (!task) return;

      this.selectedTopic.set('all');
      this.selectedAssignee.set('all');
      window.setTimeout(() => this.scrollToTask(id), 0);
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.updateViewportState, { passive: true });
    }
  }

  readonly assigneeOptions = computed<TaskAssigneeOption[]>(() => {
    this.ts.lang();

    return [
      { value: 'all', label: this.ts.t('tasks.allPeople') },
      { value: 'unassigned', label: this.ts.t('tasks.unassigned') },
      { value: 'Agis', label: this.ts.t('tasks.assignee.agis') },
      { value: 'Tanya', label: this.ts.t('tasks.assignee.tanya') },
      { value: 'Julia', label: this.ts.t('tasks.assignee.julia') },
      { value: 'George', label: this.ts.t('tasks.assignee.george') },
    ];
  });

  readonly filteredTasks = computed(() =>
    (applySearch(this.taskService.tasks() as unknown as Record<string, unknown>[], this.searchQuery()) as unknown as Task[])
      .filter(task => task.board !== 'maintenance')
      .filter(task => this.matchesAssigneeFilter(task))
  );

  readonly visibleSections = computed((): TaskSection[] => {
    const activeTopic = this.selectedTopic();
    const visibleTopics = activeTopic === 'all' ? this.topics : this.topics.filter(topic => topic === activeTopic);

    return visibleTopics.map(topic => ({
      topic,
      taskCount: this.filteredTasks().filter(task => task.topic === topic).length,
      columns: this.statuses.map(status => ({
        topic,
        status,
        tasks: this.filteredTasks()
          .filter(task => task.topic === topic && task.status === status)
          .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
      })),
    }));
  });

  openCreate() {
    this.createRequest.emit();
  }

  openImport() {
    this.importRequest.emit();
  }

  openEdit(task: Task) {
    this.editRequest.emit(task);
  }

  setTopicFilter(topic: TaskTopicFilter) {
    this.selectedTopic.set(topic);
  }

  setAssigneeFilter(assignee: TaskAssigneeFilter) {
    this.selectedAssignee.set(assignee);
  }

  onDragStart(event: DragEvent, task: Task) {
    if (!this.dragEnabled()) return;
    this.draggedTaskId.set(task.id);
    event.dataTransfer?.setData('text/plain', task.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent, status: TaskStatus, topic: TaskTopic) {
    event.preventDefault();
    this.dropTargetKey.set(this.dropKey(status, topic));
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDragLeave() {
    this.dropTargetKey.set(null);
  }

  async onDrop(event: DragEvent, status: TaskStatus, topic: TaskTopic) {
    event.preventDefault();

    const id = event.dataTransfer?.getData('text/plain') || this.draggedTaskId();
    this.draggedTaskId.set(null);
    this.dropTargetKey.set(null);
    if (!id) return;

    const task = this.taskService.tasks().find(entry => entry.id === id);
    if (!task || (task.status === status && task.topic === topic)) return;

    await this.taskService.update({ ...task, status, topic });
  }

  formatDueAt(task: Task): string {
    if (!task.dueAt) return '—';
    const parsed = new Date(task.dueAt);
    if (Number.isNaN(parsed.getTime())) return task.dueAt;

    return parsed.toLocaleString(this.ts.lang() === 'ru' ? 'ru-RU' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async removeTask(task: Task) {
    await this.taskService.remove(task.id);
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.updateViewportState);
    }
  }

  displayTitle(task: Task): string {
    return task.shortTitle?.trim() || task.title.trim();
  }

  private matchesAssigneeFilter(task: Task): boolean {
    const filter = this.selectedAssignee();
    if (filter === 'all') return true;
    if (filter === 'unassigned') return !task.assignee.trim();

    return task.assignee.trim() === filter;
  }

  private dropKey(status: TaskStatus, topic: TaskTopic): string {
    return `${topic}:${status}`;
  }

  private scrollToTask(id: string) {
    const element = this.findTaskElement(id);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    element.classList.add('task-card--focused');
    window.setTimeout(() => element.classList.remove('task-card--focused'), 1800);
  }

  private findTaskElement(id: string): HTMLElement | null {
    return [...document.querySelectorAll<HTMLElement>('[data-task-id]')]
      .find(element => element.dataset['taskId'] === id) ?? null;
  }

  private isCompactViewport(): boolean {
    return typeof window !== 'undefined' ? window.innerWidth <= 760 : false;
  }
}
