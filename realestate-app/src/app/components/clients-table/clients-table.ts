import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { Client, ClientStatus, PropertyType } from '../../models/client.model';
import { RowDetail, FieldDefinition } from '../row-detail/row-detail';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { applySearch } from '../../utils/csv.utils';
import {
  compareValues,
  DateRangeFilter,
  matchesDateRange,
  matchesNumberRange,
  nextSortState,
  NumberRangeFilter,
  SortDirection,
  SortState,
  toggleSelection,
  uniqueValues,
} from '../../utils/table.utils';

type ClientSortKey = 'name' | 'phone' | 'propertyType' | 'status' | 'dealValue' | 'realtorName';

@Component({
  selector: 'app-clients-table',
  standalone: true,
  imports: [RowDetail, TranslatePipe],
  templateUrl: './clients-table.html',
  styleUrl: './clients-table.scss'
})
export class ClientsTable {
  readonly searchQuery = input<string>('');
  readonly editRequest = output<Client>();

  readonly ts = inject(TranslationService);
  private readonly clientService = inject(ClientService);
  readonly expandedRowId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly propertyTypes: PropertyType[] = ['apartment', 'house', 'villa', 'commercial', 'land'];
  readonly clientStatuses: ClientStatus[] = ['active', 'inactive', 'closed'];
  readonly sortState = signal<SortState<ClientSortKey>>({ key: 'name', direction: 'asc' });
  readonly statusFilters = signal<ClientStatus[]>([]);
  readonly propertyTypeFilters = signal<PropertyType[]>([]);
  readonly realtorFilters = signal<string[]>([]);
  readonly purchaseDateRange = signal<DateRangeFilter>({ from: '', to: '' });
  readonly dealValueRange = signal<NumberRangeFilter>({ min: '', max: '' });

  readonly availableRealtors = computed(() =>
    uniqueValues(this.clientService.clients().map(client => client.realtorName))
  );

  readonly hasActiveFilters = computed(() => {
    const purchaseDateRange = this.purchaseDateRange();
    const dealValueRange = this.dealValueRange();

    return this.statusFilters().length > 0
      || this.propertyTypeFilters().length > 0
      || this.realtorFilters().length > 0
      || Boolean(purchaseDateRange.from || purchaseDateRange.to)
      || Boolean(dealValueRange.min || dealValueRange.max);
  });

  readonly showResultCount = computed(() =>
    Boolean(this.searchQuery().trim()) || this.hasActiveFilters()
  );

