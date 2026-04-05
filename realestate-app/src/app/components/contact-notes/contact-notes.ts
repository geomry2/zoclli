import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContactNote } from '../../models/contact-note.model';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { appendContactNote, normalizeContactNotes } from '../../utils/contact-notes.utils';

@Component({
  selector: 'app-contact-notes',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './contact-notes.html',
  styleUrl: './contact-notes.scss'
})
export class ContactNotes {
  readonly notes = input<ContactNote[]>([]);
  readonly editable = input(false);
  readonly notesChange = output<ContactNote[]>();

  readonly ts = inject(TranslationService);
  readonly draftBody = signal('');

  readonly normalizedNotes = computed(() => normalizeContactNotes(this.notes()));

  addNote() {
    const body = this.draftBody().trim();
    if (!body) return;

    this.notesChange.emit(appendContactNote(this.notes(), body));
    this.draftBody.set('');
  }

  updateDraft(value: string) {
    this.draftBody.set(value);
  }

  formatTimestamp(note: ContactNote): string {
    if (!note.createdAt) {
      return this.ts.t('notes.legacy');
    }

    return new Date(note.createdAt).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
