import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { Client } from '../../models/client.model';
import { RowDetail, FieldDefinition } from '../row-detail/row-detail';

@Component({
  selector: 'app-clients-table',
  standalone: true,
  imports: [RowDetail],
  templateUrl: './clients-table.html',
  styleUrl: './clients-table.scss'
})
export class ClientsTable {
  readonly searchQuery = input<string>('');
  readonly editRequest = output<Client>();

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

  async confirmDelete(id: string) {
    const { error } = await this.clientService.remove(id);
    if (error) { this.deleteError.set(error); return; }
    this.deleteError.set(null);
    this.deletingId.set(null);
    if (this.expandedRowId() === id) this.expandedRowId.set(null);
  }

  readonly clientFields: FieldDefinition[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'buildingName', label: 'Building / Project' },
    { key: 'apartmentNumber', label: 'Apartment / Unit' },
    { key: 'propertyType', label: 'Property Type', type: 'badge' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
    { key: 'dealValue', label: 'Deal Value', type: 'currency' },
    { key: 'realtorName', label: 'Realtor' },
    { key: 'realtorAgency', label: 'Agency' },
    { key: 'notes', label: 'Notes' },
  ];

  formatDealValue(value: number): string {
    return '€' + value.toLocaleString('en-EU');
  }

  asRecord(client: Client): Record<string, unknown> {
    return client as unknown as Record<string, unknown>;
  }
}
