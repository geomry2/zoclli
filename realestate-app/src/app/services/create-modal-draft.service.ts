import { Injectable, signal } from '@angular/core';
import { Client } from '../models/client.model';
import { Lead } from '../models/lead.model';

type ClientDraft = Omit<Client, 'id'>;
type LeadDraft = Omit<Lead, 'id'>;

@Injectable({ providedIn: 'root' })
export class CreateModalDraftService {
  readonly clientDraft = signal<ClientDraft | null>(null);
  readonly leadDraft = signal<LeadDraft | null>(null);

  setClientDraft(draft: ClientDraft) {
    this.clientDraft.set(structuredClone(draft));
  }

  setLeadDraft(draft: LeadDraft) {
    this.leadDraft.set(structuredClone(draft));
  }

  clearClientDraft() {
    this.clientDraft.set(null);
  }

  clearLeadDraft() {
    this.leadDraft.set(null);
  }
}
