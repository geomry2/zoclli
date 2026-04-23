import { ContactNote } from './contact-note.model';
import { EmailConfirmationStatus } from './email-confirmation.model';

export type LeadStatus = 'new' | 'contacted' | 'negotiating' | 'showing' | 'deposit' | 'lost';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  emailConfirmationStatus: EmailConfirmationStatus;
  interestedIn: string;
  realtorName: string;
  realtorAgency: string;
  firstInteractionDate: string;
  status: LeadStatus;
  budgetMin: number;
  budgetMax: number;
  followUpDate: string;
  notes: ContactNote[];
}
