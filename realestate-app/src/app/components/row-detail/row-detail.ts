import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

export interface FieldDefinition {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'currency' | 'badge';
}

@Component({
  selector: 'app-row-detail',
  standalone: true,
  imports: [NgClass],
  templateUrl: './row-detail.html',
  styleUrl: './row-detail.scss'
})
export class RowDetail {
  readonly entry = input<Record<string, unknown>>({});
  readonly fields = input<FieldDefinition[]>([]);

  formatValue(field: FieldDefinition, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';

    switch (field.type) {
      case 'currency':
        return '$' + Number(value).toLocaleString('en-US');
      case 'date':
        return new Date(String(value)).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      default:
        return String(value);
    }
  }

  isBadge(field: FieldDefinition): boolean {
    return field.type === 'badge';
  }

  getBadgeValue(value: unknown): string {
    return String(value ?? '');
  }
}
