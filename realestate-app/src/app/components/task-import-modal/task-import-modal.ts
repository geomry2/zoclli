import { Component, computed, inject, output, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TaskCreateInput } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { TranslationService } from '../../services/translation.service';
import { parseImportedTasks } from '../../utils/task.utils';

@Component({
  selector: 'app-task-import-modal',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './task-import-modal.html',
  styleUrl: './task-import-modal.scss'
})
export class TaskImportModal {
  readonly closed = output<void>();

  private readonly taskService = inject(TaskService);
  private readonly ts = inject(TranslationService);

  readonly importText = signal('');
  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  readonly importedCount = signal(0);
  readonly importPreview = computed(() => parseImportedTasks(this.importText()));

  updateImportText(value: string) {
    this.importText.set(value);
    this.importError.set(null);
    this.importedCount.set(0);
  }

  close() {
    this.closed.emit();
  }

  async importTasks() {
    const drafts = this.importPreview();
    if (drafts.length === 0) {
      this.importError.set(this.ts.t('tasks.importErrorEmpty'));
      this.importedCount.set(0);
      return;
    }

    this.importing.set(true);
    this.importError.set(null);
    this.importedCount.set(0);

    try {
      let createdCount = 0;
      for (const draft of drafts) {
        const payload: TaskCreateInput = {
          title: draft.title,
          shortTitle: '',
          description: '',
          status: draft.status,
          priority: 'medium',
          topic: draft.topic,
          dueAt: '',
          assignee: draft.assignee,
          createdBy: '',
          relatedEntityType: null,
          relatedEntityId: '',
          source: 'manual',
          tags: ['imported'],
        };
        const result = await this.taskService.add(payload);
        if (result.error) {
          this.importError.set(result.error);
          this.importedCount.set(createdCount);
          return;
        }
        createdCount += 1;
      }

      this.importText.set('');
      this.importedCount.set(createdCount);
    } finally {
      this.importing.set(false);
    }
  }
}
