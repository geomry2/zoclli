import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { BuildingService } from '../../services/building.service';
import { Client } from '../../models/client.model';

interface PropertyRow {
  building: string;
  units: string[];
  clients: Client[];
  totalValue: number;
  statusCounts: Record<string, number>;
}

@Component({
  selector: 'app-property-catalogue',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './property-catalogue.html',
  styleUrl: './property-catalogue.scss'
})
export class PropertyCatalogue {
  private readonly clientService = inject(ClientService);
  private readonly buildingService = inject(BuildingService);

  readonly addUnitRequest = output<string>();

  readonly expandedBuilding = signal<string | null>(null);
  readonly showNewPropertyForm = signal(false);
  readonly newPropertyName = signal('');
  readonly creatingProperty = signal(false);

  readonly properties = computed((): PropertyRow[] => {
    const map = new Map<string, Client[]>();
    for (const c of this.clientService.clients()) {
      const key = c.buildingName || '(No building)';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    // Include buildings from the buildings table even if they have no clients yet
    for (const b of this.buildingService.buildings()) {
      if (!map.has(b)) map.set(b, []);
    }
    return [...map.entries()]
      .map(([building, clients]) => ({
        building,
        units: [...new Set(clients.map(c => c.apartmentNumber).filter(Boolean))].sort(),
        clients,
        totalValue: clients.reduce((s, c) => s + (c.dealValue ?? 0), 0),
        statusCounts: clients.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  });

  readonly totalBuildings = computed(() => this.properties().length);
  readonly totalUnits = computed(() =>
    this.properties().reduce((s, p) => s + p.units.length, 0)
  );
  readonly totalPortfolioValue = computed(() =>
    this.properties().reduce((s, p) => s + p.totalValue, 0)
  );

  toggleBuilding(name: string) {
    this.expandedBuilding.set(this.expandedBuilding() === name ? null : name);
  }

  requestAddUnit(event: Event, buildingName: string) {
    event.stopPropagation();
    this.addUnitRequest.emit(buildingName);
  }

  openNewPropertyForm(event: Event) {
    event.stopPropagation();
    this.newPropertyName.set('');
    this.showNewPropertyForm.set(true);
  }

  cancelNewProperty() {
    this.showNewPropertyForm.set(false);
    this.newPropertyName.set('');
  }

  async createProperty() {
    const name = this.newPropertyName().trim();
    if (!name) return;
    this.creatingProperty.set(true);
    await this.buildingService.ensureExists(name);
    this.creatingProperty.set(false);
    this.showNewPropertyForm.set(false);
    this.newPropertyName.set('');
    this.expandedBuilding.set(name);
  }

  formatCurrency(value: number): string {
    if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(2) + 'M';
    if (value >= 1_000) return '€' + (value / 1_000).toFixed(0) + 'K';
    return '€' + value.toLocaleString('en-EU');
  }
}
