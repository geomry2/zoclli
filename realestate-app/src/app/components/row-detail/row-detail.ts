import { Component, inject, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ContactNotes } from '../contact-notes/contact-notes';
import { ContactNote } from '../../models/contact-note.model';

export interface FieldDefinition {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'currency' | 'badge' | 'notes';
  options?: string[];
  multiline?: boolean;
  translatePrefix?: string;
}

@Component({
  selector: 'app-row-detail',
  standalone: true,
  imports: [NgClass, FormsModule, TranslatePipe, ContactNotes],
  templateUrl: './row-detail.html',
  styleUrl: './row-detail.scss'
})
export class RowDetail {
  readonly entry = input<Record<string, unknown>>({});
  readonly fields = input<FieldDefinition[]>([]);
  readonly entrySave = output<Record<string, unknown>>();

  readonly editMode = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  draft: Record<string, unknown> = {};

  startEdit(event: Event) {
    event.stopPropagation();
    this.draft = structuredClone(this.entry());
    this.saveError.set(null);
    this.editMode.set(true);
  }

  cancelEdit(event: Event) {
    event.stopPropagation();
    this.editMode.set(false);
    this.saveError.set(null);
  }

  saveDraft(event: Event) {
    event.stopPropagation();
    this.entrySave.emit({ ...this.draft });
    this.editMode.set(false);
  }

  formatValue(field: FieldDefinition, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';

    switch (field.type) {
      case 'currency':
        return '€' + Number(value).toLocaleString('en-US');
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

  isNotes(field: FieldDefinition): boolean {
    return field.type === 'notes';
  }

  getBadgeValue(value: unknown): string {
    return String(value ?? '');
  }

  getTranslatedOption(field: FieldDefinition, value: unknown): string {
    const raw = String(value ?? '');
    return field.translatePrefix ? `${field.translatePrefix}${raw}` : raw;
  }

  getDisplayBadgeValue(field: FieldDefinition, value: unknown): string {
    const raw = this.getBadgeValue(value);
    return raw ? this.getTranslatedOption(field, raw) : '—';
  }

  setDraftNumber(key: string, val: unknown) {
    const n = Number(val);
    this.draft[key] = isNaN(n) ? 0 : n;
  }

  getNotes(value: unknown): ContactNote[] {
    return Array.isArray(value) ? value as ContactNote[] : [];
  }

  setDraftNotes(key: string, notes: ContactNote[]) {
    this.draft[key] = notes;
  }
}
