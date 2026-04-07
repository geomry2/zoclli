import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TASK_TOPICS, Task, TaskStatus, TaskTopic } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { TranslationService } from '../../services/translation.service';
import { TaskModal } from '../task-modal/task-modal';
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

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [TranslatePipe, TaskModal],
  templateUrl: './task-board.html',
  styleUrl: './task-board.scss'
})
export class TaskBoard {
  readonly ts = inject(TranslationService);
  readonly searchQuery = input<string>('');
  readonly relationPrefill = input<{ type: 'lead' | 'client' | 'property' | 'deal'; id: string; sourceLabel?: string } | null>(null);
  readonly prefillConsumed = output<void>();

  private readonly taskService = inject(TaskService);

  readonly topics = [...TASK_TOPICS];
  readonly statuses: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'waiting', 'done'];
  readonly draggedTaskId = signal<string | null>(null);
  readonly selectedTopic = signal<TaskTopicFilter>('all');
  readonly dropTargetKey = signal<string | null>(null);
  readonly editTask = signal<Task | null>(null);
  readonly showModal = signal(false);
  readonly taskError = computed(() => this.taskService.error());

  readonly filteredTasks = computed(() =>
    applySearch(this.taskService.tasks() as unknown as Record<string, unknown>[], this.searchQuery()) as unknown as Task[]
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

  constructor() {
    effect(() => {
      const prefill = this.relationPrefill();
      if (prefill && !this.showModal()) {
        this.editTask.set(null);
        this.showModal.set(true);
        this.prefillConsumed.emit();
      }
    });
  }

  openCreate() {
    this.editTask.set(null);
    this.showModal.set(true);
  }

  openEdit(task: Task) {
    this.editTask.set(task);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editTask.set(null);
  }

  setTopicFilter(topic: TaskTopicFilter) {
    this.selectedTopic.set(topic);
  }

  onDragStart(event: DragEvent, task: Task) {
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

  private dropKey(status: TaskStatus, topic: TaskTopic): string {
    return `${topic}:${status}`;
  }
}
