import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ClientService } from '../../services/client.service';
import { BuildingService } from '../../services/building.service';
import { Client } from '../../models/client.model';
import { Unit } from '../../models/unit.model';
import { UnitService } from '../../services/unit.service';
import { openPrintableDocument } from '../../utils/pdf.utils';

interface PropertyEntry {
  id: string;
  unitId?: string;
  apartmentNumber: string;
  propertyType: string;
  status: string;
  dealValue: number;
  realtorName: string;
  realtorAgency?: string;
  purchaseDate?: string;
  notes?: string;
  phone?: string;
  clientName?: string;
  isStandalone: boolean;
}

interface PropertyRow {
  building: string;
  units: string[];
  clients: Client[];
  standaloneUnitCount: number;
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
  readonly editUnitRequest = output<Unit>();
  readonly createTaskRequest = output<{ type: 'property'; id: string; sourceLabel: string }>();

  readonly expandedBuilding = signal<string | null>(null);
  readonly showNewPropertyForm = signal(false);
  readonly newPropertyName = signal('');
  readonly creatingProperty = signal(false);
  readonly quickEditStatus = signal<Record<string, string>>({});
  readonly quickEditValue = signal<Record<string, number>>({});
  readonly quickSavingId = signal<string | null>(null);
  readonly deletePendingId = signal<string | null>(null);
  readonly deletePropertyPending = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionErrorId = signal<string | null>(null);
  readonly propertyActionError = signal<string | null>(null);
  readonly propertyActionErrorBuilding = signal<string | null>(null);

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
            unitId: unit.id,
            apartmentNumber: unit.apartmentNumber,
            propertyType: unit.propertyType,
            status: unit.status,
            dealValue: unit.dealValue ?? 0,
            realtorName: unit.realtorName,
            realtorAgency: unit.realtorAgency,
            purchaseDate: unit.purchaseDate,
            notes: unit.notes,
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
          standaloneUnitCount: standaloneUnits.length,
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

  toggleBuilding(name: string) {
    this.expandedBuilding.set(this.expandedBuilding() === name ? null : name);
  }

  requestAddUnit(event: Event, buildingName: string) {
    event.stopPropagation();
    this.addUnitRequest.emit(buildingName);
  }

  requestPropertyTask(event: Event, prop: PropertyRow) {
    event.stopPropagation();
    this.createTaskRequest.emit({ type: 'property', id: prop.building, sourceLabel: prop.building });
  }

  exportPropertySheet(event: Event, prop: PropertyRow) {
    event.stopPropagation();

    openPrintableDocument({
      title: `${this.ts.t('pdf.propertySheet')} - ${prop.building}`,
      subtitle: this.ts.t('pdf.propertySubtitle'),
      meta: [
        {
          label: this.ts.t('pdf.generatedOn'),
          value: this.formatDateTime(new Date().toISOString()),
        },
      ],
      sections: [
        {
          title: this.ts.t('pdf.sectionOverview'),
          fields: [
            { label: this.ts.t('form.building'), value: prop.building || '-' },
            { label: this.ts.t('pdf.totalUnits'), value: String(prop.units.length) },
            { label: this.ts.t('pdf.clientCount'), value: String(prop.clients.length) },
            { label: this.ts.t('pdf.standaloneUnits'), value: String(prop.standaloneUnitCount) },
            { label: this.ts.t('pdf.totalValue'), value: this.formatPdfCurrency(prop.totalValue) },
          ],
        },
        {
          title: this.ts.t('pdf.sectionUnits'),
          table: {
            headers: [
              this.ts.t('col.unit'),
              this.ts.t('col.client'),
              this.ts.t('col.type'),
              this.ts.t('col.status'),
              this.ts.t('col.dealValue'),
              this.ts.t('col.realtor'),
            ],
            rows: prop.entries.map(entry => [
              entry.apartmentNumber || '-',
              [entry.clientName || this.ts.t('prop.unassigned'), entry.phone].filter(Boolean).join(' / '),
              this.ts.t(`proptype.${entry.propertyType}`),
              this.ts.t(`status.${entry.status}`),
              entry.dealValue ? this.formatPdfCurrency(entry.dealValue) : '-',
              [entry.realtorName, entry.realtorAgency].filter(Boolean).join(' / ') || '-',
            ]),
          },
        },
        ...(prop.entries.some(entry => Boolean(entry.notes?.trim()))
          ? [{
              title: this.ts.t('field.notes'),
              notes: prop.entries
                .filter(entry => Boolean(entry.notes?.trim()))
                .map(entry => ({
                  meta: entry.apartmentNumber ? `${this.ts.t('col.unit')} ${entry.apartmentNumber}` : prop.building,
                  body: entry.notes!.trim(),
                })),
            }]
          : []),
      ],
    });
  }

