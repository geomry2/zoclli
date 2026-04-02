import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { BuildingService } from '../../services/building.service';
import { AgencyService } from '../../services/agency.service';
import { Client, PropertyType, ClientStatus } from '../../models/client.model';
import { Lead, LeadStatus } from '../../models/lead.model';

type Tab = 'clients' | 'leads';

@Component({
  selector: 'app-create-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-modal.html',
  styleUrl: './create-modal.scss',
})
export class CreateModal implements OnInit {
  readonly tab = input<Tab>('clients');
  readonly editClient = input<Client | null>(null);
  readonly editLead = input<Lead | null>(null);
  readonly closed = output<void>();

  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);
  readonly buildingService = inject(BuildingService);
  readonly agencyService = inject(AgencyService);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  client: Omit<Client, 'id'> = this.emptyClient();
  lead: Omit<Lead, 'id'> = this.emptyLead();

  get isEdit(): boolean {
    return !!(this.editClient() || this.editLead());
  }

  get usedApartmentNumbers(): string[] {
    const nums = this.clientService.clients()
      .map(c => c.apartmentNumber).filter(Boolean);
    return [...new Set(nums)].sort();
  }

  get allBuildings(): string[] {
    const fromClients = this.clientService.clients()
      .map(c => c.buildingName).filter(Boolean);
    const fromTable = this.buildingService.buildings();
    return [...new Set([...fromTable, ...fromClients])].sort();
  }

  get allAgencies(): string[] {
    const fromClients = this.clientService.clients()
      .map(c => c.realtorAgency).filter(Boolean);
    const fromLeads = this.leadService.leads()
      .map(l => l.realtorAgency).filter(Boolean);
    const fromTable = this.agencyService.agencies();
    return [...new Set([...fromTable, ...fromClients, ...fromLeads])].sort();
  }

  ngOnInit() {
    const ec = this.editClient();
    if (ec) {
      const { id, ...rest } = ec;
      this.client = { ...rest };
    }
    const el = this.editLead();
    if (el) {
      const { id, ...rest } = el;
      this.lead = { ...rest };
    }
  }

  private emptyClient(): Omit<Client, 'id'> {
    return {
      name: '', phone: '', email: '',
      buildingName: '', apartmentNumber: '',
      propertyType: 'apartment', status: 'active',
      purchaseDate: '', dealValue: 0,
      realtorName: '', realtorAgency: '', notes: '',
    };
  }

  private emptyLead(): Omit<Lead, 'id'> {
    return {
      name: '', phone: '', email: '',
      interestedIn: '', realtorName: '', realtorAgency: '',
      firstInteractionDate: '', status: 'new',
      budgetMin: 0, budgetMax: 0, notes: '',
    };
  }

  async save() {
    this.saving.set(true);
    this.saveError.set(null);

    let result: { error: string | null };

    if (this.tab() === 'clients') {
      await this.buildingService.ensureExists(this.client.buildingName);
      await this.agencyService.ensureExists(this.client.realtorAgency);
      const ec = this.editClient();
      result = ec
        ? await this.clientService.update({ ...this.client, id: ec.id })
        : await this.clientService.add(this.client);
    } else {
      await this.agencyService.ensureExists(this.lead.realtorAgency);
      const el = this.editLead();
      result = el
        ? await this.leadService.update({ ...this.lead, id: el.id })
        : await this.leadService.add(this.lead);
    }

    this.saving.set(false);
    if (result.error) { this.saveError.set(result.error); } else { this.closed.emit(); }
  }

  close() { this.closed.emit(); }

  readonly propertyTypes: PropertyType[] = ['apartment', 'house', 'villa', 'commercial', 'land'];
  readonly clientStatuses: ClientStatus[] = ['active', 'inactive', 'closed'];
  readonly leadStatuses: LeadStatus[] = ['new', 'contacted', 'negotiating', 'lost'];
}