  readonly filteredClients = computed(() => {
    const clients = applySearch(
      this.clientService.clients() as unknown as Record<string, unknown>[],
      this.searchQuery(),
    ) as unknown as Client[];

    const filtered = clients.filter(client => this.matchesFilters(client));
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

  requestEdit(event: Event, client: Client) {
    event.stopPropagation();
    this.editRequest.emit(client);
  }

  startDelete(event: Event, id: string) {
    event.stopPropagation();
    this.expandedRowId.set(null);
    this.deletingId.set(id);
  }

  readonly deleteError = signal<string | null>(null);

  cancelDelete() { this.deletingId.set(null); this.deleteError.set(null); }

  readonly saveError = signal<string | null>(null);

  async onClientSave(record: Record<string, unknown>) {
    const client = record as unknown as Client;
    const { error } = await this.clientService.update(client);
    if (error) this.saveError.set(error);
    else this.saveError.set(null);
  }

  async confirmDelete(id: string) {
    const { error } = await this.clientService.remove(id);
    if (error) { this.deleteError.set(error); return; }
    this.deleteError.set(null);
    this.deletingId.set(null);
    if (this.expandedRowId() === id) this.expandedRowId.set(null);
  }

  readonly clientFields: FieldDefinition[] = [
    { key: 'name', label: 'field.fullName' },
    { key: 'phone', label: 'field.phone' },
    { key: 'email', label: 'field.email' },
    { key: 'buildingName', label: 'field.building' },
    { key: 'apartmentNumber', label: 'field.apartmentNumber' },
    { key: 'propertyType', label: 'field.propertyType', type: 'badge', options: ['apartment', 'house', 'commercial', 'land', 'villa'], translatePrefix: 'proptype.' },
    { key: 'status', label: 'field.status', type: 'badge', options: ['active', 'inactive', 'closed'], translatePrefix: 'status.' },
    { key: 'purchaseDate', label: 'field.purchaseDate', type: 'date' },
    { key: 'dealValue', label: 'field.dealValue', type: 'currency' },
    { key: 'realtorName', label: 'field.realtorName' },
    { key: 'realtorAgency', label: 'field.realtorAgency' },
    { key: 'notes', label: 'field.notes', multiline: true },
  ];

  formatDealValue(value: number): string {
    return '€' + value.toLocaleString('en-US');
  }

  toggleSort(key: ClientSortKey) {
    this.sortState.update(current => nextSortState(current, key));
  }

  sortDirection(key: ClientSortKey): SortDirection | null {
    const current = this.sortState();
    return current.key === key ? current.direction : null;
  }

  ariaSort(key: ClientSortKey): 'ascending' | 'descending' | 'none' {
    const direction = this.sortDirection(key);
    if (direction === 'asc') return 'ascending';
    if (direction === 'desc') return 'descending';
    return 'none';
  }

  toggleStatus(status: ClientStatus) {
    this.statusFilters.update(current => toggleSelection(current, status));
  }

  togglePropertyType(type: PropertyType) {
    this.propertyTypeFilters.update(current => toggleSelection(current, type));
  }

  toggleRealtor(realtor: string) {
    this.realtorFilters.update(current => toggleSelection(current, realtor));
  }

  setPurchaseDate(part: keyof DateRangeFilter, value: string) {
    this.purchaseDateRange.update(range => ({ ...range, [part]: value }));
  }

  setDealValue(part: keyof NumberRangeFilter, value: string) {
    this.dealValueRange.update(range => ({ ...range, [part]: value }));
  }

  clearFilters() {
    this.statusFilters.set([]);
    this.propertyTypeFilters.set([]);
    this.realtorFilters.set([]);
    this.purchaseDateRange.set({ from: '', to: '' });
    this.dealValueRange.set({ min: '', max: '' });
  }

  isStatusSelected(status: ClientStatus): boolean {
    return this.statusFilters().includes(status);
  }

  isPropertyTypeSelected(type: PropertyType): boolean {
    return this.propertyTypeFilters().includes(type);
  }

  isRealtorSelected(realtor: string): boolean {
    return this.realtorFilters().includes(realtor);
  }

  asRecord(client: Client): Record<string, unknown> {
    return client as unknown as Record<string, unknown>;
  }

  private readonly sortAccessors: Record<ClientSortKey, (client: Client) => unknown> = {
    name: client => client.name,
    phone: client => client.phone,
    propertyType: client => this.ts.t(`proptype.${client.propertyType}`),
    status: client => this.ts.t(`status.${client.status}`),
    dealValue: client => client.dealValue,
    realtorName: client => client.realtorName,
  };

  private matchesFilters(client: Client): boolean {
    const statusFilters = this.statusFilters();
    if (statusFilters.length > 0 && !statusFilters.includes(client.status)) {
      return false;
    }

    const propertyTypeFilters = this.propertyTypeFilters();
    if (propertyTypeFilters.length > 0 && !propertyTypeFilters.includes(client.propertyType)) {
      return false;
    }

    const realtorFilters = this.realtorFilters();
    if (realtorFilters.length > 0 && !realtorFilters.includes(client.realtorName)) {
      return false;
    }

    if (!matchesDateRange(client.purchaseDate, this.purchaseDateRange())) {
      return false;
    }

    if (!matchesNumberRange(client.dealValue, this.dealValueRange())) {
      return false;
    }

    return true;
  }
}