  requestEditUnit(event: Event, entry: PropertyEntry) {
    event.stopPropagation();
    const unit = this.findUnit(entry.unitId);
    if (!unit) return;
    this.editUnitRequest.emit(unit);
  }

  startDelete(event: Event, entry: PropertyEntry) {
    event.stopPropagation();
    if (!entry.unitId) return;
    this.actionError.set(null);
    this.actionErrorId.set(null);
    this.deletePendingId.set(entry.unitId);
  }

  cancelDelete(event?: Event) {
    event?.stopPropagation();
    this.deletePendingId.set(null);
    this.actionError.set(null);
    this.actionErrorId.set(null);
  }

  startDeleteProperty(event: Event, prop: PropertyRow) {
    event.stopPropagation();
    this.propertyActionError.set(null);
    this.propertyActionErrorBuilding.set(null);
    this.deletePropertyPending.set(prop.building);
  }

  cancelDeleteProperty(event?: Event) {
    event?.stopPropagation();
    this.deletePropertyPending.set(null);
    this.propertyActionError.set(null);
    this.propertyActionErrorBuilding.set(null);
  }

  setQuickStatus(entry: PropertyEntry, value: string) {
    if (!entry.unitId) return;
    this.quickEditStatus.update(state => ({ ...state, [entry.unitId!]: value }));
  }

  setQuickValue(entry: PropertyEntry, value: string | number) {
    if (!entry.unitId) return;
    const parsed = Number(value);
    this.quickEditValue.update(state => ({ ...state, [entry.unitId!]: Number.isFinite(parsed) ? parsed : 0 }));
  }

  currentStatus(entry: PropertyEntry): string {
    return entry.unitId ? (this.quickEditStatus()[entry.unitId] ?? entry.status) : entry.status;
  }

  currentValue(entry: PropertyEntry): number {
    return entry.unitId ? (this.quickEditValue()[entry.unitId] ?? (entry.dealValue ?? 0)) : (entry.dealValue ?? 0);
  }

  hasQuickChanges(entry: PropertyEntry): boolean {
    return this.currentStatus(entry) !== entry.status || this.currentValue(entry) !== (entry.dealValue ?? 0);
  }

  async quickSave(event: Event, entry: PropertyEntry) {
    event.stopPropagation();
    const unit = this.findUnit(entry.unitId);
    if (!unit) return;
    this.quickSavingId.set(unit.id);
    this.actionError.set(null);
    this.actionErrorId.set(null);
    const { error } = await this.unitService.update({
      ...unit,
      status: this.currentStatus(entry) as Unit['status'],
      dealValue: this.currentValue(entry),
    });
    this.quickSavingId.set(null);
    if (error) {
      this.actionError.set(error);
      this.actionErrorId.set(unit.id);
      return;
    }
    this.quickEditStatus.update(state => {
      const next = { ...state };
      delete next[unit.id];
      return next;
    });
    this.quickEditValue.update(state => {
      const next = { ...state };
      delete next[unit.id];
      return next;
    });
  }

  async confirmDelete(event: Event, entry: PropertyEntry) {
    event.stopPropagation();
    if (!entry.unitId) return;
    const { error } = await this.unitService.remove(entry.unitId);
    if (error) {
      this.actionError.set(error);
      this.actionErrorId.set(entry.unitId);
      return;
    }
    this.cancelDelete();
  }

  errorFor(entry: PropertyEntry): string | null {
    return this.actionErrorId() === entry.unitId ? this.actionError() : null;
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

  async confirmDeleteProperty(event: Event, prop: PropertyRow) {
    event.stopPropagation();

    if (prop.clients.length) {
      this.propertyActionError.set(this.ts.t('prop.deleteBlockedClients', { name: prop.clients[0].name }));
      this.propertyActionErrorBuilding.set(prop.building);
      return;
    }

    if (prop.standaloneUnitCount > 0) {
      this.propertyActionError.set(this.ts.t('prop.deleteBlockedUnits'));
      this.propertyActionErrorBuilding.set(prop.building);
      return;
    }

    const { error } = await this.buildingService.remove(prop.building);
    if (error) {
      this.propertyActionError.set(error);
      this.propertyActionErrorBuilding.set(prop.building);
      return;
    }

    if (this.expandedBuilding() === prop.building) {
      this.expandedBuilding.set(null);
    }
    this.cancelDeleteProperty();
  }

  formatCurrency(value: number): string {
    if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(2) + 'M';
    if (value >= 1_000) return '€' + (value / 1_000).toFixed(0) + 'K';
    return '€' + value.toLocaleString('en-US');
  }

  private formatPdfCurrency(value: number): string {
    return '€' + value.toLocaleString('en-US');
  }

  private formatDateTime(value: string): string {
    return new Date(value).toLocaleString(this.ts.lang() === 'ru' ? 'ru-RU' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private findUnit(id?: string): Unit | undefined {
    if (!id) return undefined;
    return this.unitService.units().find(unit => unit.id === id);
  }
}
