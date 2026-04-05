import { createEnvironmentInjector, runInInjectionContext, signal, type EnvironmentInjector } from '@angular/core';
import { Dashboard } from './dashboard';
import { ActivityService, type ActivityEntry } from '../../services/activity.service';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { TranslationService } from '../../services/translation.service';
import type { Client } from '../../models/client.model';
import type { Lead } from '../../models/lead.model';

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
    notes: [],
    ...overrides,
  };
}

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

function createDashboard(options?: {
  clients?: Client[];
  leads?: Lead[];
  activities?: ActivityEntry[];
}) {
  const clientService = { clients: signal(options?.clients ?? []) };
  const leadService = { leads: signal(options?.leads ?? []) };
  const activityService = { activities: signal(options?.activities ?? []) };
  const translationService = { t: vi.fn((key: string) => key) };

  const injector = createEnvironmentInjector([
    { provide: TranslationService, useValue: translationService },
    { provide: ClientService, useValue: clientService },
    { provide: LeadService, useValue: leadService },
    { provide: ActivityService, useValue: activityService },
  ]);

  const dashboard = runInInjectionContext(injector, () => new Dashboard());

  return { dashboard, injector, clientService, leadService, activityService };
}

describe('Dashboard', () => {
  let injector: EnvironmentInjector | undefined;

  afterEach(() => {
    injector?.destroy();
    injector = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('computes totals, follow-up counters, and win rate from reactive service state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-05T12:00:00.000Z'));

    const { dashboard, injector: createdInjector, clientService, leadService } = createDashboard({
      clients: [
        buildClient({ id: 'c1', dealValue: 100000, status: 'active' }),
        buildClient({ id: 'c2', dealValue: 50000, status: 'closed', propertyType: 'villa' }),
      ],
      leads: [
        buildLead({ id: 'l1', status: 'lost', followUpDate: '2026-04-04T12:00:00.000Z' }),
        buildLead({ id: 'l2', status: 'contacted', followUpDate: '2026-04-05T18:00:00.000Z' }),
      ],
    });
    injector = createdInjector;

    expect(dashboard.totalClients()).toBe(2);
    expect(dashboard.totalLeads()).toBe(2);
    expect(dashboard.totalRevenue()).toBe(150000);
    expect(dashboard.avgDeal()).toBe(75000);
    expect(dashboard.overdueCount()).toBe(1);
    expect(dashboard.dueTodayCount()).toBe(1);
    expect(dashboard.activeClientsCount()).toBe(1);
    expect(dashboard.winRate()).toBe(67);

    clientService.clients.set([...clientService.clients(), buildClient({ id: 'c3', dealValue: 25000 })]);
    leadService.leads.set([...leadService.leads(), buildLead({ id: 'l3', status: 'new' })]);

    expect(dashboard.totalClients()).toBe(3);
    expect(dashboard.totalLeads()).toBe(3);
    expect(dashboard.totalRevenue()).toBe(175000);
  });

  it('builds property mix and top realtor summaries in the expected order', () => {
    const { dashboard, injector: createdInjector } = createDashboard({
      clients: [
        buildClient({ id: 'c1', propertyType: 'apartment', dealValue: 300000, realtorName: 'Alex' }),
        buildClient({ id: 'c2', propertyType: 'apartment', dealValue: 150000, realtorName: 'Bella' }),
        buildClient({ id: 'c3', propertyType: 'villa', dealValue: 500000, realtorName: 'Bella' }),
      ],
      leads: [
        buildLead({ id: 'l1', status: 'new', realtorName: 'Chris' }),
        buildLead({ id: 'l2', status: 'negotiating', realtorName: 'Alex' }),
      ],
    });
    injector = createdInjector;

    expect(dashboard.propertyMix()).toEqual([
      { label: 'apartment', count: 2, color: '#4a90d9', pct: 67 },
      { label: 'villa', count: 1, color: '#7c5cbf', pct: 33 },
    ]);
    expect(dashboard.topRealtors()).toEqual([
      { name: 'Bella', deals: 2, revenue: 650000 },
      { name: 'Alex', deals: 1, revenue: 300000 },
      { name: 'Chris', deals: 0, revenue: 0 },
    ]);
  });

  it('formats helper output for currency, activity labels, percentages, and relative time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-05T12:00:00.000Z'));

    const { dashboard, injector: createdInjector } = createDashboard({
      activities: [
        {
          id: 'a1',
          action: 'updated',
          entityType: 'lead',
          name: 'Lead One',
          timestamp: '2026-04-05T11:15:00.000Z',
        },
      ],
    });
    injector = createdInjector;

    expect(dashboard.recentActivity()).toHaveLength(1);
    expect(dashboard.formatCurrency(1200)).toBe('€1K');
    expect(dashboard.formatCurrency(2_500_000)).toBe('€2.5M');
    expect(dashboard.pct(2, 3)).toBe(67);
    expect(dashboard.activityIcon({ action: 'converted', entityType: 'lead' } as ActivityEntry)).toBe('→');
    expect(dashboard.activityKey({ action: 'updated', entityType: 'lead' } as ActivityEntry)).toBe('act.updatedLead');
    expect(dashboard.formatTime('2026-04-05T11:15:00.000Z')).toBe('45m ago');
    expect(dashboard.formatTime('2026-04-03T12:00:00.000Z')).toBe('3 Apr');
  });

  it('emits the requested follow-up filter when a dashboard shortcut is used', () => {
    const { dashboard, injector: createdInjector } = createDashboard();
    injector = createdInjector;

    const emitSpy = vi.spyOn(dashboard.followUpsRequest, 'emit');

    dashboard.openFollowUps('today');

    expect(emitSpy).toHaveBeenCalledWith('today');
  });
});
