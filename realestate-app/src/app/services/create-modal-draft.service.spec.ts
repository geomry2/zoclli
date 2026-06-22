import { CreateModalDraftService } from './create-modal-draft.service';
import type { Client } from '../models/client.model';
import type { Lead } from '../models/lead.model';

function buildClient(): Omit<Client, 'id'> {
  return {
    name: 'Client',
    phone: '+1 555 0100',
    email: 'client@example.com',
    emailConfirmationStatus: 'not_sent',
    buildingName: 'Azure Bay',
    apartmentNumber: '1204',
    propertyType: 'apartment',
    status: 'active',
    purchaseDate: '',
    dealValue: 0,
    realtorName: '',
    realtorAgency: '',
    commissionType: 'percent',
    commissionValue: 0,
    notes: [],
  };
}

function buildLead(): Omit<Lead, 'id'> {
  return {
    name: 'Lead',
    phone: '+1 555 0200',
    email: 'lead@example.com',
    emailConfirmationStatus: 'not_sent',
    interestedIn: 'Azure Bay',
    realtorName: '',
    realtorAgency: '',
    firstInteractionDate: '',
    status: 'new',
    budgetMin: 100000,
    budgetMax: 200000,
    followUpDate: '',
    notes: [],
  };
}

describe('CreateModalDraftService', () => {
  it('stores lead and client drafts independently in memory', () => {
    const service = new CreateModalDraftService();
    const client = buildClient();
    const lead = buildLead();

    service.setClientDraft(client);
    service.setLeadDraft(lead);

    client.name = 'Changed client';
    lead.name = 'Changed lead';

    expect(service.clientDraft()?.name).toBe('Client');
    expect(service.leadDraft()?.name).toBe('Lead');

    service.clearClientDraft();
    service.clearLeadDraft();

    expect(service.clientDraft()).toBeNull();
    expect(service.leadDraft()).toBeNull();
  });
});
