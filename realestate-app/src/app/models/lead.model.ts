export type LeadStatus = 'new' | 'contacted' | 'negotiating' | 'lost';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  interestedIn: string;
  realtorName: string;
  realtorAgency: string;
  firstInteractionDate: string;
  status: LeadStatus;
  budgetMin: number;
  budgetMax: number;
  followUpDate: string;
  notes: string;
}
