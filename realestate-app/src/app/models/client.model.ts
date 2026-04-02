export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land';
export type ClientStatus = 'active' | 'inactive' | 'closed';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  buildingName: string;
  apartmentNumber: string;
  street: string;
  propertyType: PropertyType;
  status: ClientStatus;
  purchaseDate: string;
  dealValue: number;
  realtorName: string;
  realtorAgency: string;
  notes: string;
}
