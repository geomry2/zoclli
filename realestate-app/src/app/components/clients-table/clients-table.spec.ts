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
    commissionType: 'percent',
    commissionValue: 0,
    notes: [],
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
    localStorage.clear();
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

  it('persists column visibility choices and keeps at least one client column visible', () => {
    const { table, injector: createdInjector } = createClientsTable([
      buildClient({ id: 'c1', name: 'Anna' }),
    ]);
    injector = createdInjector;

    expect(table.visibleClientColumns().map(column => column.key)).toEqual([
      'name',
      'phone',
      'propertyType',
      'status',
      'dealValue',
      'realtorName',
    ]);

    table.toggleSort('dealValue');
    table.toggleColumnVisibility('dealValue');

    expect(table.visibleClientColumns().map(column => column.key)).toEqual([
      'name',
      'phone',
      'propertyType',
      'status',
      'realtorName',
    ]);
    expect(table.sortState()).toEqual({ key: 'name', direction: 'asc' });
    expect(JSON.parse(localStorage.getItem('clients-table-visible-columns') ?? '[]')).toEqual([
      'name',
      'phone',
      'propertyType',
      'status',
      'realtorName',
    ]);

    table.toggleColumnVisibility('phone');
    table.toggleColumnVisibility('propertyType');
    table.toggleColumnVisibility('status');
    table.toggleColumnVisibility('realtorName');
    table.toggleColumnVisibility('name');

    expect(table.visibleClientColumns().map(column => column.key)).toEqual(['name']);

    table.resetColumnVisibility();

    expect(table.visibleClientColumns().map(column => column.key)).toEqual([
      'name',
      'phone',
      'propertyType',
      'status',
      'dealValue',
      'realtorName',
    ]);
  });

  it('builds mobile client cards from the remaining visible columns', () => {
    const client = buildClient({
      id: 'c1',
      name: 'Anna',
      phone: '+357 555 0101',
      dealValue: 420000,
      realtorName: 'Bella',
    });
    const { table, injector: createdInjector } = createClientsTable([client]);
    injector = createdInjector;

    expect(table.mobileClientColumns().map(column => column.key)).toEqual([
      'phone',
      'dealValue',
      'realtorName',
    ]);
    expect(table.formatClientColumnValue(client, 'dealValue')).toBe('€420,000');

    table.toggleColumnVisibility('phone');

    expect(table.mobileClientColumns().map(column => column.key)).toEqual([
      'dealValue',
      'realtorName',
    ]);
  });
});
