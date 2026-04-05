import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ClientService } from '../../services/client.service';
import { AgencyService } from '../../services/agency.service';
import { BuildingService } from '../../services/building.service';
import { PropertyType, ClientStatus } from '../../models/client.model';
import { Unit } from '../../models/unit.model';
import { UnitService } from '../../services/unit.service';

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
  readonly editUnit = input<Unit | null>(null);
  readonly closed = output<void>();

  private readonly clientService = inject(ClientService);
  private readonly unitService = inject(UnitService);
  private readonly agencyService = inject(AgencyService);
  private readonly buildingService = inject(BuildingService);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly agencyMode = signal<FieldMode>('select');

  unit: Omit<Unit, 'id'> = this.emptyUnit();

  constructor() {
    effect(() => {
      const editUnit = this.editUnit();
      if (editUnit) {
        this.unit = {
          buildingName: editUnit.buildingName,
          apartmentNumber: editUnit.apartmentNumber,
          propertyType: editUnit.propertyType,
          status: editUnit.status,
          purchaseDate: editUnit.purchaseDate,
          dealValue: editUnit.dealValue,
          realtorName: editUnit.realtorName,
          realtorAgency: editUnit.realtorAgency,
          notes: editUnit.notes,
        };
        this.agencyMode.set(editUnit.realtorAgency ? 'select' : 'select');
        this.saveError.set(null);
        return;
      }

      this.unit = this.emptyUnit();
      this.unit.buildingName = this.buildingName();
      this.agencyMode.set('select');
      this.saveError.set(null);
    });
  }

  get allAgencies(): string[] {
    const fromUnits = this.unitService.units().map(u => u.realtorAgency).filter(Boolean);
    const fromTable = this.agencyService.agencies();
    return [...new Set([...fromTable, ...fromUnits])].sort();
  }

  get usedApartmentNumbers(): string[] {
    const nums = [
      ...this.clientService.clients()
        .filter(client => client.buildingName === this.buildingName())
        .map(client => client.apartmentNumber),
      ...this.unitService.units()
        .filter(unit => unit.buildingName === this.buildingName())
        .map(unit => unit.apartmentNumber),
    ].filter(Boolean);
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

  private emptyUnit(): Omit<Unit, 'id'> {
    return {
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
    const apartmentNumber = this.unit.apartmentNumber.trim();
    if (!apartmentNumber) { this.saveError.set('Unit number is required.'); return; }
    const currentUnit = this.editUnit();
    const apartmentTaken = this.usedApartmentNumbers.includes(apartmentNumber)
      && apartmentNumber !== currentUnit?.apartmentNumber;
    if (apartmentTaken) {
      this.saveError.set(`Unit ${apartmentNumber} already exists in ${this.buildingName()}.`);
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const payload = {
      ...this.unit,
      apartmentNumber,
      buildingName: this.buildingName(),
      realtorName: this.unit.realtorName.trim(),
      realtorAgency: this.unit.realtorAgency.trim(),
      notes: this.unit.notes.trim(),
    };
    await this.buildingService.ensureExists(this.buildingName());
    await this.agencyService.ensureExists(payload.realtorAgency);
    const { error } = currentUnit
      ? await this.unitService.update({ ...currentUnit, ...payload })
      : await this.unitService.add(payload);
    this.saving.set(false);
    if (error) { this.saveError.set(error); } else { this.closed.emit(); }
  }

  close() { this.closed.emit(); }

  readonly propertyTypes: PropertyType[] = ['apartment', 'house', 'villa', 'commercial', 'land'];
  readonly clientStatuses: ClientStatus[] = ['active', 'inactive', 'closed'];
}
