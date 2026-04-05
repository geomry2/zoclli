import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { BuildingService } from '../../services/building.service';
import { AgencyService } from '../../services/agency.service';
import { Client, PropertyType, ClientStatus } from '../../models/client.model';
import { Lead, LeadStatus } from '../../models/lead.model';

type Tab = 'clients' | 'leads';
type FieldMode = 'select' | 'new';

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
  readonly convertLead = input<Lead | null>(null);
  readonly prefillBuilding = input<string | null>(null);
  readonly closed = output<void>();

  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);
  private readonly buildingService = inject(BuildingService);
  private readonly agencyService = inject(AgencyService);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly buildingMode = signal<FieldMode>('select');
  readonly agencyMode = signal<FieldMode>('select');

  client: Omit<Client, 'id'> = this.emptyClient();
  lead: Omit<Lead, 'id'> = this.emptyLead();

  get isEdit(): boolean {
    return !!(this.editClient() || this.editLead());
  }

  get isConvert(): boolean {
    return !!this.convertLead();
  }

  get allBuildings(): string[] {
    const fromClients = this.clientService.clients().map(c => c.buildingName).filter(Boolean);
    const fromTable = this.buildingService.buildings();
    return [...new Set([...fromTable, ...fromClients])].sort();
  }

  get allAgencies(): string[] {
    const fromClients = this.clientService.clients().map(c => c.realtorAgency).filter(Boolean);
    const fromLeads = this.leadService.leads().map(l => l.realtorAgency).filter(Boolean);
    const fromTable = this.agencyService.agencies();
    return [...new Set([...fromTable, ...fromClients, ...fromLeads])].sort();
  }

  get usedApartmentNumbers(): string[] {
    const nums = this.clientService.clients().map(c => c.apartmentNumber).filter(Boolean);
    return [...new Set(nums)].sort();
  }

  // ----- Building select/new toggle -----
  get selectedBuilding(): string {
    return this.buildingMode() === 'new' ? '__new__' : (this.client.buildingName || '');
  }
  set selectedBuilding(value: string) {
    if (value === '__new__') {
      this.buildingMode.set('new');
      this.client.buildingName = '';
    } else {
      this.buildingMode.set('select');
      this.client.buildingName = value;
    }
  }

  // ----- Agency select/new toggle (client) -----
  get selectedClientAgency(): string {
    return this.agencyMode() === 'new' ? '__new__' : (this.client.realtorAgency || '');
  }
  set selectedClientAgency(value: string) {
    if (value === '__new__') {
      this.agencyMode.set('new');
      this.client.realtorAgency = '';
    } else {
      this.agencyMode.set('select');
      this.client.realtorAgency = value;
    }
  }

  // ----- Agency select/new toggle (lead) -----
  get selectedLeadAgency(): string {
    return this.agencyMode() === 'new' ? '__new__' : (this.lead.realtorAgency || '');
  }
  set selectedLeadAgency(value: string) {
    if (value === '__new__') {
      this.agencyMode.set('new');
      this.lead.realtorAgency = '';
    } else {
      this.agencyMode.set('select');
      this.lead.realtorAgency = value;
    }
  }

  ngOnInit() {
    const ec = this.editClient();
    if (ec) {
      const { id, ...rest } = ec;
      this.client = { ...rest };
      if (ec.buildingName) this.buildingMode.set('select');
      if (ec.realtorAgency) this.agencyMode.set('select');
    }
    const el = this.editLead();
    if (el) {
      const { id, ...rest } = el;
      this.lead = { ...rest };
      if (el.realtorAgency) this.agencyMode.set('select');
    }
    const cl = this.convertLead();
    if (cl) {
      this.client.name = cl.name;
      this.client.phone = cl.phone;
      this.client.email = cl.email;
      this.client.realtorName = cl.realtorName;
      this.client.realtorAgency = cl.realtorAgency;
      this.client.dealValue = cl.budgetMax || cl.budgetMin || 0;
      this.client.notes = cl.notes;
      if (cl.realtorAgency) this.agencyMode.set('select');
    }
    const pb = this.prefillBuilding();
    if (pb) {
      this.client.buildingName = pb;
      this.buildingMode.set('select');
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
      budgetMin: 0, budgetMax: 0, followUpDate: '', notes: '',
    };
  }

  async save() {
    this.saving.set(true);
    this.saveError.set(null);
    let result: { error: string | null };

    if (this.tab() === 'clients') {
      const ec = this.editClient();
      const normalizedClient = this.normalizeClient(this.client);
      const clientValidationError = this.validateClient(normalizedClient, ec?.id);
      if (clientValidationError) {
        this.saving.set(false);
        this.saveError.set(clientValidationError);
        return;
      }

      this.client = normalizedClient;
      await this.buildingService.ensureExists(this.client.buildingName);
      await this.agencyService.ensureExists(this.client.realtorAgency);
      result = ec
        ? await this.clientService.update({ ...this.client, id: ec.id })
        : await this.clientService.add(this.client, this.isConvert ? 'converted' : 'created');
    } else {
      const el = this.editLead();
      const normalizedLead = this.normalizeLead(this.lead);
      const leadValidationError = this.validateLead(normalizedLead, el?.id);
      if (leadValidationError) {
        this.saving.set(false);
        this.saveError.set(leadValidationError);
        return;
      }

      this.lead = normalizedLead;
      await this.agencyService.ensureExists(this.lead.realtorAgency);
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

  private normalizeClient(client: Omit<Client, 'id'>): Omit<Client, 'id'> {
    return {
      ...client,
      name: this.normalizeName(client.name),
      phone: this.normalizeLooseText(client.phone),
      email: this.normalizeEmail(client.email),
      buildingName: this.normalizeLooseText(client.buildingName),
      apartmentNumber: this.normalizeLooseText(client.apartmentNumber),
      realtorName: this.normalizeName(client.realtorName),
      realtorAgency: this.normalizeAgency(client.realtorAgency),
      notes: this.normalizeLooseText(client.notes),
    };
  }

  private normalizeLead(lead: Omit<Lead, 'id'>): Omit<Lead, 'id'> {
    return {
      ...lead,
      name: this.normalizeName(lead.name),
      phone: this.normalizeLooseText(lead.phone),
      email: this.normalizeEmail(lead.email),
      interestedIn: this.normalizeLooseText(lead.interestedIn),
      realtorName: this.normalizeName(lead.realtorName),
      realtorAgency: this.normalizeAgency(lead.realtorAgency),
      notes: this.normalizeLooseText(lead.notes),
    };
  }

  private validateClient(client: Omit<Client, 'id'>, editingId?: string): string | null {
    const email = this.normalizeEmail(client.email);
    const phone = this.normalizePhoneForCompare(client.phone);

    const duplicate = this.clientService.clients().find(existing => {
      if (editingId && existing.id === editingId) return false;
      const existingEmail = this.normalizeEmail(existing.email);
      const existingPhone = this.normalizePhoneForCompare(existing.phone);
      return (email && existingEmail === email) || (phone && existingPhone === phone);
    });

    if (duplicate) {
      return `Potential duplicate client found: ${duplicate.name}. Matching phone/email already exists.`;
    }

    return null;
  }

  private validateLead(lead: Omit<Lead, 'id'>, editingId?: string): string | null {
    if (lead.status !== 'lost' && !lead.followUpDate) {
      return 'Follow-up date is required for leads that are not marked as lost.';
    }

    const email = this.normalizeEmail(lead.email);
    const phone = this.normalizePhoneForCompare(lead.phone);
    const duplicate = this.leadService.leads().find(existing => {
      if (editingId && existing.id === editingId) return false;
      const existingEmail = this.normalizeEmail(existing.email);
      const existingPhone = this.normalizePhoneForCompare(existing.phone);
      return (email && existingEmail === email) || (phone && existingPhone === phone);
    });

    if (duplicate) {
      return `Potential duplicate lead found: ${duplicate.name}. Matching phone/email already exists.`;
    }

    return null;
  }

  private normalizeLooseText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeEmail(value: string): string {
    return this.normalizeLooseText(value).toLowerCase();
  }

  private normalizeName(value: string): string {
    return this.normalizeLooseText(value)
      .split(' ')
      .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part)
      .join(' ');
  }

  private normalizeAgency(value: string): string {
    return this.normalizeName(value);
  }

  private normalizePhoneForCompare(value: string): string {
    return value.replace(/[^\d+]/g, '');
  }
}
