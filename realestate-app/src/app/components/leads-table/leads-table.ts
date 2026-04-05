import { Component, computed, inject, input, output, signal } from '@angular/core';
import { LeadService } from '../../services/lead.service';
import { Lead, LeadStatus } from '../../models/lead.model';
import { RowDetail, FieldDefinition } from '../row-detail/row-detail';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { applySearch } from '../../utils/csv.utils';
import {
  compareValues,
  DateRangeFilter,
  matchesDateRange,
  nextSortState,
  NumberRangeFilter,
  SortDirection,
  SortState,
  toggleSelection,
  uniqueValues,
} from '../../utils/table.utils';

type LeadSortKey = 'name' | 'phone' | 'status' | 'budgetRange' | 'interestedIn' | 'followUpDate' | 'realtorName';

@Component({
  selector: 'app-leads-table',
  standalone: true,
  imports: [RowDetail, TranslatePipe],
  templateUrl: './leads-table.html',
  styleUrl: './leads-table.scss'
})
export class LeadsTable {
  readonly searchQuery = input<string>('');
  readonly editRequest = output<Lead>();
  readonly convertRequest = output<Lead>();

  readonly ts = inject(TranslationService);
  private readonly leadService = inject(LeadService);
  readonly expandedRowId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly leadStatuses: LeadStatus[] = ['new', 'contacted', 'negotiating', 'lost'];
  readonly sortState = signal<SortState<LeadSortKey>>({ key: 'followUpDate', direction: 'asc' });
  readonly statusFilters = signal<LeadStatus[]>([]);
  readonly realtorFilters = signal<string[]>([]);
  readonly followUpDateRange = signal<DateRangeFilter>({ from: '', to: '' });
  readonly budgetRange = signal<NumberRangeFilter>({ min: '', max: '' });

  readonly availableRealtors = computed(() =>
    uniqueValues(this.leadService.leads().map(lead => lead.realtorName))
  );

  readonly hasActiveFilters = computed(() => {
    const followUpDateRange = this.followUpDateRange();
    const budgetRange = this.budgetRange();

    return this.statusFilters().length > 0
      || this.realtorFilters().length > 0
      || Boolean(followUpDateRange.from || followUpDateRange.to)
      || Boolean(budgetRange.min || budgetRange.max);
  });

  readonly showResultCount = computed(() =>
    Boolean(this.searchQuery().trim()) || this.hasActiveFilters()
  );

