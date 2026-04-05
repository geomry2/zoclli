import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { Client, ClientStatus, PropertyType } from '../../models/client.model';
import { RowDetail, FieldDefinition } from '../row-detail/row-detail';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { applySearch } from '../../utils/csv.utils';
import { formatCommissionValue, getCommissionAmount } from '../../utils/commission.utils';
import {
  loadVisibleColumnKeys,
  persistVisibleColumnKeys,
  toggleVisibleColumnKey,
  usesDefaultVisibleColumns,
} from '../../utils/column-visibility.utils';
import { openPrintableDocument } from '../../utils/pdf.utils';
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
type ClientColumnKey = ClientSortKey;

interface ClientColumnDefinition {
  key: ClientColumnKey;
  label: string;
}

const CLIENT_COLUMNS: ClientColumnDefinition[] = [
  { key: 'name', label: 'col.name' },
  { key: 'phone', label: 'col.phone' },
  { key: 'propertyType', label: 'col.propertyType' },
  { key: 'status', label: 'col.status' },
  { key: 'dealValue', label: 'col.dealValue' },
  { key: 'realtorName', label: 'col.realtor' },
];

const CLIENT_COLUMN_KEYS = CLIENT_COLUMNS.map(column => column.key) as ClientColumnKey[];
const CLIENT_COLUMN_STORAGE_KEY = 'clients-table-visible-columns';

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
  readonly clientColumns = CLIENT_COLUMNS;
  readonly visibleColumnKeys = signal<ClientColumnKey[]>(
    loadVisibleColumnKeys(CLIENT_COLUMN_STORAGE_KEY, CLIENT_COLUMN_KEYS)
  );
  readonly sortState = signal<SortState<ClientSortKey>>({
    key: this.visibleColumnKeys().includes('name') ? 'name' : (this.visibleColumnKeys()[0] ?? 'name'),
    direction: 'asc',
  });
  readonly statusFilters = signal<ClientStatus[]>([]);
  readonly propertyTypeFilters = signal<PropertyType[]>([]);
  readonly realtorFilters = signal<string[]>([]);
  readonly purchaseDateRange = signal<DateRangeFilter>({ from: '', to: '' });
  readonly dealValueRange = signal<NumberRangeFilter>({ min: '', max: '' });

  readonly visibleClientColumns = computed(() =>
    this.clientColumns.filter(column => this.visibleColumnKeys().includes(column.key))
  );

  readonly detailColspan = computed(() => this.visibleClientColumns().length + 1);
  readonly hasCustomColumnVisibility = computed(() =>
    !usesDefaultVisibleColumns(this.visibleColumnKeys(), CLIENT_COLUMN_KEYS)
  );

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
    { key: 'commissionType', label: 'field.commissionType', type: 'badge', options: ['percent', 'fixed'], translatePrefix: 'commissionType.' },
    { key: 'commissionValue', label: 'field.commissionValue', type: 'commission' },
    { key: 'notes', label: 'field.notes', type: 'notes' },
  ];

  formatDealValue(value: number): string {
    return '€' + value.toLocaleString('en-US');
  }

  exportClientSummary(event: Event, client: Client) {
    event.stopPropagation();

    openPrintableDocument({
      title: `${this.ts.t('pdf.clientSummary')} - ${client.name}`,
      subtitle: [client.buildingName, client.apartmentNumber ? `${this.ts.t('col.unit')} ${client.apartmentNumber}` : '']
        .filter(Boolean)
        .join(' / '),
      meta: [
        {
          label: this.ts.t('pdf.generatedOn'),
          value: this.formatDateTime(new Date().toISOString()),
        },
      ],
      sections: [
        {
          title: this.ts.t('pdf.sectionContact'),
          fields: [
            { label: this.ts.t('field.fullName'), value: client.name || '-' },
            { label: this.ts.t('field.phone'), value: client.phone || '-' },
            { label: this.ts.t('field.email'), value: client.email || '-' },
          ],
        },
        {
          title: this.ts.t('form.sectionProperty'),
          fields: [
            { label: this.ts.t('field.building'), value: client.buildingName || '-' },
            { label: this.ts.t('field.apartmentNumber'), value: client.apartmentNumber || '-' },
            { label: this.ts.t('field.propertyType'), value: this.ts.t(`proptype.${client.propertyType}`) },
            { label: this.ts.t('field.status'), value: this.ts.t(`status.${client.status}`) },
            { label: this.ts.t('field.purchaseDate'), value: this.formatDate(client.purchaseDate) },
            { label: this.ts.t('field.dealValue'), value: this.formatDealValue(client.dealValue) },
          ],
        },
        {
          title: this.ts.t('form.sectionRealtor'),
          fields: [
            { label: this.ts.t('field.realtorName'), value: client.realtorName || '-' },
            { label: this.ts.t('field.realtorAgency'), value: client.realtorAgency || '-' },
            {
              label: this.ts.t('field.commissionValue'),
              value: formatCommissionValue(client.commissionType, client.commissionValue),
            },
            {
              label: this.ts.t('dash.earnings'),
              value: this.formatDealValue(getCommissionAmount(client)),
            },
          ],
        },
        {
          title: this.ts.t('field.notes'),
          notes: client.notes.length > 0
            ? client.notes.map(note => ({
                meta: this.formatDateTime(note.createdAt),
                body: note.body,
              }))
            : [{ body: this.ts.t('pdf.noNotes') }],
        },
      ],
    });
  }

  toggleSort(key: ClientSortKey) {
    this.sortState.update(current => nextSortState(current, key));
  }

  toggleColumnVisibility(key: ClientColumnKey) {
    const next = toggleVisibleColumnKey(this.visibleColumnKeys(), key, CLIENT_COLUMN_KEYS);
    this.visibleColumnKeys.set(next);
    persistVisibleColumnKeys(CLIENT_COLUMN_STORAGE_KEY, next);

    if (!next.includes(this.sortState().key)) {
      this.sortState.set({ key: next[0] ?? 'name', direction: 'asc' });
    }
  }

  resetColumnVisibility() {
    const next = [...CLIENT_COLUMN_KEYS];
    this.visibleColumnKeys.set(next);
    persistVisibleColumnKeys(CLIENT_COLUMN_STORAGE_KEY, next);
  }

  canToggleColumn(key: ClientColumnKey): boolean {
    return !this.visibleColumnKeys().includes(key) || this.visibleColumnKeys().length > 1;
  }

  isColumnVisible(key: ClientColumnKey): boolean {
    return this.visibleColumnKeys().includes(key);
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

  private formatDate(value: string): string {
    if (!value) return '-';

    return new Date(value).toLocaleDateString(this.locale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private formatDateTime(value: string): string {
    return new Date(value).toLocaleString(this.locale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private locale(): string {
    return this.ts.lang() === 'ru' ? 'ru-RU' : 'en-GB';
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
