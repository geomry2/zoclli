import { Component, computed, inject, input, signal } from '@angular/core';
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

  private readonly clientService = inject(ClientService);
  readonly expandedRowId = signal<string | null>(null);

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
    this.expandedRowId.set(this.expandedRowId() === id ? null : id);
  }

  readonly clientFields: FieldDefinition[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'buildingName', label: 'Building' },
    { key: 'apartmentNumber', label: 'Apartment / Unit' },
    { key: 'street', label: 'Street' },
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
