import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Task, TaskStatus } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { applySearch } from '../../utils/csv.utils';
import { maintenanceBuilding, maintenanceDisplayTags, maintenanceDisplayTitle } from '../../utils/maintenance-task.utils';

interface MaintenanceColumn {
  status: TaskStatus;
  tasks: Task[];
}

const MAINTENANCE_COMPLEXES = ['Thea Court', 'Olivia Gardens', 'Pafia', 'Diamond Complex', 'Olympia Court'] as const;
type MaintenanceComplexFilter = 'all' | typeof MAINTENANCE_COMPLEXES[number];

@Component({
  selector: 'app-maintenance-board',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './maintenance-board.html',
  styleUrl: '../task-board/task-board.scss'
})
export class MaintenanceBoard {
  readonly ts = inject(TranslationService);
  readonly searchQuery = input<string>('');
  readonly focusTaskId = input<string | null>(null);
  readonly createRequest = output<void>();
  readonly editRequest = output<Task>();

  private readonly taskService = inject(TaskService);

  readonly statuses: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'waiting', 'done'];
  readonly complexes = [...MAINTENANCE_COMPLEXES];
  readonly selectedComplex = signal<MaintenanceComplexFilter>('all');
  readonly draggedTaskId = signal<string | null>(null);
  readonly dropTargetStatus = signal<TaskStatus | null>(null);
  readonly taskError = computed(() => this.taskService.error());

  constructor() {
    effect(() => {
      const id = this.focusTaskId();
      if (!id) return;

      const task = this.taskService.tasks().find(entry => entry.id === id && entry.board === 'maintenance');
      if (!task) return;

      this.selectedComplex.set('all');
      window.setTimeout(() => this.scrollToTask(id), 0);
    });
  }

  readonly filteredTasks = computed(() =>
    (applySearch(this.taskService.tasks() as unknown as Record<string, unknown>[], this.searchQuery()) as unknown as Task[])
      .filter(task => task.board === 'maintenance')
      .filter(task => this.matchesComplexFilter(task))
  );

  readonly columns = computed<MaintenanceColumn[]>(() =>
    this.statuses.map(status => ({
      status,
      tasks: this.filteredTasks()
        .filter(task => task.status === status)
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    }))
  );

  openCreate() {
    this.createRequest.emit();
  }

  openEdit(task: Task) {
    this.editRequest.emit(task);
  }

  setComplexFilter(complex: MaintenanceComplexFilter) {
    this.selectedComplex.set(complex);
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

    await this.taskService.update({ ...task, status, board: 'maintenance' });
  }

  formatDueAt(task: Task): string {
    if (!task.dueAt) return '-';
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

  displayTitle(task: Task): string {
    return maintenanceDisplayTitle(task);
  }

  displayTags(task: Task): string[] {
    return maintenanceDisplayTags(task);
  }

  private matchesComplexFilter(task: Task): boolean {
    const selected = this.selectedComplex();
    if (selected === 'all') return true;
    return this.normalizeComplex(maintenanceBuilding(task)) === this.normalizeComplex(selected);
  }

  private normalizeComplex(value: string): string {
    return value.trim().toLowerCase();
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
}
