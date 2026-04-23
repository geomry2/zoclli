import { ContactNote } from './contact-note.model';
import { EmailConfirmationStatus } from './email-confirmation.model';

export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land' | 'villa';
export type ClientStatus = 'active' | 'inactive' | 'closed';
export type CommissionType = 'percent' | 'fixed';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  emailConfirmationStatus: EmailConfirmationStatus;
  buildingName: string;
  apartmentNumber: string;
  propertyType: PropertyType;
  status: ClientStatus;
  purchaseDate: string;
  dealValue: number;
  realtorName: string;
  realtorAgency: string;
  commissionType: CommissionType;
  commissionValue: number;
  notes: ContactNote[];
}
