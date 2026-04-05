import { ClientStatus, PropertyType } from './client.model';

export type UnitStatus = ClientStatus;

export interface Unit {
  id: string;
  buildingName: string;
  apartmentNumber: string;
  propertyType: PropertyType;
  status: UnitStatus;
  purchaseDate: string;
  dealValue: number;
  realtorName: string;
  realtorAgency: string;
  notes: string;
}
