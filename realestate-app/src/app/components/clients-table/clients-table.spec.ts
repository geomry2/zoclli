import { createEnvironmentInjector, runInInjectionContext, signal, type EnvironmentInjector } from '@angular/core';
import { ClientsTable } from './clients-table';
import { ClientService } from '../../services/client.service';
import { TranslationService } from '../../services/translation.service';
import type { Client } from '../../models/client.model';

function buildClient(overrides: Partial<Client>): Client {
  return {
    id: 'client-1',
    name: 'Client',
    phone: '',
    email: '',
    buildingName: '',
    apartmentNumber: '',
    propertyType: 'apartment',
    status: 'active',
    purchaseDate: '',
    dealValue: 0,
    realtorName: '',
    realtorAgency: '',
    notes: '',
    ...overrides,
  };
}

function createClientsTable(clients: Client[]) {
  const clientService = {
    clients: signal(clients),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const translationService = new TranslationService();

  const injector = createEnvironmentInjector([
    { provide: TranslationService, useValue: translationService },
    { provide: ClientService, useValue: clientService },
  ]);

  const table = runInInjectionContext(injector, () => new ClientsTable());

  return { table, injector, clientService, translationService };
}

describe('ClientsTable', () => {
  let injector: EnvironmentInjector | undefined;

  afterEach(() => {
    injector?.destroy();
    injector = undefined;
  });

  it('applies combined status, property type, realtor, date, and value filters', () => {
    const { table, injector: createdInjector } = createClientsTable([
      buildClient({
        id: 'c1',
        name: 'Anna',
        status: 'active',
        propertyType: 'villa',
        realtorName: 'Bella',
        purchaseDate: '2026-04-10',
        dealValue: 320000,
      }),
      buildClient({
        id: 'c2',
        name: 'Boris',
        status: 'inactive',
        propertyType: 'villa',
        realtorName: 'Bella',
        purchaseDate: '2026-04-12',
        dealValue: 320000,
      }),
      buildClient({
        id: 'c3',
        name: 'Clara',
        status: 'active',
        propertyType: 'house',
        realtorName: 'Bella',
        purchaseDate: '2026-04-12',
        dealValue: 320000,
      }),
      buildClient({
        id: 'c4',
        name: 'Dmitri',
        status: 'active',
        propertyType: 'villa',
        realtorName: 'Alex',
        purchaseDate: '2026-04-12',
        dealValue: 320000,
      }),
      buildClient({
        id: 'c5',
        name: 'Elena',
        status: 'active',
        propertyType: 'villa',
        realtorName: 'Bella',
        purchaseDate: '2026-05-01',
        dealValue: 450000,
      }),
    ]);
    injector = createdInjector;

    table.toggleStatus('active');
    table.togglePropertyType('villa');
    table.toggleRealtor('Bella');
    table.setPurchaseDate('from', '2026-04-01');
    table.setPurchaseDate('to', '2026-04-30');
    table.setDealValue('min', '300000');
    table.setDealValue('max', '350000');

    expect(table.filteredClients().map(client => client.id)).toEqual(['c1']);
    expect(table.hasActiveFilters()).toBe(true);

    table.clearFilters();

    expect(table.filteredClients().map(client => client.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(table.hasActiveFilters()).toBe(false);
  });

  it('sorts clients by deal value and toggles the sort direction', () => {
    const { table, injector: createdInjector } = createClientsTable([
      buildClient({ id: 'c1', name: 'Mila', dealValue: 500000 }),
      buildClient({ id: 'c2', name: 'Anna', dealValue: 150000 }),
      buildClient({ id: 'c3', name: 'Boris', dealValue: 300000 }),
    ]);
    injector = createdInjector;

    table.toggleSort('dealValue');
    expect(table.filteredClients().map(client => client.id)).toEqual(['c2', 'c3', 'c1']);
    expect(table.ariaSort('dealValue')).toBe('ascending');

    table.toggleSort('dealValue');
    expect(table.filteredClients().map(client => client.id)).toEqual(['c1', 'c3', 'c2']);
    expect(table.ariaSort('dealValue')).toBe('descending');
  });
});
