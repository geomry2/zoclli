import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
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
export class CreateModal {
  readonly tab = input<Tab>('clients');
  readonly closed = output<void>();

  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  client: Omit<Client, 'id'> = this.emptyClient();
  lead: Omit<Lead, 'id'> = this.emptyLead();

  private emptyClient(): Omit<Client, 'id'> {
    return {
      name: '', phone: '', email: '',
      buildingName: '', apartmentNumber: '', street: '',
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

    const result = this.tab() === 'clients'
      ? await this.clientService.add(this.client)
      : await this.leadService.add(this.lead);

    this.saving.set(false);

    if (result.error) {
      this.saveError.set(result.error);
    } else {
      this.closed.emit();
    }
  }

  close() {
    this.closed.emit();
  }

  readonly propertyTypes: PropertyType[] = ['apartment', 'house', 'commercial', 'land'];
  readonly clientStatuses: ClientStatus[] = ['active', 'inactive', 'closed'];
  readonly leadStatuses: LeadStatus[] = ['new', 'contacted', 'negotiating', 'lost'];
}
