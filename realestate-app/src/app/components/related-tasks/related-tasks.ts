import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TaskRelatedEntityType } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-related-tasks',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './related-tasks.html',
  styleUrl: './related-tasks.scss'
})
export class RelatedTasks {
  readonly entityType = input<TaskRelatedEntityType | null>(null);
  readonly entityId = input<string>('');

  private readonly taskService = inject(TaskService);

  readonly tasks = computed(() => {
    const type = this.entityType();
    if (!type) return [];

    return this.taskService.relatedTasks(type, this.entityId());
  });
}
