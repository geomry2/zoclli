import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { Client } from '../../models/client.model';
import { RowDetail, FieldDefinition } from '../row-detail/row-detail';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

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

  readonly filteredClients = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.clientService.clients();
    const words = q.split(/\s+/).filter(Boolean);
    return this.clientService.clients().filter((c: Client) => {
      const haystack = Object.values(c).map(val => String(val ?? '')).join(' ').toLowerCase();
      return words.every(word => haystack.includes(word));
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
    { key: 'propertyType', label: 'field.propertyType', type: 'badge', options: ['apartment', 'house', 'commercial', 'land', 'villa'] },
    { key: 'status', label: 'field.status', type: 'badge', options: ['active', 'inactive', 'closed'] },
    { key: 'purchaseDate', label: 'field.purchaseDate', type: 'date' },
    { key: 'dealValue', label: 'field.dealValue', type: 'currency' },
    { key: 'realtorName', label: 'field.realtorName' },
    { key: 'realtorAgency', label: 'field.realtorAgency' },
    { key: 'notes', label: 'field.notes', multiline: true },
  ];

  formatDealValue(value: number): string {
    return '€' + value.toLocaleString('en-US');
  }

  asRecord(client: Client): Record<string, unknown> {
    return client as unknown as Record<string, unknown>;
  }
}
