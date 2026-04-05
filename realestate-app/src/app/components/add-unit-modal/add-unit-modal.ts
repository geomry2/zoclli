import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ClientService } from '../../services/client.service';
import { AgencyService } from '../../services/agency.service';
import { BuildingService } from '../../services/building.service';
import { Client, PropertyType, ClientStatus } from '../../models/client.model';

type FieldMode = 'select' | 'new';

@Component({
  selector: 'app-add-unit-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './add-unit-modal.html',
  styleUrl: './add-unit-modal.scss',
})
export class AddUnitModal {
  readonly buildingName = input.required<string>();
  readonly closed = output<void>();

  private readonly clientService = inject(ClientService);
  private readonly agencyService = inject(AgencyService);
  private readonly buildingService = inject(BuildingService);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly agencyMode = signal<FieldMode>('select');

  unit: Omit<Client, 'id'> = this.emptyUnit();

  get allAgencies(): string[] {
    const fromClients = this.clientService.clients().map(c => c.realtorAgency).filter(Boolean);
    const fromTable = this.agencyService.agencies();
    return [...new Set([...fromTable, ...fromClients])].sort();
  }

  get usedApartmentNumbers(): string[] {
    const nums = this.clientService.clients()
      .filter(c => c.buildingName === this.buildingName())
      .map(c => c.apartmentNumber)
      .filter(Boolean);
    return [...new Set(nums)].sort();
  }

  get selectedAgency(): string {
    return this.agencyMode() === 'new' ? '__new__' : (this.unit.realtorAgency || '');
  }
  set selectedAgency(value: string) {
    if (value === '__new__') {
      this.agencyMode.set('new');
      this.unit.realtorAgency = '';
    } else {
      this.agencyMode.set('select');
      this.unit.realtorAgency = value;
    }
  }

  private emptyUnit(): Omit<Client, 'id'> {
    return {
      name: '', phone: '', email: '',
      buildingName: '',
      apartmentNumber: '',
      propertyType: 'apartment',
      status: 'active',
      purchaseDate: '',
      dealValue: 0,
      realtorName: '', realtorAgency: '',
      notes: '',
    };
  }

  async save() {
    if (!this.unit.name.trim()) { this.saveError.set('Client name is required.'); return; }
    this.saving.set(true);
    this.saveError.set(null);
    const payload = { ...this.unit, buildingName: this.buildingName() };
    await this.buildingService.ensureExists(this.buildingName());
    await this.agencyService.ensureExists(this.unit.realtorAgency);
    const { error } = await this.clientService.add(payload);
    this.saving.set(false);
    if (error) { this.saveError.set(error); } else { this.closed.emit(); }
  }

  close() { this.closed.emit(); }

  readonly propertyTypes: PropertyType[] = ['apartment', 'house', 'villa', 'commercial', 'land'];
  readonly clientStatuses: ClientStatus[] = ['active', 'inactive', 'closed'];
}
