import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Task, TaskStatus } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { TaskModal } from '../task-modal/task-modal';
import { applySearch } from '../../utils/csv.utils';

interface TaskColumn {
  status: TaskStatus;
  tasks: Task[];
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [TranslatePipe, TaskModal],
  templateUrl: './task-board.html',
  styleUrl: './task-board.scss'
})
export class TaskBoard {
  readonly searchQuery = input<string>('');
  readonly relationPrefill = input<{ type: 'lead' | 'client' | 'property' | 'deal'; id: string; sourceLabel?: string } | null>(null);
  readonly prefillConsumed = output<void>();

  private readonly taskService = inject(TaskService);

  readonly statuses: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'waiting', 'done'];
  readonly draggedTaskId = signal<string | null>(null);
  readonly dropTargetStatus = signal<TaskStatus | null>(null);
  readonly editTask = signal<Task | null>(null);
  readonly showModal = signal(false);
  readonly taskError = computed(() => this.taskService.error());

  readonly filteredTasks = computed(() =>
    applySearch(this.taskService.tasks() as unknown as Record<string, unknown>[], this.searchQuery()) as unknown as Task[]
  );

  readonly columns = computed((): TaskColumn[] => this.statuses.map(status => ({
    status,
    tasks: this.filteredTasks()
      .filter(task => task.status === status)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
  })));

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

  onDragStart(event: DragEvent, task: Task) {
    this.draggedTaskId.set(task.id);
    event.dataTransfer?.setData('text/plain', task.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    this.dropTargetStatus.set(status);
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDragLeave() {
    this.dropTargetStatus.set(null);
  }

  async onDrop(event: DragEvent, status: TaskStatus) {
    event.preventDefault();

    const id = event.dataTransfer?.getData('text/plain') || this.draggedTaskId();
    this.draggedTaskId.set(null);
    this.dropTargetStatus.set(null);
    if (!id) return;

    const task = this.taskService.tasks().find(entry => entry.id === id);
    if (!task || task.status === status) return;

    await this.taskService.update({ ...task, status });
  }

  formatDueAt(task: Task): string {
    if (!task.dueAt) return '—';
    const parsed = new Date(task.dueAt);
    if (Number.isNaN(parsed.getTime())) return task.dueAt;
    return parsed.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async removeTask(task: Task) {
    await this.taskService.remove(task.id);
  }
}
