import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ClientService } from '../../services/client.service';
import { BuildingService } from '../../services/building.service';
import { Client } from '../../models/client.model';
import { Unit } from '../../models/unit.model';
import { UnitService } from '../../services/unit.service';

interface PropertyEntry {
  id: string;
  apartmentNumber: string;
  propertyType: string;
  status: string;
  dealValue: number;
  realtorName: string;
  phone?: string;
  clientName?: string;
  isStandalone: boolean;
}

interface PropertyRow {
  building: string;
  units: string[];
  clients: Client[];
  entries: PropertyEntry[];
  totalValue: number;
  statusCounts: Record<string, number>;
}

@Component({
  selector: 'app-property-catalogue',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './property-catalogue.html',
  styleUrl: './property-catalogue.scss'
})
export class PropertyCatalogue {
  readonly ts = inject(TranslationService);
  private readonly clientService = inject(ClientService);
  private readonly buildingService = inject(BuildingService);
  private readonly unitService = inject(UnitService);

  readonly addUnitRequest = output<string>();

  readonly expandedBuilding = signal<string | null>(null);
  readonly showNewPropertyForm = signal(false);
  readonly newPropertyName = signal('');
  readonly creatingProperty = signal(false);

  readonly properties = computed((): PropertyRow[] => {
    const clientMap = new Map<string, Client[]>();
    const unitMap = new Map<string, Unit[]>();

    for (const c of this.clientService.clients()) {
      const key = c.buildingName || '(No building)';
      if (!clientMap.has(key)) clientMap.set(key, []);
      clientMap.get(key)!.push(c);
    }
    for (const unit of this.unitService.units()) {
      const key = unit.buildingName || '(No building)';
      if (!unitMap.has(key)) unitMap.set(key, []);
      unitMap.get(key)!.push(unit);
    }

    for (const b of this.buildingService.buildings()) {
      if (!clientMap.has(b)) clientMap.set(b, []);
      if (!unitMap.has(b)) unitMap.set(b, []);
    }

    const buildings = new Set([...clientMap.keys(), ...unitMap.keys()]);
    return [...buildings]
      .map(building => {
        const clients = clientMap.get(building) ?? [];
        const standaloneUnits = unitMap.get(building) ?? [];
        const entryMap = new Map<string, PropertyEntry>();

        for (const unit of standaloneUnits) {
          const key = unit.apartmentNumber || `standalone:${unit.id}`;
          entryMap.set(key, {
            id: `unit:${unit.id}`,
            apartmentNumber: unit.apartmentNumber,
            propertyType: unit.propertyType,
            status: unit.status,
            dealValue: unit.dealValue ?? 0,
            realtorName: unit.realtorName,
            isStandalone: true,
          });
        }

        for (const client of clients) {
          const key = client.apartmentNumber || `client:${client.id}`;
          const existing = entryMap.get(key);
          entryMap.set(key, {
            id: existing?.id ?? `client:${client.id}`,
            apartmentNumber: client.apartmentNumber,
            propertyType: client.propertyType || existing?.propertyType || 'apartment',
            status: client.status || existing?.status || 'active',
            dealValue: client.dealValue ?? existing?.dealValue ?? 0,
            realtorName: client.realtorName || existing?.realtorName || '',
            phone: client.phone,
            clientName: client.name,
            isStandalone: false,
          });
        }

        const entries = [...entryMap.values()].sort((a, b) =>
          a.apartmentNumber.localeCompare(b.apartmentNumber, undefined, { numeric: true, sensitivity: 'base' })
        );

        const statusCounts = entries.reduce((acc, entry) => {
          acc[entry.status] = (acc[entry.status] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const units = [...new Set(entries.map(entry => entry.apartmentNumber).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );

        return {
          building,
          units,
          clients,
          entries,
          totalValue: entries.reduce((sum, entry) => sum + (entry.dealValue ?? 0), 0),
          statusCounts,
        };
      })
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
    return '€' + value.toLocaleString('en-US');
  }
}
