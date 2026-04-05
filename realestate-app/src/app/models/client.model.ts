import { ContactNote } from './contact-note.model';

export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land' | 'villa';
export type ClientStatus = 'active' | 'inactive' | 'closed';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  buildingName: string;
  apartmentNumber: string;
  propertyType: PropertyType;
  status: ClientStatus;
  purchaseDate: string;
  dealValue: number;
  realtorName: string;
  realtorAgency: string;
  notes: ContactNote[];
}
