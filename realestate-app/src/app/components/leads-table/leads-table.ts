import { Component, computed, inject, input, output, signal } from '@angular/core';
import { LeadService } from '../../services/lead.service';
import { Lead } from '../../models/lead.model';
import { RowDetail, FieldDefinition } from '../row-detail/row-detail';

@Component({
  selector: 'app-leads-table',
  standalone: true,
  imports: [RowDetail],
  templateUrl: './leads-table.html',
  styleUrl: './leads-table.scss'
})
export class LeadsTable {
  readonly searchQuery = input<string>('');
  readonly editRequest = output<Lead>();

  private readonly leadService = inject(LeadService);
  readonly expandedRowId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly filteredLeads = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.leadService.leads();
    const words = q.split(/\s+/).filter(Boolean);
    return this.leadService.leads().filter((l: Lead) => {
      const haystack = Object.values(l).map(val => String(val ?? '')).join(' ').toLowerCase();
      return words.every(word => haystack.includes(word));
    });
  });

  toggleRow(id: string) {
    if (this.deletingId() === id) return;
    this.expandedRowId.set(this.expandedRowId() === id ? null : id);
  }

  requestEdit(event: Event, lead: Lead) {
    event.stopPropagation();
    this.editRequest.emit(lead);
  }

  startDelete(event: Event, id: string) {
    event.stopPropagation();
    this.expandedRowId.set(null);
    this.deletingId.set(id);
  }

  cancelDelete() { this.deletingId.set(null); }

  async confirmDelete(id: string) {
    await this.leadService.remove(id);
    this.deletingId.set(null);
  }

  readonly leadFields: FieldDefinition[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'interestedIn', label: 'Interested In' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'budgetMin', label: 'Budget Min', type: 'currency' },
    { key: 'budgetMax', label: 'Budget Max', type: 'currency' },
    { key: 'realtorName', label: 'Realtor' },
    { key: 'realtorAgency', label: 'Agency' },
    { key: 'firstInteractionDate', label: 'First Contact', type: 'date' },
    { key: 'notes', label: 'Notes' },
  ];

  formatBudget(lead: Lead): string {
    return '€' + lead.budgetMin.toLocaleString('en-EU') + ' – €' + lead.budgetMax.toLocaleString('en-EU');
  }

  asRecord(lead: Lead): Record<string, unknown> {
    return lead as unknown as Record<string, unknown>;
  }
}