  readonly filteredLeads = computed(() => {
    const leads = applySearch(
      this.leadService.leads() as unknown as Record<string, unknown>[],
      this.searchQuery(),
    ) as unknown as Lead[];

    const filtered = leads.filter(lead => this.matchesFilters(lead));
    const sortState = this.sortState();
    const accessor = this.sortAccessors[sortState.key];

    return [...filtered].sort((left, right) => {
      const comparison = compareValues(accessor(left), accessor(right));
      return sortState.direction === 'asc' ? comparison : -comparison;
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

  requestConvert(event: Event, lead: Lead) {
    event.stopPropagation();
    this.convertRequest.emit(lead);
  }

  startDelete(event: Event, id: string) {
    event.stopPropagation();
    this.expandedRowId.set(null);
    this.deletingId.set(id);
  }

  readonly deleteError = signal<string | null>(null);

  cancelDelete() { this.deletingId.set(null); this.deleteError.set(null); }

  readonly saveError = signal<string | null>(null);

  async onLeadSave(record: Record<string, unknown>) {
    const lead = record as unknown as Lead;
    const { error } = await this.leadService.update(lead);
    if (error) this.saveError.set(error);
    else this.saveError.set(null);
  }

  async confirmDelete(id: string) {
    const { error } = await this.leadService.remove(id);
    if (error) { this.deleteError.set(error); return; }
    this.deleteError.set(null);
    this.deletingId.set(null);
    if (this.expandedRowId() === id) this.expandedRowId.set(null);
  }

  readonly leadFields: FieldDefinition[] = [
    { key: 'name', label: 'field.fullName' },
    { key: 'phone', label: 'field.phone' },
    { key: 'email', label: 'field.email' },
    { key: 'interestedIn', label: 'field.interestedIn' },
    { key: 'status', label: 'field.status', type: 'badge', options: ['new', 'contacted', 'negotiating', 'lost'], translatePrefix: 'status.' },
    { key: 'budgetMin', label: 'field.budgetMin', type: 'currency' },
    { key: 'budgetMax', label: 'field.budgetMax', type: 'currency' },
    { key: 'followUpDate', label: 'field.followUpDate', type: 'date' },
    { key: 'realtorName', label: 'field.realtorName' },
    { key: 'realtorAgency', label: 'field.realtorAgency' },
    { key: 'firstInteractionDate', label: 'field.firstContact', type: 'date' },
    { key: 'notes', label: 'field.notes', multiline: true },
  ];

  formatBudget(lead: Lead): string {
    return '€' + lead.budgetMin.toLocaleString('en-EU') + ' – €' + lead.budgetMax.toLocaleString('en-EU');
  }

  formatFollowUp(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isOverdue(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date(new Date().toDateString());
  }

  isDueToday(date: string): boolean {
    if (!date) return false;
    return new Date(date).toDateString() === new Date().toDateString();
  }

  toggleSort(key: LeadSortKey) {
    this.sortState.update(current => nextSortState(current, key));
  }

  sortDirection(key: LeadSortKey): SortDirection | null {
    const current = this.sortState();
    return current.key === key ? current.direction : null;
  }

  ariaSort(key: LeadSortKey): 'ascending' | 'descending' | 'none' {
    const direction = this.sortDirection(key);
    if (direction === 'asc') return 'ascending';
    if (direction === 'desc') return 'descending';
    return 'none';
  }

  toggleStatus(status: LeadStatus) {
    this.statusFilters.update(current => toggleSelection(current, status));
  }

  toggleRealtor(realtor: string) {
    this.realtorFilters.update(current => toggleSelection(current, realtor));
  }

  setFollowUpDate(part: keyof DateRangeFilter, value: string) {
    this.followUpDateRange.update(range => ({ ...range, [part]: value }));
  }

  setBudgetRange(part: keyof NumberRangeFilter, value: string) {
    this.budgetRange.update(range => ({ ...range, [part]: value }));
  }

  clearFilters() {
    this.statusFilters.set([]);
    this.realtorFilters.set([]);
    this.followUpDateRange.set({ from: '', to: '' });
    this.budgetRange.set({ min: '', max: '' });
  }

  isStatusSelected(status: LeadStatus): boolean {
    return this.statusFilters().includes(status);
  }

  isRealtorSelected(realtor: string): boolean {
    return this.realtorFilters().includes(realtor);
  }

  asRecord(lead: Lead): Record<string, unknown> {
    return lead as unknown as Record<string, unknown>;
  }

  private readonly sortAccessors: Record<LeadSortKey, (lead: Lead) => unknown> = {
    name: lead => lead.name,
    phone: lead => lead.phone,
    status: lead => this.ts.t(`status.${lead.status}`),
    budgetRange: lead => lead.budgetMax,
    interestedIn: lead => lead.interestedIn,
    followUpDate: lead => lead.followUpDate,
    realtorName: lead => lead.realtorName,
  };

  private matchesFilters(lead: Lead): boolean {
    const statusFilters = this.statusFilters();
    if (statusFilters.length > 0 && !statusFilters.includes(lead.status)) {
      return false;
    }

    const realtorFilters = this.realtorFilters();
    if (realtorFilters.length > 0 && !realtorFilters.includes(lead.realtorName)) {
      return false;
    }

    if (!matchesDateRange(lead.followUpDate, this.followUpDateRange())) {
      return false;
    }

    if (!this.matchesBudgetRange(lead)) {
      return false;
    }

    return true;
  }

  private matchesBudgetRange(lead: Lead): boolean {
    const range = this.budgetRange();
    const min = this.parseRangeNumber(range.min);
    const max = this.parseRangeNumber(range.max);

    if (min === null && max === null) return true;
    if (min !== null && lead.budgetMax < min) return false;
    if (max !== null && lead.budgetMin > max) return false;
    return true;
  }

  private parseRangeNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
