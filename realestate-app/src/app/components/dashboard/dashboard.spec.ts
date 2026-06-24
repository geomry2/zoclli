import { createEnvironmentInjector, runInInjectionContext, signal, type EnvironmentInjector } from '@angular/core';
import { Dashboard } from './dashboard';
import { ActivityService, type ActivityEntry } from '../../services/activity.service';
import { ClientService } from '../../services/client.service';
import { LeadService } from '../../services/lead.service';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { TranslationService } from '../../services/translation.service';
import type { Client } from '../../models/client.model';
import type { Lead } from '../../models/lead.model';
import type { Task } from '../../models/task.model';

function buildClient(overrides: Partial<Client>): Client {
  return {
    id: 'client-1',
    name: 'Client',
    phone: '',
    email: '',
    emailConfirmationStatus: 'not_sent',
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

function buildLead(overrides: Partial<Lead>): Lead {
  return {
    id: 'lead-1',
    name: 'Lead',
    phone: '',
    email: '',
    emailConfirmationStatus: 'not_sent',
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

function buildTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Task',
    shortTitle: '',
    description: '',
    status: 'todo',
    board: 'operations',
    priority: 'medium',
    topic: 'office',
    dueAt: '',
    assignee: '',
    createdBy: '',
    relatedEntityType: null,
    relatedEntityId: '',
    source: 'manual',
    tags: [],
    metadata: {},
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function createDashboard(options?: {
  clients?: Client[];
  leads?: Lead[];
  activities?: ActivityEntry[];
  tasks?: Task[];
  currentTaskName?: string;
}) {
  const clientService = { clients: signal(options?.clients ?? []) };
  const leadService = { leads: signal(options?.leads ?? []) };
  const activityService = { activities: signal(options?.activities ?? []) };
  const taskService = { tasks: signal(options?.tasks ?? []) };
  const authService = { currentTaskName: vi.fn(() => options?.currentTaskName ?? 'George') };
  const translationService = {
    lang: signal<'en' | 'ru'>('en'),
    t: vi.fn((key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        'time.justNow': 'just now',
        'time.minutesAgo': `${params?.['n']}m ago`,
        'time.hoursAgo': `${params?.['n']}h ago`,
      };
      return dict[key] ?? key;
    }),
  };

  const injector = createEnvironmentInjector([
    { provide: TranslationService, useValue: translationService },
    { provide: ClientService, useValue: clientService },
    { provide: LeadService, useValue: leadService },
    { provide: ActivityService, useValue: activityService },
    { provide: TaskService, useValue: taskService },
    { provide: AuthService, useValue: authService },
  ]);

  const dashboard = runInInjectionContext(injector, () => new Dashboard());

  return { dashboard, injector, clientService, leadService, activityService, taskService, authService };
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

    expect(dashboard.totalClients()).toBe(1);
    expect(dashboard.totalLeads()).toBe(2);
    expect(dashboard.totalRevenue()).toBe(100000);
    expect(dashboard.avgDeal()).toBe(100000);
    expect(dashboard.completedDeals()).toBe(1);
    expect(dashboard.completedDealsPercent()).toBe(100);
    expect(dashboard.overdueCount()).toBe(1);
    expect(dashboard.dueTodayCount()).toBe(1);
    expect(dashboard.activeClientsCount()).toBe(1);
    expect(dashboard.winRate()).toBe(50);

    clientService.clients.set([...clientService.clients(), buildClient({ id: 'c3', dealValue: 25000 })]);
    leadService.leads.set([...leadService.leads(), buildLead({ id: 'l3', status: 'new' })]);

    expect(dashboard.totalClients()).toBe(2);
    expect(dashboard.totalLeads()).toBe(3);
    expect(dashboard.totalRevenue()).toBe(125000);
    expect(dashboard.completedDeals()).toBe(2);
  });

  it('counts inactive records with deal data as completed deals', () => {
    const { dashboard, injector: createdInjector } = createDashboard({
      clients: [
        buildClient({ id: 'c1', status: 'inactive', dealValue: 120000 }),
        buildClient({ id: 'c2', status: 'inactive', purchaseDate: '2026-03-10', dealValue: 0 }),
        buildClient({ id: 'c3', status: 'inactive', dealValue: 0, purchaseDate: '' }),
        buildClient({ id: 'c4', status: 'closed', dealValue: 990000, purchaseDate: '2024-01-05' }),
      ],
    });
    injector = createdInjector;

    expect(dashboard.completedDeals()).toBe(2);
    expect(dashboard.completedDealsPercent()).toBe(67);
    expect(dashboard.totalClients()).toBe(3);
  });

  it('builds property mix and top realtor summaries in the expected order', () => {
    const { dashboard, injector: createdInjector } = createDashboard({
      clients: [
        buildClient({
          id: 'c1',
          propertyType: 'apartment',
          dealValue: 300000,
          realtorName: 'Alex',
          commissionType: 'percent',
          commissionValue: 5,
        }),
        buildClient({
          id: 'c2',
          propertyType: 'apartment',
          dealValue: 150000,
          realtorName: 'Bella',
          commissionType: 'fixed',
          commissionValue: 7000,
        }),
        buildClient({
          id: 'c3',
          propertyType: 'villa',
          dealValue: 500000,
          realtorName: 'Bella',
          commissionType: 'percent',
          commissionValue: 3,
        }),
      ],
      leads: [
        buildLead({ id: 'l1', status: 'new', realtorName: 'Chris' }),
        buildLead({ id: 'l2', status: 'negotiating', realtorName: 'Alex' }),
      ],
    });
    injector = createdInjector;

    expect(dashboard.propertyMix()).toEqual([
      { label: 'apartment', count: 2, color: '#3B82F6', pct: 67 },
      { label: 'villa', count: 1, color: '#8B5CF6', pct: 33 },
    ]);
    expect(dashboard.topRealtors()).toEqual([
      { name: 'Bella', deals: 2, earnings: 22000 },
      { name: 'Alex', deals: 1, earnings: 15000 },
      { name: 'Chris', deals: 0, earnings: 0 },
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

  it('shows only the five latest activity entries', () => {
    const activities = Array.from({ length: 7 }, (_, index) => ({
      id: `a${index}`,
      action: 'updated' as const,
      entityType: 'lead' as const,
      name: `Lead ${index}`,
      timestamp: `2026-04-05T11:0${index}:00.000Z`,
    }));

    const { dashboard, injector: createdInjector } = createDashboard({ activities });
    injector = createdInjector;

    expect(dashboard.recentActivity()).toHaveLength(5);
    expect(dashboard.recentActivity().map(entry => entry.id)).toEqual(['a0', 'a1', 'a2', 'a3', 'a4']);
  });

  it('shows open tasks assigned to the current user', () => {
    const { dashboard, injector: createdInjector } = createDashboard({
      currentTaskName: 'George',
      tasks: [
        buildTask({ id: 'mine', title: 'Mine', assignee: 'George', status: 'todo' }),
        buildTask({ id: 'done', title: 'Done', assignee: 'George', status: 'done' }),
        buildTask({ id: 'other', title: 'Other', assignee: 'Tanya', status: 'todo' }),
      ],
    });
    injector = createdInjector;

    expect(dashboard.myTasks().map(task => task.id)).toEqual(['mine']);
  });

  it('emits the requested follow-up filter when a dashboard shortcut is used', () => {
    const { dashboard, injector: createdInjector } = createDashboard();
    injector = createdInjector;

    const emitSpy = vi.spyOn(dashboard.followUpsRequest, 'emit');

    dashboard.openFollowUps('today');

    expect(emitSpy).toHaveBeenCalledWith('today');
  });
});
