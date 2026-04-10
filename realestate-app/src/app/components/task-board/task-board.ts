import { Component, computed, inject, input, output, signal } from '@angular/core';
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

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './task-board.html',
  styleUrl: './task-board.scss'
})
export class TaskBoard {
  readonly ts = inject(TranslationService);
  readonly searchQuery = input<string>('');
  readonly createRequest = output<void>();
  readonly editRequest = output<Task>();

  private readonly taskService = inject(TaskService);

  readonly topics = [...TASK_TOPICS];
  readonly statuses: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'waiting', 'done'];
  readonly draggedTaskId = signal<string | null>(null);
  readonly selectedTopic = signal<TaskTopicFilter>('all');
  readonly dropTargetKey = signal<string | null>(null);
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

  openCreate() {
    this.createRequest.emit();
  }

  openEdit(task: Task) {
    this.editRequest.emit(task);
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
