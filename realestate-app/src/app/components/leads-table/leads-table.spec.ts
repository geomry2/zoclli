import { createEnvironmentInjector, runInInjectionContext, signal, type EnvironmentInjector } from '@angular/core';
import { LeadsTable } from './leads-table';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';
import type { Lead } from '../../models/lead.model';

function buildLead(overrides: Partial<Lead>): Lead {
  return {
    id: 'lead-1',
    name: 'Lead',
    phone: '',
    email: '',
    interestedIn: '',
    realtorName: '',
    realtorAgency: '',
    firstInteractionDate: '',
    status: 'new',
    budgetMin: 0,
    budgetMax: 0,
    followUpDate: '',
    notes: [],
    ...overrides,
  };
}

function createLeadsTable(leads: Lead[]) {
  const leadService = {
    leads: signal(leads),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const translationService = new TranslationService();

  const injector = createEnvironmentInjector([
    { provide: TranslationService, useValue: translationService },
    { provide: LeadService, useValue: leadService },
  ]);

  const table = runInInjectionContext(injector, () => new LeadsTable());

  return { table, injector, leadService, translationService };
}

describe('LeadsTable', () => {
  let injector: EnvironmentInjector | undefined;

  afterEach(() => {
    injector?.destroy();
    injector = undefined;
    localStorage.clear();
  });

  it('filters leads by status, realtor, follow-up date, and overlapping budget range', () => {
    const { table, injector: createdInjector } = createLeadsTable([
      buildLead({
        id: 'l1',
        name: 'Anna',
        status: 'contacted',
        realtorName: 'Bella',
        budgetMin: 100000,
        budgetMax: 220000,
        followUpDate: '2026-04-12',
      }),
      buildLead({
        id: 'l2',
        name: 'Boris',
        status: 'new',
        realtorName: 'Bella',
        budgetMin: 100000,
        budgetMax: 220000,
        followUpDate: '2026-04-12',
      }),
      buildLead({
        id: 'l3',
        name: 'Clara',
        status: 'contacted',
        realtorName: 'Alex',
        budgetMin: 100000,
        budgetMax: 220000,
        followUpDate: '2026-04-12',
      }),
      buildLead({
        id: 'l4',
        name: 'Dmitri',
        status: 'contacted',
        realtorName: 'Bella',
        budgetMin: 300000,
        budgetMax: 350000,
        followUpDate: '2026-04-12',
      }),
      buildLead({
        id: 'l5',
        name: 'Elena',
        status: 'contacted',
        realtorName: 'Bella',
        budgetMin: 100000,
        budgetMax: 220000,
        followUpDate: '2026-05-02',
      }),
    ]);
    injector = createdInjector;

    table.toggleStatus('contacted');
    table.toggleRealtor('Bella');
    table.setFollowUpDate('from', '2026-04-01');
    table.setFollowUpDate('to', '2026-04-30');
    table.setBudgetRange('min', '150000');
    table.setBudgetRange('max', '250000');

    expect(table.filteredLeads().map(lead => lead.id)).toEqual(['l1']);
    expect(table.hasActiveFilters()).toBe(true);
  });

  it('sorts leads by budget range and toggles the sort direction', () => {
    const { table, injector: createdInjector } = createLeadsTable([
      buildLead({ id: 'l1', name: 'Mila', budgetMin: 300000, budgetMax: 350000 }),
      buildLead({ id: 'l2', name: 'Anna', budgetMin: 100000, budgetMax: 120000 }),
      buildLead({ id: 'l3', name: 'Boris', budgetMin: 180000, budgetMax: 250000 }),
    ]);
    injector = createdInjector;

    table.toggleSort('budgetRange');
    expect(table.filteredLeads().map(lead => lead.id)).toEqual(['l2', 'l3', 'l1']);
    expect(table.ariaSort('budgetRange')).toBe('ascending');

    table.toggleSort('budgetRange');
    expect(table.filteredLeads().map(lead => lead.id)).toEqual(['l1', 'l3', 'l2']);
    expect(table.ariaSort('budgetRange')).toBe('descending');
  });

  it('loads stored lead columns and keeps sort on a visible column', () => {
    localStorage.setItem('leads-table-visible-columns', JSON.stringify(['name', 'status']));

    const { table, injector: createdInjector } = createLeadsTable([
      buildLead({ id: 'l1', name: 'Anna' }),
    ]);
    injector = createdInjector;

    expect(table.visibleLeadColumns().map(column => column.key)).toEqual(['name', 'status']);
    expect(table.sortState()).toEqual({ key: 'name', direction: 'asc' });

    table.toggleColumnVisibility('name');

    expect(table.visibleLeadColumns().map(column => column.key)).toEqual(['status']);
    expect(table.sortState()).toEqual({ key: 'status', direction: 'asc' });
    expect(JSON.parse(localStorage.getItem('leads-table-visible-columns') ?? '[]')).toEqual(['status']);

    table.resetColumnVisibility();

    expect(table.visibleLeadColumns().map(column => column.key)).toEqual([
      'name',
      'phone',
      'status',
      'budgetRange',
      'interestedIn',
      'followUpDate',
      'realtorName',
    ]);
  });
});
